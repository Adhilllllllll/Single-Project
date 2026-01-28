/**
 * ============================================================================
 *    PUSH NOTIFICATION SERVICE
 *    Firebase Cloud Messaging Integration for Offline Users
 * ============================================================================
 *
 * RULES:
 *   - Socket.IO is the primary delivery method (online users)
 *   - FCM push is the FALLBACK for offline/background users
 *   - NEVER send both socket AND push to the same user
 *   - Auto-cleanup invalid tokens on FCM errors
 *
 * USAGE:
 *   const { sendPushToUser } = require("../services/pushNotification.service");
 *   await sendPushToUser(userId, { title, body, data });
 */

const { getMessaging, isFirebaseReady } = require("../config/firebase");
const User = require("../modules/users/User");
const Student = require("../modules/students/student");

/**
 * Build a standardized FCM notification payload
 * @param {string} type - Notification type (chat, review, system, etc.)
 * @param {object} data - Notification data
 * @returns {object} FCM-compatible payload
 */
const buildNotificationPayload = (type, data) => {
    const payloadMap = {
        chat: {
            title: `New message from ${data.senderName || "Someone"}`,
            body: data.messagePreview || "You have a new message",
            icon: "/notification-icon.png",
            data: {
                type: "CHAT",
                chatId: data.chatId || data.conversationId,
                url: `/chat/${data.chatId || data.conversationId}`,
            },
        },
        review_scheduled: {
            title: "Review Scheduled",
            body: data.message || `Your Week ${data.week} review has been scheduled`,
            data: {
                type: "REVIEW",
                reviewId: data.reviewId,
                url: `/reviews/${data.reviewId}`,
            },
        },
        review_reminder: {
            title: "Review Reminder",
            body: data.message || "You have an upcoming review",
            data: {
                type: "REVIEW",
                reviewId: data.reviewId,
                url: `/reviews/${data.reviewId}`,
            },
        },
        task_assigned: {
            title: "New Task Assigned",
            body: data.message || "You have been assigned a new task",
            data: {
                type: "TASK",
                taskId: data.taskId,
                url: `/tasks/${data.taskId}`,
            },
        },
        system: {
            title: data.title || "System Notification",
            body: data.message || data.body || "",
            data: {
                type: "SYSTEM",
                url: data.link || "/notifications",
            },
        },
        default: {
            title: data.title || "Notification",
            body: data.message || data.body || "",
            data: {
                type: data.type || "GENERAL",
                url: data.link || "/notifications",
            },
        },
    };

    return payloadMap[type] || payloadMap.default;
};

/**
 * Get user document from either User or Student collection
 * Now also fetches notification preferences for push guards
 * @param {string} userId - User ID
 * @returns {Promise<{user: object, model: string}|null>}
 */
const getUserWithTokens = async (userId) => {
    let user = await User.findById(userId).select("fcmTokens name notificationPreferences");
    if (user) {
        return { user, model: "User" };
    }

    user = await Student.findById(userId).select("fcmTokens name notificationPreferences");
    if (user) {
        return { user, model: "Student" };
    }

    return null;
};

/**
 * Clean up invalid FCM tokens for a user
 * Called when FCM returns token errors
 * @param {string} userId - User ID
 * @param {string} userModel - "User" or "Student"
 * @param {string[]} invalidTokens - Array of invalid token strings
 */
const cleanupInvalidTokens = async (userId, userModel, invalidTokens) => {
    if (!invalidTokens || invalidTokens.length === 0) return;

    const Model = userModel === "Student" ? Student : User;

    try {
        await Model.findByIdAndUpdate(userId, {
            $pull: {
                fcmTokens: { token: { $in: invalidTokens } },
            },
        });
        console.log(`🧹 Cleaned up ${invalidTokens.length} invalid FCM tokens for ${userModel}:${userId}`);
    } catch (error) {
        console.error("Token cleanup error:", error.message);
    }
};

/**
 * Send push notification to multiple tokens (multicast)
 * Handles FCM errors and auto-cleanup of invalid tokens
 * @param {string[]} tokens - Array of FCM tokens
 * @param {object} payload - Notification payload { title, body, data }
 * @param {string} userId - User ID for token cleanup
 * @param {string} userModel - "User" or "Student"
 * @returns {Promise<{success: number, failure: number}>}
 */
