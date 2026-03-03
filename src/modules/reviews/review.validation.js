/**
 * ========================================================================
 *    REVIEW VALIDATION
 *    Input validation functions for review endpoints
 * ========================================================================
 * 
 * EXTRACTED FROM: reviewController.js (Phase 2 Refactor)
 * 
 * These functions:
 *   - Accept plain data (body / params / query)
 *   - Throw ValidationError if invalid
 *   - Return validated/sanitized data if valid
 *   - Do NOT access database
 *   - Do NOT contain business logic
 * 
 * ========================================================================
 */

/**
 * Custom validation error class
 * Thrown when input validation fails
 */
class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = "ValidationError";
        this.field = field;
        this.statusCode = 400;
    }
}

/* ======================================================
   CREATE REVIEW VALIDATION
   ====================================================== 
   
   ╔══════════════════════════════════════════════════════╗
   ║  🔒 FROZEN FEATURE - AUTO-GENERATED MEETING LINKS   ║
   ╠══════════════════════════════════════════════════════╣
   ║  Status: COMPLETE - Phase 1                          ║
   ║  Date: January 2026                                  ║
   ║                                                      ║
   ║  DO NOT MODIFY unless implementing Phase-2:          ║
   ║  - WebRTC video calling                              ║
   ║  - Socket.IO room management                         ║
   ║                                                      ║
   ║  The reviewId is intentionally used as room ID.     ║
   ║  No schema/API changes required for video calls.    ║
   ╚══════════════════════════════════════════════════════╝
*/

/**
 * Validate createReview request body
 * 
 * IMPORTANT: meetingLink is SERVER-GENERATED ONLY
 * - For online mode: Auto-generated as /review-room/{reviewId} by service layer
 * - For offline mode: Always null (location is used instead)
 * - Frontend-provided meetingLink values are IGNORED for security
 * 
 * This design enables future WebRTC/Socket.IO integration:
 * - reviewId serves as unique room identifier
 * - No schema/API changes needed when video calling is implemented
 * 
 * @param {Object} body - Request body
 * @returns {Object} Validated and sanitized data
 * @throws {ValidationError} If validation fails
 */
const validateCreateReview = (body) => {
    // Destructure WITHOUT meetingLink - it's server-generated only
    const { studentId, reviewerId, week, scheduledAt, mode, location } = body;

    // Required fields check
    if (!studentId) throw new ValidationError("Student ID is required", "studentId");
    if (!reviewerId) throw new ValidationError("Reviewer ID is required", "reviewerId");
    if (!week) throw new ValidationError("Week number is required", "week");
    if (!scheduledAt) throw new ValidationError("Scheduled date/time is required", "scheduledAt");
    if (!mode) throw new ValidationError("Review mode is required", "mode");

    // Mode validation
    if (!["online", "offline"].includes(mode)) {
        throw new ValidationError("Invalid review mode. Must be 'online' or 'offline'", "mode");
    }

    // Offline mode requires location
    if (mode === "offline" && !location) {
        throw new ValidationError("Location is required for offline reviews", "location");
    }

    // Return validated data - meetingLink is NEVER passed from client
    // Service layer will generate it for online mode
    return {
        studentId,
        reviewerId,
        week: parseInt(week, 10),
        scheduledAt: new Date(scheduledAt),
        mode,
        // meetingLink: null - explicitly NOT included, service generates it
        location: mode === "offline" ? location.trim() : null,
    };
};

/* ======================================================
   RESCHEDULE REVIEW VALIDATION
====================================================== */

/**
 * Validate rescheduleReview request body
 * @param {Object} body - Request body
 * @returns {Object} Validated data
 * @throws {ValidationError} If validation fails
 */
const validateRescheduleReview = (body) => {
    const { scheduledAt, reviewerId, notifyParticipants } = body;

    if (!scheduledAt) {
        throw new ValidationError("New date/time is required", "scheduledAt");
    }

    // Validate date is in the future
    const newDate = new Date(scheduledAt);
    if (isNaN(newDate.getTime())) {
        throw new ValidationError("Invalid date format", "scheduledAt");
    }

    return {
        scheduledAt: newDate,
        reviewerId: reviewerId || null,
        notifyParticipants: !!notifyParticipants,
    };
};

/* ======================================================
   CANCEL REVIEW VALIDATION
====================================================== */

/**
 * Validate cancelReview request body
 * @param {Object} body - Request body
 * @returns {Object} Validated data
 * @throws {ValidationError} If validation fails
 */
const validateCancelReview = (body) => {
    const { reason, notifyParticipants } = body;

    if (!reason || reason.trim() === "") {
        throw new ValidationError("Cancellation reason is required", "reason");
    }

    return {
        reason: reason.trim(),
        notifyParticipants: !!notifyParticipants,
    };
};

/* ======================================================
   REVIEWER PROFILE VALIDATION
====================================================== */

/**
 * Validate updateReviewerProfile request body
 * @param {Object} body - Request body
 * @returns {Object} Validated and sanitized data
 * @throws {ValidationError} If validation fails
 */
const validateUpdateReviewerProfile = (body) => {
    const { name, phone, about, domain } = body;

    if (!name || name.trim().length === 0) {
        throw new ValidationError("Name is required", "name");
    }

    const updateData = {
        name: name.trim(),
    };

    if (phone !== undefined) {
        updateData.phone = phone.trim();
    }

    if (about !== undefined) {
        updateData.about = about.trim();
    }

    if (domain !== undefined) {
        updateData.domain = domain.trim();
    }

    return updateData;
};

/* ======================================================
   REVIEW ID VALIDATION
====================================================== */

/**
 * Validate reviewId parameter
 * @param {string} reviewId - Review ID from params
 * @returns {string} Validated reviewId
 * @throws {ValidationError} If validation fails
 */
const validateReviewId = (reviewId) => {
    if (!reviewId) {
        throw new ValidationError("Review ID is required", "reviewId");
    }
    return reviewId;
};

/* ======================================================
   EXPORTS
====================================================== */

module.exports = {
    ValidationError,
    validateCreateReview,
    validateRescheduleReview,
    validateCancelReview,
    validateUpdateReviewerProfile,
    validateReviewId,
};
