const mongoose = require("mongoose");
const Notification = require("./Notification");

/* ======================================================
   GET USER NOTIFICATIONS
====================================================== */
exports.getNotifications = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);

        let notifications = await Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        // If no notifications exist, create sample notifications for demo
        if (notifications.length === 0) {
            const sampleNotifications = [
                {
                    recipient: userId,
                    type: "review_reminder",
                    title: "Review Reminder",
                    message: "Your review session with Dr. Smith is scheduled for tomorrow at 2:00 PM",
                    isRead: false,
                    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
                },
                {
                    recipient: userId,
                    type: "feedback_available",
                    title: "New Feedback Available",
                    message: "Dr. Smith has provided feedback on your project submission",
                    isRead: false,
                    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
                },
                {
                    recipient: userId,
                    type: "new_message",
                    title: "New Message",
                    message: "Prof. Anderson: Your review is scheduled for tomorrow",
                    isRead: true,
                    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
                },
                {
                    recipient: userId,
                    type: "task_deadline",
                    title: "Task Deadline Approaching",
                    message: "Submit Project Proposal is due in 2 days",
                    isRead: true,
                    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
                },
                {
                    recipient: userId,
                    type: "review_completed",
                    title: "Review Completed",
                    message: "Your review session has been completed. View feedback now.",
                    isRead: true,
                    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
                },
            ];

            await Notification.insertMany(sampleNotifications);
            notifications = await Notification.find({ recipient: userId })
                .sort({ createdAt: -1 })
                .lean();
        }

        // Format notifications
        const formatted = notifications.map(n => ({
            id: n._id,
            type: n.type,
            title: n.title,
            message: n.message,
            isRead: n.isRead,
            readAt: n.readAt,
            link: n.link,
            createdAt: n.createdAt,
        }));

        // Count unread
        const unreadCount = formatted.filter(n => !n.isRead).length;

        res.status(200).json({
            notifications: formatted,
            unreadCount,
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

        // Get recipients based on group
        let recipients = [];

        if (recipientGroup === "students") {
            const students = await Student.find({ status: "active" }).select("_id").lean();
            recipients = students.map(s => ({ id: s._id, model: "Student" }));
        } else if (recipientGroup === "reviewers") {
            const reviewers = await User.find({ role: "reviewer", status: "active" }).select("_id").lean();
            recipients = reviewers.map(u => ({ id: u._id, model: "User" }));
        } else if (recipientGroup === "advisors") {
            const advisors = await User.find({ role: "advisor", status: "active" }).select("_id").lean();
            recipients = advisors.map(u => ({ id: u._id, model: "User" }));
        } else if (recipientGroup === "all_users") {
            const users = await User.find({ status: "active", role: { $ne: "admin" } }).select("_id").lean();
            const students = await Student.find({ status: "active" }).select("_id").lean();
            recipients = [
                ...users.map(u => ({ id: u._id, model: "User" })),
                ...students.map(s => ({ id: s._id, model: "Student" })),
            ];
        }

        // Create notifications for all recipients
        const notifications = recipients.map(r => ({
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

        // Insert all notifications
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
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
====================================================== */
exports.getAdminSentNotifications = async (req, res) => {
    try {
        const adminId = new mongoose.Types.ObjectId(req.user.id);

        // Get broadcast reference notifications (one per broadcast)
        const notifications = await Notification.find({
            senderId: adminId,
            isBroadcast: true,
            recipient: { $exists: false }, // Only get the reference notification
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        // Format for frontend
        const formatted = notifications.map(n => ({
            id: n._id,
            title: n.title,
            message: n.message,
            recipientGroup: n.recipientGroup,
            dateSent: n.createdAt,
            status: n.deliveryStatus,
            recipientCount: n.metadata?.recipientCount || 0,
        }));

        res.status(200).json({
            notifications: formatted,
        });
    } catch (err) {
        console.error("GET ADMIN SENT NOTIFICATIONS ERROR:", err);
        res.status(500).json({ message: "Failed to fetch sent notifications" });
    }
};