const sendMulticast = async (tokens, payload, userId, userModel) => {
    const messaging = getMessaging();

    if (!messaging) {
        console.warn("⚠️  FCM not configured, push notification skipped");
        return { success: 0, failure: 0 };
    }

    if (!tokens || tokens.length === 0) {
        return { success: 0, failure: 0 };
    }

    // Build FCM message
    const message = {
        tokens,
        notification: {
            title: payload.title,
            body: payload.body,
        },
        webpush: {
            notification: {
                icon: payload.icon || "/notification-icon.png",
                badge: "/badge-icon.png",
                vibrate: [200, 100, 200],
                requireInteraction: false,
            },
            fcmOptions: {
                link: payload.data?.url || "/",
            },
        },
        data: payload.data || {},
    };

    try {
        const response = await messaging.sendEachForMulticast(message);

        // Track invalid tokens for cleanup
        const invalidTokens = [];

        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const errorCode = resp.error?.code;
                // These error codes indicate the token is no longer valid
                if (
                    errorCode === "messaging/invalid-registration-token" ||
                    errorCode === "messaging/registration-token-not-registered"
                ) {
                    invalidTokens.push(tokens[idx]);
                }
            }
        });

        // Cleanup invalid tokens
        if (invalidTokens.length > 0) {
            await cleanupInvalidTokens(userId, userModel, invalidTokens);
        }

        console.log(
            `📤 FCM multicast: ${response.successCount} success, ${response.failureCount} failed`
        );

        return {
            success: response.successCount,
            failure: response.failureCount,
        };
    } catch (error) {
        console.error("FCM multicast error:", error.message);
        return { success: 0, failure: tokens.length };
    }
};

/**
 * Send push notification to a specific user (all their devices)
 * This is the main function to use for offline push fallback
 *
 * @param {string} userId - User ID to send push to
 * @param {object} notificationData - Notification data
 * @param {string} notificationData.type - Notification type
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.message - Notification body
 * @param {object} notificationData.metadata - Additional data
 * @returns {Promise<{success: boolean, sent: number}>}
 */
const sendPushToUser = async (userId, notificationData) => {
    // Check if Firebase is configured
    if (!isFirebaseReady()) {
        console.log("📵 Firebase not configured, skipping push notification");
        return { success: false, sent: 0 };
    }

    // Get user with their FCM tokens
    const userData = await getUserWithTokens(userId);

    if (!userData) {
        console.log(`📵 User ${userId} not found, skipping push`);
        return { success: false, sent: 0 };
    }

    const { user, model } = userData;

    // === PREFERENCE GUARDS ===
    // Check if user has push notifications disabled globally
    const preferences = user.notificationPreferences || { pushEnabled: true, mutedChats: [] };

    if (preferences.pushEnabled === false) {
        console.log(`🔕 Push disabled for user ${userId}, skipping`);
        return { success: false, sent: 0, reason: "push_disabled" };
    }

    // Check if this is a chat notification and the chat is muted
    const chatId = notificationData.conversationId || notificationData.chatId || notificationData.metadata?.conversationId;
    if (chatId && preferences.mutedChats?.length > 0) {
        const isMuted = preferences.mutedChats.some(
            (mutedId) => mutedId.toString() === chatId.toString()
        );
        if (isMuted) {
            console.log(`🔇 Chat ${chatId} is muted for user ${userId}, skipping push`);
            return { success: false, sent: 0, reason: "chat_muted" };
        }
    }

    // Check if user has any FCM tokens
    if (!user.fcmTokens || user.fcmTokens.length === 0) {
        console.log(`📵 User ${userId} has no FCM tokens, skipping push`);
        return { success: false, sent: 0 };
    }

    // Extract token strings
    const tokens = user.fcmTokens.map((t) => t.token);

    // Build notification payload based on type
    const type = notificationData.type || "default";
    const payload = buildNotificationPayload(type, {
        ...notificationData,
        ...notificationData.metadata,
    });

    // Send to all user's devices
    const result = await sendMulticast(tokens, payload, userId, model);

    if (result.success > 0) {
        console.log(`🔔 Push notification sent to ${user.name || userId} (${result.success} devices)`);
    }

    return {
        success: result.success > 0,
        sent: result.success,
    };
};

/**
 * Send push notification to multiple users
 * Useful for broadcast notifications
 * @param {string[]} userIds - Array of user IDs
 * @param {object} notificationData - Notification data
 * @returns {Promise<{total: number, success: number}>}
 */
const sendPushToMultipleUsers = async (userIds, notificationData) => {
    const results = await Promise.allSettled(
        userIds.map((userId) => sendPushToUser(userId, notificationData))
    );

    const successCount = results.filter(
        (r) => r.status === "fulfilled" && r.value.success
    ).length;

    return {
        total: userIds.length,
        success: successCount,
    };
};

module.exports = {
    sendPushToUser,
    sendPushToMultipleUsers,
    sendMulticast,
    buildNotificationPayload,
    cleanupInvalidTokens,
};
