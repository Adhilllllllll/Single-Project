/**
 * ========================================================================
 *    NOTIFICATION SERVICE
 *    Fire-and-forget notification creation for review lifecycle events
 * ========================================================================
 * 
 * This service:
 *   - Creates in-app notifications for review events
 *   - Is called from review.service.js after successful DB operations
 *   - Never blocks the main transaction flow
 *   - Swallows and logs all errors
 * 
 * Design principles:
 *   - Fire-and-forget: Notifications fail silently
 *   - Non-blocking: Uses async without await where safe
 *   - Decoupled: No req/res, only plain data
 *   - Idempotent-friendly: Metadata allows duplicate detection
 * 
 * ========================================================================
 */

const Notification = require("./Notification");

// === DEDUPLICATION CONFIG ===
// Time window (ms) within which duplicate notifications are suppressed
const DEDUP_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * === SINGLE SOURCE OF TRUTH FOR DEDUP ===
 * 
 * Upsert a notification with time-window deduplication.
 * This helper is called by BOTH:
 *   - createNotification() in this file
 *   - sendNotification() in notification.socket.js
 * 
 * Dedup rule:
 *   - If same recipient + entityType + entityId + type exists within 60s → skip
 *   - Otherwise → insert new notification
 * 
 * @param {Object} data - Full notification data including recipient
 * @returns {Promise<Object|null>} The notification document (new or existing)
 */
async function upsertNotificationWithDedup(data) {
    // If entityType + entityId exist, use upsert for deduplication
    if (data.entityType && data.entityId) {
        const dedupWindowStart = new Date(Date.now() - DEDUP_WINDOW_MS);

        // Atomic upsert: only inserts if no matching notification within window
        return await Notification.findOneAndUpdate(
            {
                recipient: data.recipient,
                entityType: data.entityType,
                entityId: data.entityId,
                type: data.type,
                createdAt: { $gte: dedupWindowStart },
            },
            {
                $setOnInsert: {
                    ...data,
                    createdAt: new Date(),
                },
            },
            {
                upsert: true,
                new: true,
            }
        );
    } else {
        // No dedup for system/broadcast notifications
        return await Notification.create({
            ...data,
            createdAt: new Date(),
        });
    }
}

/**
 * Create a notification with deduplication (fire-and-forget)
 * Wraps upsertNotificationWithDedup with error handling
 * 
 * @param {Object} data - Notification data
 * @returns {Promise<void>}
 */
async function createNotification(data) {
    try {
        await upsertNotificationWithDedup(data);
    } catch (err) {
        // Log but never throw - notifications must not break main flow
        console.error(`[NotificationService] Failed to create notification:`, err.message);
    }
}


/* ======================================================
   REVIEW CREATED NOTIFICATION
====================================================== */

/**
 * Notify reviewer and student when a review is scheduled
 * Called after successful review creation
 * 
 * @param {Object} params
 * @param {string} params.reviewId - Review ID
 * @param {string} params.reviewerId - Reviewer to notify
 * @param {string} params.studentId - Student to notify
 * @param {string} params.studentName - Student name for message
 * @param {number} params.week - Week number
 * @param {Date} params.scheduledAt - Scheduled date/time
 */
