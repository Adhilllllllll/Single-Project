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

/**
 * Create a notification (internal helper)
 * @param {Object} data - Notification data
 * @returns {Promise<void>}
 */
async function createNotification(data) {
    try {
        await Notification.create(data);
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
   EXPORTS
====================================================== */

module.exports = {
    notifyReviewCreated,
    notifyReviewRescheduled,
    notifyReviewCancelled,
};
