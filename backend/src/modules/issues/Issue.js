const mongoose = require("mongoose");

/**
 * Issue/Suggestion Schema
 * Student can submit issues/suggestions to Advisor and/or Admin
 */
const issueSchema = new mongoose.Schema(
    {
        // Student who submitted
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },

        // Auto-filled from student's advisor
        advisorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Subject line
        subject: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        // Detailed description
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },

        // Category of the issue
        category: {
            type: String,
            enum: ["technical", "academic", "schedule", "suggestion", "other"],
            default: "other",
        },

        // Who should receive this issue
        recipients: {
            type: [String],
            enum: ["advisor", "admin"],
            required: true,
            validate: {
                validator: (arr) => arr.length > 0,
                message: "At least one recipient is required",
            },
        },

        // Current status
        status: {
            type: String,
            enum: ["pending", "in-progress", "resolved"],
            default: "pending",
        },

        // Responses from Advisor/Admin
        responses: [
            {
                responderId: {
                    type: mongoose.Schema.Types.ObjectId,
                    refPath: "responses.responderModel",
                    required: true,
                },
                responderModel: {
                    type: String,
                    enum: ["User"],
                    default: "User",
                },
                responderName: String,
                responderRole: String,
                message: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 1000,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        // Resolution tracking
        resolvedAt: Date,
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

// Indexes
issueSchema.index({ studentId: 1, createdAt: -1 });
issueSchema.index({ advisorId: 1, status: 1 });
issueSchema.index({ recipients: 1, status: 1 });
issueSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Issue", issueSchema);
