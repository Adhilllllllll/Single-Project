const Notification = require("../modules/notifications/Notification");

/**
 * Notification Socket Handler
 * Rules:
 *   - Admin: Critical notifications only (system errors, failures, escalations)
 *   - Advisor/Reviewer/Student: Review-related notifications
 *   - Online: Socket push | Offline: DB only
 *   - On reconnect: Auto-emit pending (unread) notifications
 */
const notificationSocketHandler = (io, socket, onlineUsers) => {
    const { userId, userRole, userName } = socket;

    /**
     * Send pending notifications on connection
     */
    const sendPendingNotifications = async () => {
        try {
            // Build query based on role
            let query = {
                recipient: userId,
                isRead: false,
                deliveryStatus: { $in: ["pending", "delivered"] }
            };

            // For admin, only fetch critical notifications
            if (userRole === "admin") {
                query.type = { $in: ["system", "warning", "admin_broadcast"] };
            }

            const pendingNotifications = await Notification.find(query)
                .sort({ createdAt: -1 })
                .limit(20);

            if (pendingNotifications.length > 0) {
                socket.emit("notification:pending", {
                    count: pendingNotifications.length,
                    notifications: pendingNotifications,
                });

                console.log(`🔔 Sent ${pendingNotifications.length} pending notifications to ${userName}`);
            }
        } catch (err) {
            console.error("Error fetching pending notifications:", err);
        }
    };

    // Send pending notifications on connection
    sendPendingNotifications();

    /**
     * Mark notification as read
     */
    socket.on("notification:markRead", async ({ notificationId }) => {
        try {
            if (!notificationId) return;

            const notification = await Notification.findOneAndUpdate(
                { _id: notificationId, recipient: userId },
                { isRead: true, readAt: new Date() },
                { new: true }
            );

            if (notification) {
                socket.emit("notification:read", { notificationId });
            }
        } catch (err) {
            console.error("notification:markRead error:", err);
        }
    });

    /**
     * Mark all notifications as read
     */
    socket.on("notification:markAllRead", async () => {
        try {
            await Notification.updateMany(
                { recipient: userId, isRead: false },
                { isRead: true, readAt: new Date() }
            );

            socket.emit("notification:allRead");
            console.log(`✅ All notifications marked read for ${userName}`);
        } catch (err) {
            console.error("notification:markAllRead error:", err);
        }
    });

    /**
     * Get unread count
     */
    socket.on("notification:getUnreadCount", async () => {
        try {
            let query = { recipient: userId, isRead: false };

            // For admin, count only critical notifications
            if (userRole === "admin") {
                query.type = { $in: ["system", "warning", "admin_broadcast"] };
            }

            const count = await Notification.countDocuments(query);
            socket.emit("notification:unreadCount", { count });
        } catch (err) {
            console.error("notification:getUnreadCount error:", err);
        }
    });
};

/**
 * Send a notification to a user (called from REST controllers)
 * @param {string} recipientId - User ID to send notification to
 * @param {object} notificationData - Notification payload
 * @param {boolean} saveToDb - Whether to save to database
 */
const sendNotification = async (recipientId, notificationData, saveToDb = true) => {
    try {
        let notification;

        // Save to database if needed
        if (saveToDb) {
            notification = await Notification.create({
                recipient: recipientId,
                ...notificationData,
                deliveryStatus: "pending",
            });
        }

        // Check if user is online
        const isOnline = global.onlineUsers?.has(recipientId) &&
            global.onlineUsers.get(recipientId).size > 0;

        if (isOnline && global.io) {
            // Emit to user's personal room
            global.io.to(`user:${recipientId}`).emit("notification:new", {
                ...notificationData,
                _id: notification?._id,
                createdAt: notification?.createdAt || new Date(),
            });

            // Update delivery status
            if (notification) {
                notification.deliveryStatus = "delivered";
                await notification.save();
            }

            console.log(`🔔 Notification sent to online user: ${recipientId}`);
        } else {
            console.log(`📬 Notification stored for offline user: ${recipientId}`);
        }

        return notification;
    } catch (err) {
        console.error("sendNotification error:", err);
        return null;
    }
};

/**
 * Broadcast notification to multiple users
 * @param {string[]} recipientIds - Array of user IDs
 * @param {object} notificationData - Notification payload
 */
const broadcastNotification = async (recipientIds, notificationData) => {
    const results = await Promise.allSettled(
        recipientIds.map((id) => sendNotification(id, notificationData))
    );
    return results;
};

/**
 * Send system notification to all admins
 */
const notifyAdmins = async (notificationData) => {
    const User = require("../modules/users/User");
    const admins = await User.find({ role: "admin" }).select("_id");
    const adminIds = admins.map((a) => a._id.toString());

    return broadcastNotification(adminIds, {
        ...notificationData,
        type: notificationData.type || "system",
    });
};

module.exports = notificationSocketHandler;
module.exports.sendNotification = sendNotification;
module.exports.broadcastNotification = broadcastNotification;
module.exports.notifyAdmins = notifyAdmins;
