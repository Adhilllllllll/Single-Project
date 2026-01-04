const mongoose = require("mongoose");

/**
 * ChatRequest Schema
 * Used for Student to request chat permission with Reviewer
 * Advisor must approve before chat is enabled
 */
const chatRequestSchema = new mongoose.Schema(
    {
        // Student requesting the chat
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        // Reviewer they want to chat with
        reviewerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Advisor who approves (student's advisor)
        advisorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Request status
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        // Why the student wants to chat
        reason: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        // Rejection reason (if rejected)
        rejectionReason: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        // When was it approved/rejected
        respondedAt: Date,
    },
    { timestamps: true }
);

// Indexes for efficient querying
chatRequestSchema.index({ studentId: 1, reviewerId: 1 });
chatRequestSchema.index({ advisorId: 1, status: 1 });
chatRequestSchema.index({ status: 1 });

/**
 * Check if chat is approved between student and reviewer
 */
chatRequestSchema.statics.isChatApproved = async function (studentId, reviewerId) {
    const request = await this.findOne({
        studentId,
        reviewerId,
        status: "approved",
    });
    return !!request;
};

/**
 * Check if a pending request exists
 */
chatRequestSchema.statics.hasPendingRequest = async function (studentId, reviewerId) {
    const request = await this.findOne({
        studentId,
        reviewerId,
        status: "pending",
    });
    return !!request;
};

module.exports = mongoose.model("ChatRequest", chatRequestSchema);
