/**
 * ========================================================================
 *    REVIEW HELPERS
 *    Pure utility functions for review data formatting and validation
 * ========================================================================
 * 
 * EXTRACTED FROM: reviewController.js (Phase 1 Refactor)
 * 
 * These functions are:
 *   - Stateless (no side effects)
 *   - Pure (same input = same output)
 *   - Reusable across controller functions
 * 
 * ========================================================================
 */

const mongoose = require("mongoose");

/* ======================================================
   DATE FORMATTING
====================================================== */

/**
 * Format a date for review display
 * @param {Date|string} date - The date to format
 * @returns {{ date: string, time: string }} Formatted date and time strings
 */
const formatReviewDate = (date) => ({
    date: new Date(date).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric"
    }),
    time: new Date(date).toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit"
    })
});

/* ======================================================
   REVIEW OBJECT FORMATTING
====================================================== */

/**
 * Transform a review document for API response
 * Standardizes the review object structure for frontend consumption
 * @param {Object} review - Populated review document
 * @returns {Object} Formatted review object
 */
const formatReviewForResponse = (review) => {
    const { date, time } = formatReviewDate(review.scheduledAt);
    return {
        id: review._id,
        student: review.student?.name || "Unknown",
        studentEmail: review.student?.email || "",
        reviewer: review.reviewer?.name || "Unknown",
        reviewerEmail: review.reviewer?.email || "",
        domain: review.reviewer?.domain || "General",
        date,
        time,
        scheduledAt: review.scheduledAt,
        week: review.week,
        status: review.status.charAt(0).toUpperCase() + review.status.slice(1),
        mode: review.mode,
        meetingLink: review.meetingLink,
        location: review.location,
        marks: review.marks,
        feedback: review.feedback,
    };
};

/* ======================================================
   OBJECTID HELPERS
====================================================== */

/**
 * Check if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} True if valid ObjectId format
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Convert a string to MongoDB ObjectId
 * @param {string} id - The ID string to convert
 * @returns {mongoose.Types.ObjectId} The ObjectId instance
 */
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

/* ======================================================
   EXPORTS
====================================================== */

module.exports = {
    formatReviewDate,
    formatReviewForResponse,
    isValidObjectId,
    toObjectId,
};
