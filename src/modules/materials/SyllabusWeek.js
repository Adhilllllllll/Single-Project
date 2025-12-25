const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, enum: ["pdf", "video", "link", "doc"], required: true },
    size: String,
    duration: String,
    url: { type: String, required: true },
});

const syllabusWeekSchema = new mongoose.Schema(
    {
        week: { type: Number, required: true },
        title: { type: String, required: true },
        description: String,
        resources: [resourceSchema],
        course: { type: String }, // e.g., "Python", "Data Science"
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

// Index for efficient querying
syllabusWeekSchema.index({ week: 1 });
syllabusWeekSchema.index({ course: 1 });

module.exports = mongoose.model("SyllabusWeek", syllabusWeekSchema);
