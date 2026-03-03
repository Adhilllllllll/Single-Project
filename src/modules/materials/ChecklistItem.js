const mongoose = require("mongoose");

const checklistItemSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        title: { type: String, required: true },
        completed: { type: Boolean, default: false },
        completedAt: Date,
        requiresUpload: { type: Boolean, default: false },
        attachment: {
            filename: String,
            path: String,
            uploadedAt: Date,
        },
        reviewSession: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ReviewSession",
        },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Indexes
checklistItemSchema.index({ student: 1 });
checklistItemSchema.index({ student: 1, reviewSession: 1 });

module.exports = mongoose.model("ChecklistItem", checklistItemSchema);
