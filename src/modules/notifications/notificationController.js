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
