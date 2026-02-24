/**
 * ========================================================================
 *    REVIEW SERVICE
 *    Business logic for review operations
 * ========================================================================
 * 
 * EXTRACTED FROM: reviewController.js (Phase 3 Refactor)
 * 
 * This service:
 *   - Performs database operations
 *   - Implements business rules and workflows
 *   - Handles status transitions
 *   - Triggers side effects (emails, notifications)
 *   - Throws ServiceError for business rule violations
 * 
 * Service functions:
 *   - Accept plain parameters (no req/res)
 *   - Return data or throw errors
 *   - Assume input is already validated
 * 
 * ========================================================================
 */

const ReviewSession = require("./reviewSession");
const ReviewerEvaluation = require("./ReviewerEvaluation");
const FinalEvaluation = require("./FinalEvaluation");
const Student = require("../students/student");
const User = require("../users/User");
const mongoose = require("mongoose");
const { sendReviewAssignmentEmail } = require("../auth/emailService");

// Notification service (fire-and-forget)
const notificationService = require("../notifications/notification.service");

/**
 * Custom service error class
 * Thrown when business rules are violated
 */
class ServiceError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = "ServiceError";
        this.statusCode = statusCode;
    }
}

/* ======================================================
   ADVISOR SERVICE FUNCTIONS
   ====================================================== 
   
   ╔══════════════════════════════════════════════════════╗
   ║  🔒 FROZEN FEATURE - AUTO-GENERATED MEETING LINKS   ║
   ╠══════════════════════════════════════════════════════╣
   ║  Status: COMPLETE - Phase 1                          ║
   ║  Date: January 2026                                  ║
   ║                                                      ║
   ║  Meeting link format: /review-room/{reviewId}        ║
   ║                                                      ║
   ║  Phase-2 Integration Points:                         ║
   ║  - reviewId → Socket.IO room ID                      ║
   ║  - reviewId → WebRTC signaling room                  ║
   ║  - /review-room/:reviewId → Video call UI            ║
   ║                                                      ║
   ║  DO NOT MODIFY unless implementing video calls.      ║
   ╚══════════════════════════════════════════════════════╝
*/

/**
 * Create a new review session
 * 
 * MEETING LINK GENERATION POLICY:
 * - Online mode: Server ALWAYS generates /review-room/{reviewId}
 * - Offline mode: meetingLink is always null, location is required
 * - Frontend cannot override meetingLink (enforced in validation layer)
 * 
 * FUTURE VIDEO CALL INTEGRATION:
 * - reviewId = Socket.IO room ID
 * - reviewId = WebRTC signaling room ID  
 * - /review-room/{reviewId} route will serve video call UI
 * - No schema changes needed
 * 
 * @param {Object} data - Validated review data (meetingLink NOT included)
 * @param {string} advisorId - Advisor creating the review
 * @returns {Promise<Object>} Created review with generated meetingLink
 */
async function createReview(data, advisorId) {
    // Note: meetingLink is NOT destructured - it's server-generated only
    const { studentId, reviewerId, week, scheduledAt, mode, location } = data;

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
        throw new ServiceError("Student not found", 404);
    }

    // Ensure advisor owns the student
    if (student.advisorId.toString() !== advisorId) {
        throw new ServiceError("You are not assigned as this student's advisor", 403);
    }

    // Verify reviewer exists and is active
    const reviewer = await User.findOne({
        _id: reviewerId,
        role: "reviewer",
        status: "active",
    });

    if (!reviewer) {
        throw new ServiceError("Reviewer not found", 404);
    }

    // Safety check: Offline mode MUST have location
    if (mode === "offline" && !location) {
        throw new ServiceError("Location is required for offline reviews", 400);
    }

    // Get advisor info for email
    const advisor = await User.findById(advisorId);

    // Create review session (meetingLink populated after for online mode)
    const review = await ReviewSession.create({
        student: studentId,
        advisor: advisorId,
        reviewer: reviewerId,
        week,
        scheduledAt: new Date(scheduledAt),
        mode,
        meetingLink: null, // Will be set below for online mode
        location: mode === "offline" ? location : null,
    });

    // SERVER-ONLY: Generate meeting link for online mode
    // Format: /review-room/{reviewId}
    // This ID will serve as:
    //   1. Route path for video call page
    //   2. Socket.IO room identifier
    //   3. WebRTC signaling room identifier
    if (mode === "online") {
        review.meetingLink = `/review-room/${review._id}`;
        await review.save();
    }

    // Safety check: Online mode MUST have meetingLink after creation
    if (mode === "online" && !review.meetingLink) {
        throw new ServiceError("Failed to generate meeting link", 500);
    }

    // Send email notifications (fire and forget)
    sendReviewAssignmentEmail({
        studentEmail: student.email,
        studentName: student.name,
        reviewerEmail: reviewer.email,
        reviewerName: reviewer.name,
        advisorName: advisor?.name || "Advisor",
        scheduledAt: new Date(scheduledAt),
        mode,
        meetingLink: review.meetingLink,
        location: mode === "offline" ? location : null,
        week,
    }).catch(err => console.error("Email notification failed:", err.message));

    // Send in-app notifications (fire-and-forget)
    notificationService.notifyReviewCreated({
        reviewId: review._id,
        reviewerId,
        studentId,
        studentName: student.name,
        week,
        scheduledAt,
    });

    return review;
}

/**
 * Get reviews for an advisor
 * @param {string} advisorId - Advisor ID
 * @returns {Promise<Array>} List of reviews
 */
async function getAdvisorReviews(advisorId) {
    const reviews = await ReviewSession.find({
        advisor: new mongoose.Types.ObjectId(advisorId),
    })
        .populate("student", "name email")
        .populate("reviewer", "name email domain")
        .sort({ scheduledAt: -1 })
        .lean();

    return reviews;
}