function notifyReviewCreated({ reviewId, reviewerId, studentId, studentName, week, scheduledAt }) {
    const dateStr = new Date(scheduledAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    // Notify reviewer (fire-and-forget)
    createNotification({
        recipient: reviewerId,
        recipientModel: "User",
        senderModel: "System",
        type: "review_scheduled",
        title: "New Review Assigned",
        message: `You have been assigned to review ${studentName} (Week ${week}) on ${dateStr}`,
        metadata: { reviewId },
        link: `/reviews/reviewer/${reviewId}`,
    });

    // Notify student (fire-and-forget)
    createNotification({
        recipient: studentId,
        recipientModel: "Student",
        senderModel: "System",
        type: "review_scheduled",
        title: "Review Scheduled",
        message: `Your Week ${week} review has been scheduled for ${dateStr}`,
        metadata: { reviewId },
        link: `/reviews/student/${reviewId}`,
    });
}

/* ======================================================
   REVIEW RESCHEDULED NOTIFICATION
====================================================== */

/**
 * Notify reviewer and student when a review is rescheduled
 * Called after successful reschedule operation
 * 
 * @param {Object} params
 * @param {string} params.reviewId - Review ID
 * @param {string} params.reviewerId - Reviewer to notify
 * @param {string} params.studentId - Student to notify
 * @param {Date} params.newScheduledAt - New scheduled date/time
 * @param {number} params.week - Week number
 */
function notifyReviewRescheduled({ reviewId, reviewerId, studentId, newScheduledAt, week }) {
    const dateStr = new Date(newScheduledAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    // Notify reviewer
    createNotification({
        recipient: reviewerId,
        recipientModel: "User",
        senderModel: "System",
        type: "review_rescheduled",
        title: "Review Rescheduled",
        message: `Week ${week} review has been rescheduled to ${dateStr}`,
        metadata: { reviewId },
        link: `/reviews/reviewer/${reviewId}`,
    });

    // Notify student
    createNotification({
        recipient: studentId,
        recipientModel: "Student",
        senderModel: "System",
        type: "review_rescheduled",
        title: "Review Rescheduled",
        message: `Your Week ${week} review has been rescheduled to ${dateStr}`,
        metadata: { reviewId },
        link: `/reviews/student/${reviewId}`,
    });
}

/* ======================================================
   REVIEW CANCELLED NOTIFICATION
====================================================== */

/**
 * Notify reviewer and student when a review is cancelled
 * Called after successful cancel operation
 * 
 * @param {Object} params
 * @param {string} params.reviewId - Review ID
 * @param {string} params.reviewerId - Reviewer to notify
 * @param {string} params.studentId - Student to notify
 * @param {string} params.reason - Cancellation reason
 * @param {number} params.week - Week number
 */
function notifyReviewCancelled({ reviewId, reviewerId, studentId, reason, week }) {
    // Notify reviewer
    createNotification({
        recipient: reviewerId,
        recipientModel: "User",
        senderModel: "System",
        type: "review_cancelled",
        title: "Review Cancelled",
        message: `Week ${week} review has been cancelled. Reason: ${reason}`,
        metadata: { reviewId },
    });

    // Notify student
    createNotification({
        recipient: studentId,
        recipientModel: "Student",
        senderModel: "System",
        type: "review_cancelled",
        title: "Review Cancelled",
        message: `Your Week ${week} review has been cancelled. Reason: ${reason}`,
        metadata: { reviewId },
    });
}

/* ======================================================
   CHAT NOTIFICATION EVENTS
   Priority 1: Highest frequency, most visible UX impact
====================================================== */

/**
 * Notify recipient when a new chat message arrives
 * Called from chat message send flow
 * 
 * FIXED: Now uses sendNotification() which:
 *   - Saves to DB (persistent for offline users)
 *   - Emits via socket (real-time for online users)
 * 
 * @param {Object} params
 * @param {string} params.recipientId - User to notify
 * @param {string} params.recipientModel - "User" or "Student"
 * @param {string} params.conversationId - Conversation ID
 * @param {string} params.senderName - Sender's name
 * @param {string} params.messagePreview - First chars of message
 */
async function notifyChatMessage({ recipientId, recipientModel, conversationId, senderName, messagePreview }) {
    try {
        // Import sendNotification which handles both DB + socket
        const { sendNotification } = require("../../socket/notification.socket");

        await sendNotification(recipientId, {
            recipientModel: recipientModel || "User",
            senderModel: "System",
            type: "new_message",
            title: `Message from ${senderName}`,
            message: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? "..." : ""),
            entityType: "chat",
            entityId: conversationId,
            link: `/chat/${conversationId}`,
        });
    } catch (err) {
        // Fire-and-forget: log but don't throw
        console.error(`[NotificationService] Chat notification failed:`, err.message);
    }
}

/**
 * Notify advisor when student requests chat with reviewer
 * 
 * @param {Object} params
 * @param {string} params.advisorId - Advisor to notify
 * @param {string} params.studentName - Student's name
 * @param {string} params.reviewerName - Reviewer's name
 * @param {string} params.requestId - Chat request ID
 */
function notifyChatRequestCreated({ advisorId, studentName, reviewerName, requestId }) {
    createNotification({
        recipient: advisorId,
        recipientModel: "User",
        senderModel: "System",
        type: "info",
        title: "Chat Request Pending",
        message: `${studentName} is requesting to chat with ${reviewerName}. Please review and approve.`,
        entityType: "chat",
        entityId: requestId,
        priority: "high",
        link: `/chat/requests`,
    });
}

/**
 * Notify student and reviewer when chat request is approved
 * 
 * @param {Object} params
 * @param {string} params.studentId - Student to notify
 * @param {string} params.reviewerId - Reviewer to notify
 * @param {string} params.studentName - Student's name
 * @param {string} params.reviewerName - Reviewer's name
 * @param {string} params.requestId - Chat request ID
 */
function notifyChatRequestApproved({ studentId, reviewerId, studentName, reviewerName, requestId }) {
    // Notify student
    createNotification({
        recipient: studentId,
        recipientModel: "Student",
        senderModel: "System",
        type: "success",
        title: "Chat Approved",
        message: `Your request to chat with ${reviewerName} has been approved. You can now start a conversation.`,
        entityType: "chat",
        entityId: requestId,
        link: `/chat`,
    });

    // Notify reviewer
    createNotification({
        recipient: reviewerId,
        recipientModel: "User",
        senderModel: "System",
        type: "info",
        title: "New Chat Available",
        message: `You can now chat with ${studentName}. Their advisor has approved the chat request.`,
        entityType: "chat",
        entityId: requestId,
        link: `/chat`,
    });
}

/**
 * Notify student when chat request is rejected
 * 
 * @param {Object} params
 * @param {string} params.studentId - Student to notify
 * @param {string} params.reviewerName - Reviewer's name
 * @param {string} params.reason - Rejection reason
 * @param {string} params.requestId - Chat request ID
 */
function notifyChatRequestRejected({ studentId, reviewerName, reason, requestId }) {
    createNotification({
        recipient: studentId,
        recipientModel: "Student",
        senderModel: "System",
        type: "warning",
        title: "Chat Request Declined",
        message: `Your request to chat with ${reviewerName} was declined.${reason ? ` Reason: ${reason}` : ""}`,
        entityType: "chat",
        entityId: requestId,
    });
}

/* ======================================================
   ISSUE NOTIFICATION EVENTS
   Priority 2: Workflow-critical, natural event boundaries
====================================================== */

/**
 * Notify advisor/admin when new issue is created
 * 
 * @param {Object} params
 * @param {Array} params.recipientIds - Advisors/admins to notify
 * @param {string} params.issueId - Issue ID
 * @param {string} params.subject - Issue subject
 * @param {string} params.studentName - Student who created issue
 * @param {string} params.category - Issue category
 */
function notifyIssueCreated({ recipientIds, issueId, subject, studentName, category }) {
    recipientIds.forEach(recipientId => {
        createNotification({
            recipient: recipientId,
            recipientModel: "User",
            senderModel: "System",
            type: "info",
            title: "New Issue Submitted",
            message: `${studentName} submitted a new ${category} issue: ${subject}`,
            entityType: "issue",
            entityId: issueId,
            priority: "normal",
            link: `/issues/${issueId}`,
        });
    });
}

/**
 * Notify student when issue status is updated
 * 
 * @param {Object} params
 * @param {string} params.studentId - Student to notify
 * @param {string} params.issueId - Issue ID
 * @param {string} params.subject - Issue subject
 * @param {string} params.newStatus - New status
 * @param {string} params.responderName - Who updated the status
 */
function notifyIssueStatusUpdated({ studentId, issueId, subject, newStatus, responderName }) {
    const statusMessages = {
        "in-progress": `Your issue "${subject}" is now being handled by ${responderName}.`,
        "resolved": `Your issue "${subject}" has been resolved by ${responderName}.`,
    };

    createNotification({
        recipient: studentId,
        recipientModel: "Student",
        senderModel: "System",
        type: newStatus === "resolved" ? "success" : "info",
        title: `Issue ${newStatus === "resolved" ? "Resolved" : "In Progress"}`,
        message: statusMessages[newStatus] || `Your issue status has been updated to ${newStatus}.`,
        entityType: "issue",
        entityId: issueId,
        link: `/issues/${issueId}`,
    });
}

/* ======================================================
   EXPORTS
====================================================== */

module.exports = {
    // === DEDUP HELPER (used by notification.socket.js) ===
    upsertNotificationWithDedup,

    // Review events (existing)
    notifyReviewCreated,
    notifyReviewRescheduled,
    notifyReviewCancelled,

    // Chat events (Priority 1)
    notifyChatMessage,
    notifyChatRequestCreated,
    notifyChatRequestApproved,
    notifyChatRequestRejected,

    // Issue events (Priority 2)
    notifyIssueCreated,
    notifyIssueStatusUpdated,
};
