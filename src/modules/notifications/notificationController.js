const mongoose = require("mongoose");
const Notification = require("./Notification");

/* ======================================================
   INTERNAL HELPER FUNCTIONS
====================================================== */

// Response helpers
const sendSuccess = (res, data, message = "Success", status = 200) => {
    res.status(status).json({ message, ...data });
};

const sendError = (res, message, status = 500) => {
    res.status(status).json({ message });
};

const handleError = (res, err, context, fallbackMsg = "Operation failed") => {
    console.error(`${context} ERROR:`, err);
    sendError(res, fallbackMsg, 500);
};

// ObjectId helper
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// Notification formatter - standardize notification objects
const formatNotification = (n) => ({
    id: n._id,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    readAt: n.readAt,
    link: n.link,
    createdAt: n.createdAt,
});

// Constants
const NOTIFICATION_LIMIT = 50;
const MS_PER_HOUR = 60 * 60 * 1000;


/* ======================================================
   GET USER NOTIFICATIONS
   
   REFACTORED: MongoDB-First Optimization
   - REMOVED: Demo notification creation
   - REMOVED: JS map() for formatting → $project in aggregation
   - ADDED: Pagination support (page, limit)
   - ADDED: Type and isRead filters
   - REPLACED: JS filter for unreadCount → countDocuments
====================================================== */
exports.getNotifications = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);

        // === PAGINATION PARAMS ===
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        // === FILTER PARAMS ===
        const { type, isRead } = req.query;

        // Build match query
        const matchQuery = { recipient: userId };
        if (type) matchQuery.type = type;
        if (isRead === "true") matchQuery.isRead = true;
        if (isRead === "false") matchQuery.isRead = false;

        // === SINGLE AGGREGATION - REPLACES find() + map() ===
        // Previously: notifications.map(n => ({ id: n._id, ... }))
        // Now: $project at DB level
        const notifications = await Notification.aggregate([
            { $match: matchQuery },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    id: "$_id",
                    type: 1,
                    title: 1,
                    message: 1,
                    isRead: 1,
                    readAt: 1,
                    link: 1,
                    entityType: 1,
                    entityId: 1,
                    priority: 1,
                    createdAt: 1,
                    _id: 0,
                },
            },
        ]);

        // === GET UNREAD COUNT (Index-backed) ===
        const unreadCount = await Notification.countDocuments({
            recipient: userId,
            isRead: false,
        });

        // === GET TOTAL FOR PAGINATION ===
        const total = await Notification.countDocuments(matchQuery);

        res.status(200).json({
            notifications,
            unreadCount,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("GET NOTIFICATIONS ERROR:", err);
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
};

/* ======================================================
   MARK NOTIFICATION AS READ
====================================================== */
exports.markAsRead = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const { notificationId } = req.params;

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: userId },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({
            message: "Marked as read",
            notification: {
                id: notification._id,
                isRead: notification.isRead,
            },
        });
    } catch (err) {
        console.error("MARK AS READ ERROR:", err);
        res.status(500).json({ message: "Failed to mark as read" });
    }
};

/* ======================================================
   MARK ALL NOTIFICATIONS AS READ
====================================================== */
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);

        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.status(200).json({ message: "All notifications marked as read" });
    } catch (err) {
        console.error("MARK ALL AS READ ERROR:", err);
        res.status(500).json({ message: "Failed to mark all as read" });
    }
};

/* ======================================================
   DELETE NOTIFICATION
====================================================== */
exports.deleteNotification = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const { notificationId } = req.params;

        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            recipient: userId,
        });

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ message: "Notification deleted" });
    } catch (err) {
        console.error("DELETE NOTIFICATION ERROR:", err);
        res.status(500).json({ message: "Failed to delete notification" });
    }
};

/* ======================================================
   GET UNREAD COUNT
====================================================== */
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);

        const count = await Notification.countDocuments({
            recipient: userId,
            isRead: false,
        });

        res.status(200).json({ unreadCount: count });
    } catch (err) {
        console.error("GET UNREAD COUNT ERROR:", err);
        res.status(500).json({ message: "Failed to get unread count" });
    }
};