/**
 * Get reviews for a reviewer
 * @param {string} reviewerId - Reviewer ID
 * @param {string} status - Optional status filter
 * @returns {Promise<Array>} List of reviews
 */
async function getReviewerReviews(reviewerId, status = null) {
    const query = {
        reviewer: new mongoose.Types.ObjectId(reviewerId),
    };

    if (status) {
        query.status = status;
    }

    const reviews = await ReviewSession.find(query)
        .populate("student", "name email")
        .populate("advisor", "name email domain")
        .sort({ scheduledAt: -1 });

    return reviews;
}

/**
 * Get a single review by ID for advisor
 * @param {string} reviewId - Review ID
 * @param {string} advisorId - Advisor ID
 * @returns {Promise<Object>} Review
 */
async function getSingleReviewForAdvisor(reviewId, advisorId) {
    const review = await ReviewSession.findOne({
        _id: reviewId,
        advisor: advisorId,
    })
        .populate("student", "name email")
        .populate("reviewer", "name email domain");

    if (!review) {
        throw new ServiceError("Review not found", 404);
    }

    return review;
}

/**
 * Reschedule a review
 * @param {string} reviewId - Review ID
 * @param {string} advisorId - Advisor ID
 * @param {Object} data - Reschedule data
 * @returns {Promise<Object>} Updated review
 */
async function rescheduleReview(reviewId, advisorId, data) {
    const { scheduledAt, reviewerId } = data;

    const review = await ReviewSession.findOne({
        _id: reviewId,
        advisor: advisorId,
    });

    if (!review) {
        throw new ServiceError("Review not found", 404);
    }

    if (review.status === "completed" || review.status === "cancelled") {
        throw new ServiceError(`Cannot reschedule a ${review.status} review`, 400);
    }

    // Update reviewer if provided
    if (reviewerId && reviewerId !== review.reviewer?.toString()) {
        review.reviewer = reviewerId;
    }

    review.scheduledAt = new Date(scheduledAt);
    review.status = "scheduled";
    await review.save();

    // Populate reviewer for response
    await review.populate("reviewer", "name email");

    // Send notifications (fire-and-forget)
    notificationService.notifyReviewRescheduled({
        reviewId: review._id,
        reviewerId: review.reviewer?._id || review.reviewer,
        studentId: review.student,
        newScheduledAt: review.scheduledAt,
        week: review.week,
    });

    return review;
}

/**
 * Cancel a review
 * @param {string} reviewId - Review ID
 * @param {string} advisorId - Advisor ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Cancelled review
 */
async function cancelReview(reviewId, advisorId, reason) {
    const review = await ReviewSession.findOne({
        _id: reviewId,
        advisor: advisorId,
    });

    if (!review) {
        throw new ServiceError("Review not found", 404);
    }

    if (review.status === "completed") {
        throw new ServiceError("Cannot cancel a completed review", 400);
    }

    if (review.status === "cancelled") {
        throw new ServiceError("Review is already cancelled", 400);
    }

    review.status = "cancelled";
    review.feedback = `Cancelled: ${reason}`;
    await review.save();

    // Send notifications (fire-and-forget)
    notificationService.notifyReviewCancelled({
        reviewId: review._id,
        reviewerId: review.reviewer,
        studentId: review.student,
        reason,
        week: review.week,
    });

    return review;
}

/* ======================================================
   REVIEWER SERVICE FUNCTIONS
====================================================== */

/**
 * Accept a review assignment
 * @param {string} reviewId - Review ID
 * @param {string} reviewerId - Reviewer ID
 * @returns {Promise<Object>} Updated review
 */
async function acceptReview(reviewId, reviewerId) {
    const review = await ReviewSession.findOne({
        _id: reviewId,
        reviewer: reviewerId,
    });

    if (!review) {
        throw new ServiceError("Review not found", 404);
    }

    if (review.status !== "pending") {
        throw new ServiceError(`Cannot accept a review with status: ${review.status}`, 400);
    }

    review.status = "accepted";
    await review.save();

    return review;
}

/**
 * Reject a review assignment
 * @param {string} reviewId - Review ID
 * @param {string} reviewerId - Reviewer ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Updated review
 */
async function rejectReview(reviewId, reviewerId, reason) {
    const review = await ReviewSession.findOne({
        _id: reviewId,
        reviewer: reviewerId,
    });

    if (!review) {
        throw new ServiceError("Review not found", 404);
    }

    if (review.status !== "pending") {
        throw new ServiceError(`Cannot reject a review with status: ${review.status}`, 400);
    }

    review.status = "rejected";
    if (reason) review.feedback = `Rejected: ${reason}`;
    await review.save();

    return review;
}

/**
 * Get a single review for reviewer
 * @param {string} reviewId - Review ID
 * @param {string} reviewerId - Reviewer ID
 * @returns {Promise<Object>} Review
 */
async function getSingleReviewForReviewer(reviewId, reviewerId) {
    const review = await ReviewSession.findOne({
        _id: reviewId,
        reviewer: reviewerId,
    })
        .populate("student", "name email")
        .populate("advisor", "name email domain")
        .lean();

    if (!review) {
        throw new ServiceError("Review not found", 404);
    }

    return review;
}

/* ======================================================
   EXPORTS
====================================================== */

module.exports = {
    ServiceError,
    // Advisor functions
    createReview,
    getAdvisorReviews,
    getSingleReviewForAdvisor,
    rescheduleReview,
    cancelReview,
    // Reviewer functions
    acceptReview,
    rejectReview,
    getReviewerReviews,
    getSingleReviewForReviewer,
};
