const mongoose = require("mongoose");

/**
 * ReviewerEvaluation Schema
 * Stores the reviewer's evaluation after completing a review session.
 * Task-wise scoring only - NO overall performance (that's advisor-only).
 */
const reviewerEvaluationSchema = new mongoose.Schema(
    {
        reviewSession: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ReviewSession",
            required: true,
            unique: true, // One evaluation per review session
        },

        reviewer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Task-wise scores (0-10 scale, 0.5 step)
        // Note: NO overallPerformance - that's advisor-only
        scores: {
            technicalUnderstanding: {
                type: Number,
                min: 0,
                max: 10,
                required: true,
            },
            taskCompletion: {
                type: Number,
                min: 0,
                max: 10,
                required: true,
            },
            communication: {
                type: Number,
                min: 0,
                max: 10,
                required: true,
            },
            problemSolving: {
                type: Number,
                min: 0,
                max: 10,
                required: true,
            },
        },

        // Calculated average of all task scores
        averageScore: {
            type: Number,
            min: 0,
            max: 10,
        },

        // Detailed feedback from reviewer
        feedback: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 2000,
        },

        // Optional additional remarks
        remarks: {
            type: String,
            trim: true,
            maxlength: 500,
        },
    },
    { timestamps: true }
);

// Pre-save hook to calculate average score from 4 task-wise scores
reviewerEvaluationSchema.pre("save", function (next) {
    const { scores } = this;
    const total =
        scores.technicalUnderstanding +
        scores.taskCompletion +
        scores.communication +
        scores.problemSolving;
    this.averageScore = parseFloat((total / 4).toFixed(2));
    next();
});

// Indexes for efficient queries
reviewerEvaluationSchema.index({ reviewSession: 1 });
reviewerEvaluationSchema.index({ reviewer: 1 });
reviewerEvaluationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ReviewerEvaluation", reviewerEvaluationSchema);