/* ======================================================
   CREATE NOTIFICATION (Internal helper - can be imported)
====================================================== */
exports.createNotification = async (data) => {
    try {
        const notification = new Notification(data);
        await notification.save();
        return notification;
    } catch (err) {
        console.error("CREATE NOTIFICATION ERROR:", err);
        throw err;
    }
};

/* ======================================================
   ADMIN → SEND BROADCAST NOTIFICATION
   
   REFACTORED: MongoDB-First
   - REPLACED: JS map() for recipient transformation → aggregation $project
   - REPLACED: JS map() for notification building → bulkWrite with loop
====================================================== */
const User = require("../users/User");
const Student = require("../students/student");

exports.sendAdminNotification = async (req, res) => {
    try {
        const adminId = new mongoose.Types.ObjectId(req.user.id);
        const { title, message, recipientGroup } = req.body;

        // Validate required fields
        if (!title || !message || !recipientGroup) {
            return res.status(400).json({
                message: "Title, message, and recipient group are required",
            });
        }

        // Validate recipient group
        const validGroups = ["students", "reviewers", "advisors", "all_users"];
        if (!validGroups.includes(recipientGroup)) {
            return res.status(400).json({
                message: "Invalid recipient group. Must be: students, reviewers, advisors, or all_users",
            });
        }

        // === GET RECIPIENTS USING AGGREGATION ===
        // Replaces: find().lean() + map() transformation
        let recipients = [];

        if (recipientGroup === "students") {
            // Single aggregation with $project
            recipients = await Student.aggregate([
                { $match: { status: "active" } },
                { $project: { id: "$_id", model: { $literal: "Student" }, _id: 0 } },
            ]);
        } else if (recipientGroup === "reviewers") {
            recipients = await User.aggregate([
                { $match: { role: "reviewer", status: "active" } },
                { $project: { id: "$_id", model: { $literal: "User" }, _id: 0 } },
            ]);
        } else if (recipientGroup === "advisors") {
            recipients = await User.aggregate([
                { $match: { role: "advisor", status: "active" } },
                { $project: { id: "$_id", model: { $literal: "User" }, _id: 0 } },
            ]);
        } else if (recipientGroup === "all_users") {
            // Use $unionWith to combine users and students in single pipeline
            recipients = await User.aggregate([
                { $match: { status: "active", role: { $ne: "admin" } } },
                { $project: { id: "$_id", model: { $literal: "User" }, _id: 0 } },
                {
                    $unionWith: {
                        coll: "students",
                        pipeline: [
                            { $match: { status: "active" } },
                            { $project: { id: "$_id", model: { $literal: "Student" }, _id: 0 } },
                        ],
                    },
                },
            ]);
        }

        // === BUILD NOTIFICATIONS FOR BULK INSERT ===
        // Using bulkWrite for efficiency (still requires array building, but optimized insert)
        const bulkOps = recipients.map(r => ({
            insertOne: {
                document: {
                    recipient: r.id,
                    recipientModel: r.model,
                    senderId: adminId,
                    senderModel: "User",
                    isBroadcast: true,
                    recipientGroup,
                    type: "admin_broadcast",
                    title,
                    message,
                    isRead: false,
                    deliveryStatus: "delivered",
                },
            },
        }));

        // Store a reference notification for admin tracking
        const broadcastRef = new Notification({
            senderId: adminId,
            senderModel: "User",
            isBroadcast: true,
            recipientGroup,
            type: "admin_broadcast",
            title,
            message,
            deliveryStatus: "delivered",
            metadata: {
                recipientCount: recipients.length,
            },
        });

        // Bulk insert all notifications
        if (bulkOps.length > 0) {
            await Notification.bulkWrite(bulkOps);
        }
        await broadcastRef.save();

        res.status(201).json({
            message: "Notification sent successfully",
            recipientCount: recipients.length,
            notification: {
                id: broadcastRef._id,
                title,
                message,
                recipientGroup,
                sentAt: broadcastRef.createdAt,
            },
        });
    } catch (err) {
        console.error("SEND ADMIN NOTIFICATION ERROR:", err);
        res.status(500).json({ message: "Failed to send notification" });
    }
};

