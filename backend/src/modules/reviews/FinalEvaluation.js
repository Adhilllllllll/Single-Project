const mongoose = require("mongoose");

/**
 * FinalEvaluation Schema
 * Stores the advisor's final evaluation and authoritative score.
 * This is the official score visible to the student.
 * Includes advisor-specific scores: attendance, discipline
 */
const finalEvaluationSchema = new mongoose.Schema(
    {
        reviewSession: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ReviewSession",
            required: true,
            unique: true, // One final evaluation per review session
        },

        advisor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        reviewerEvaluation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ReviewerEvaluation",
            required: true,
        },

        // Advisor's final authoritative score (0-10, step 0.5)
        finalScore: {
            type: Number,
            min: 0,
            max: 10,
            required: true,
        },

        // Advisor-specific evaluation scores (0-10, step 0.5)
        attendance: {
            type: Number,
            min: 0,
            max: 10,
            default: 0,
        },

        discipline: {
            type: Number,
            min: 0,
            max: 10,
            default: 0,
        },

        // Adjusted task scores (optional - advisor can modify reviewer's scores)
        adjustedScores: {
            technicalUnderstanding: {
                type: Number,
                min: 0,
                max: 10,
            },
            taskCompletion: {
                type: Number,
                min: 0,
                max: 10,
            },
            communication: {
                type: Number,
                min: 0,
                max: 10,
            },
            problemSolving: {
                type: Number,
                min: 0,
                max: 10,
            },
        },

        // Advisor's final remarks
        finalRemarks: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
    },
    { timestamps: true }
);

// Indexes for efficient queries
// NOTE: reviewSession index NOT needed - `unique: true` on field already creates one
// finalEvaluationSchema.index({ reviewSession: 1 }); // REMOVED: Duplicate
finalEvaluationSchema.index({ advisor: 1 });
finalEvaluationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("FinalEvaluation", finalEvaluationSchema);

