const mongoose = require("mongoose");

const scoringTemplateSchema = new mongoose.Schema(
    {
        advisorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        criteria: {
            type: [String],
            default: [],
        },
    },
    { timestamps: true }
);

// Index for faster queries
scoringTemplateSchema.index({ advisorId: 1 });

module.exports = mongoose.model("ScoringTemplate", scoringTemplateSchema);