/* ======================================================
   ADMIN → GET SENT NOTIFICATIONS
   
   REFACTORED: MongoDB-First
   - REPLACED: JS map() for formatting → aggregation $project
====================================================== */
exports.getAdminSentNotifications = async (req, res) => {
    try {
        const adminId = new mongoose.Types.ObjectId(req.user.id);

        // === SINGLE AGGREGATION - REPLACES find() + map() ===
        // Previously: notifications.map(n => ({ id: n._id, ... }))
        // Now: $project at DB level
        const notifications = await Notification.aggregate([
            {
                $match: {
                    senderId: adminId,
                    isBroadcast: true,
                    recipient: { $exists: false }, // Only reference notifications
                },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 50 },
            {
                $project: {
                    id: "$_id",
                    title: 1,
                    message: 1,
                    recipientGroup: 1,
                    dateSent: "$createdAt",
                    status: "$deliveryStatus",
                    recipientCount: { $ifNull: ["$metadata.recipientCount", 0] },
                    _id: 0,
                },
            },
        ]);

        res.status(200).json({
            notifications,
        });
    } catch (err) {
        console.error("GET ADMIN SENT NOTIFICATIONS ERROR:", err);
        res.status(500).json({ message: "Failed to fetch sent notifications" });
    }
};

/* ======================================================
   ADMIN → CLEANUP OLD READ NOTIFICATIONS
   DELETE /api/notifications/admin/cleanup
   
   PRODUCTION HARDENING:
   - Deletes only read notifications older than 30 days
   - Never touches unread notifications
   - Safe to run as cron job or manual trigger
====================================================== */
exports.cleanupOldNotifications = async (req, res) => {
    try {
        // Only admin can trigger cleanup
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
        }

        // Default: 30 days, configurable via query param
        const daysOld = Math.max(7, parseInt(req.query.daysOld) || 30);
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

        // === SAFE DELETION ===
        // Only delete: isRead=true AND readAt < cutoffDate
        // This ensures unread notifications are NEVER deleted
        const result = await Notification.deleteMany({
            isRead: true,
            readAt: { $lt: cutoffDate },
        });

        console.log(`[Cleanup] Deleted ${result.deletedCount} old read notifications (> ${daysOld} days)`);

        res.status(200).json({
            message: "Cleanup completed",
            deletedCount: result.deletedCount,
            criteria: {
                daysOld,
                cutoffDate,
            },
        });
    } catch (err) {
        console.error("CLEANUP NOTIFICATIONS ERROR:", err);
        res.status(500).json({ message: "Failed to cleanup notifications" });
    }
};

/* ======================================================
   FCM TOKEN REGISTRATION
   POST /api/notifications/register-token
   
   Registers a Firebase Cloud Messaging token for push notifications.
   - Prevents duplicate tokens
   - Updates lastUsedAt for existing tokens
   - Supports multiple devices per user
====================================================== */
exports.registerFcmToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const userModel = req.user.role === "student" ? "Student" : "User";
        const { token, platform = "web" } = req.body;

        // Validate token
        if (!token || typeof token !== "string" || token.length < 20) {
            return res.status(400).json({
                message: "Valid FCM token is required",
            });
        }

        // Get the correct model
        const Model = userModel === "Student" ? Student : User;

        // Check if token already exists for this user
        const user = await Model.findById(userId).select("fcmTokens");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const existingTokenIndex = user.fcmTokens?.findIndex(
            (t) => t.token === token
        );

        if (existingTokenIndex !== -1) {
            // Token exists - update lastUsedAt
            await Model.findOneAndUpdate(
                { _id: userId, "fcmTokens.token": token },
                {
                    $set: {
                        "fcmTokens.$.lastUsedAt": new Date(),
                        "fcmTokens.$.userAgent": req.headers["user-agent"] || null,
                    }
                }
            );

            return res.status(200).json({
                message: "Token already registered, updated lastUsedAt",
                isNew: false,
            });
        }

        // Check if this token exists for another user (should be rare)
        // If so, remove it from the other user first
        await Model.updateMany(
            { "fcmTokens.token": token, _id: { $ne: userId } },
            { $pull: { fcmTokens: { token } } }
        );

        // Also check the other model
        const OtherModel = userModel === "Student" ? User : Student;
        await OtherModel.updateMany(
            { "fcmTokens.token": token },
            { $pull: { fcmTokens: { token } } }
        );

        // Add new token
        await Model.findByIdAndUpdate(userId, {
            $push: {
                fcmTokens: {
                    token,
                    platform,
                    lastUsedAt: new Date(),
                    userAgent: req.headers["user-agent"] || null,
                },
            },
        });

        console.log(`🔔 FCM token registered for ${userModel}:${userId} (${platform})`);

        res.status(201).json({
            message: "FCM token registered successfully",
            isNew: true,
            platform,
        });
    } catch (err) {
        console.error("REGISTER FCM TOKEN ERROR:", err);
        res.status(500).json({ message: "Failed to register FCM token" });
    }
};

/* ======================================================
   FCM TOKEN REMOVAL
   DELETE /api/notifications/remove-token
   
   Removes a Firebase Cloud Messaging token (e.g., on logout).
   - Removes from current user only
   - Safe to call even if token doesn't exist
====================================================== */
exports.removeFcmToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const userModel = req.user.role === "student" ? "Student" : "User";
        const { token } = req.body;

        // Validate token
        if (!token) {
            return res.status(400).json({
                message: "FCM token is required",
            });
        }

        // Get the correct model
        const Model = userModel === "Student" ? Student : User;

        // Remove the token
        const result = await Model.findByIdAndUpdate(
            userId,
            { $pull: { fcmTokens: { token } } },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log(`🔕 FCM token removed for ${userModel}:${userId}`);

        res.status(200).json({
            message: "FCM token removed successfully",
        });
    } catch (err) {
        console.error("REMOVE FCM TOKEN ERROR:", err);
        res.status(500).json({ message: "Failed to remove FCM token" });
    }
};

/* ======================================================
   GET NOTIFICATION PREFERENCES
   GET /api/notifications/preferences
====================================================== */
exports.getNotificationPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const userModel = req.user.role === "student" ? "Student" : "User";
        const Model = userModel === "Student" ? Student : User;

        const user = await Model.findById(userId)
            .select("notificationPreferences")
            .lean();

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Return defaults if preferences don't exist yet
        const preferences = user.notificationPreferences || {
            pushEnabled: true,
            mutedChats: [],
        };

        res.status(200).json({
            preferences,
        });
    } catch (err) {
        console.error("GET PREFERENCES ERROR:", err);
        res.status(500).json({ message: "Failed to get preferences" });
    }
};

/* ======================================================
   UPDATE NOTIFICATION PREFERENCES
   PATCH /api/notifications/preferences
   
   Body: { pushEnabled: boolean }
====================================================== */
exports.updateNotificationPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const userModel = req.user.role === "student" ? "Student" : "User";
        const { pushEnabled } = req.body;

        // Validate input
        if (typeof pushEnabled !== "boolean") {
            return res.status(400).json({
                message: "pushEnabled must be a boolean",
            });
        }

        const Model = userModel === "Student" ? Student : User;

        const user = await Model.findByIdAndUpdate(
            userId,
            { $set: { "notificationPreferences.pushEnabled": pushEnabled } },
            { new: true }
        ).select("notificationPreferences");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log(`🔔 Push ${pushEnabled ? "enabled" : "disabled"} for ${userModel}:${userId}`);

        res.status(200).json({
            message: `Push notifications ${pushEnabled ? "enabled" : "disabled"}`,
            preferences: user.notificationPreferences,
        });
    } catch (err) {
        console.error("UPDATE PREFERENCES ERROR:", err);
        res.status(500).json({ message: "Failed to update preferences" });
    }
};

/* ======================================================
   MUTE CHAT
   PATCH /api/notifications/mute-chat/:chatId
   
   Mutes push notifications for a specific conversation.
   Socket notifications still work.
====================================================== */
const Conversation = require("../chat/Conversation");

exports.muteChat = async (req, res) => {
    try {
        const userId = req.user.id;
        const userModel = req.user.role === "student" ? "Student" : "User";
        const { chatId } = req.params;

        // Validate chatId
        if (!mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ message: "Invalid chat ID" });
        }

        // Verify user is participant in this conversation
        const conversation = await Conversation.findById(chatId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        const isParticipant = conversation.participants.some(
            (p) => p.toString() === userId
        );
        if (!isParticipant) {
            return res.status(403).json({
                message: "You are not a participant in this conversation",
            });
        }

        const Model = userModel === "Student" ? Student : User;

        // Add to mutedChats if not already muted
        const user = await Model.findByIdAndUpdate(
            userId,
            { $addToSet: { "notificationPreferences.mutedChats": chatId } },
            { new: true }
        ).select("notificationPreferences");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log(`🔇 Chat ${chatId} muted for ${userModel}:${userId}`);

        res.status(200).json({
            message: "Chat muted successfully",
            mutedChats: user.notificationPreferences?.mutedChats || [],
        });
    } catch (err) {
        console.error("MUTE CHAT ERROR:", err);
        res.status(500).json({ message: "Failed to mute chat" });
    }
};

/* ======================================================
   UNMUTE CHAT
   PATCH /api/notifications/unmute-chat/:chatId
   
   Unmutes push notifications for a specific conversation.
====================================================== */
exports.unmuteChat = async (req, res) => {
    try {
        const userId = req.user.id;
        const userModel = req.user.role === "student" ? "Student" : "User";
        const { chatId } = req.params;

        // Validate chatId
        if (!mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ message: "Invalid chat ID" });
        }

        const Model = userModel === "Student" ? Student : User;

        // Remove from mutedChats
        const user = await Model.findByIdAndUpdate(
            userId,
            { $pull: { "notificationPreferences.mutedChats": chatId } },
            { new: true }
        ).select("notificationPreferences");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log(`🔊 Chat ${chatId} unmuted for ${userModel}:${userId}`);

        res.status(200).json({
            message: "Chat unmuted successfully",
            mutedChats: user.notificationPreferences?.mutedChats || [],
        });
    } catch (err) {
        console.error("UNMUTE CHAT ERROR:", err);
        res.status(500).json({ message: "Failed to unmute chat" });
    }
};

/* ======================================================
   TEST PUSH NOTIFICATION
   POST /api/notifications/test-push
   
   Admin-only endpoint to manually test FCM push delivery.
   Useful for verifying Firebase configuration.
====================================================== */
const { sendPushToUser } = require("../../services/pushNotification.service");
const { isFirebaseReady } = require("../../config/firebase");

exports.testPushNotification = async (req, res) => {
    try {
        // === PRODUCTION GUARD ===
        // Prevent accidental usage in production
        if (process.env.NODE_ENV === "production") {
            return res.status(403).json({
                success: false,
                error: "Test push endpoint disabled in production",
            });
        }

        // Check Firebase status
        if (!isFirebaseReady()) {
            return res.status(503).json({
                success: false,
                error: "Firebase not configured",
                hint: "Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to .env",
            });
        }

        const { userId, title, message } = req.body;

        // Validate input
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "userId is required",
            });
        }

        // Send test push notification
        const result = await sendPushToUser(userId, {
            type: "system",
            title: title || "Test Push Notification",
            message: message || "This is a test from EduNexus!",
            metadata: {
                testId: Date.now(),
            },
        });

        if (result.success) {
            console.log(`🔔 Test push sent to ${result.sent} device(s) [web]`);
            res.status(200).json({
                success: true,
                sentTo: result.sent,
                platform: "web",
                message: "Push sent successfully",
            });
        } else {
            res.status(200).json({
                success: false,
                sentTo: 0,
                message: "Push not sent",
                reason: result.reason || "User has no FCM tokens or is online",
                hint: "Make sure the user has registered a push token and is offline",
            });
        }
    } catch (err) {
        console.error("TEST PUSH ERROR:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};
