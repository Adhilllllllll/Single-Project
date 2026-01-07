const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
    {
        advisorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
        },
        attachmentPath: {
            type: String,
            default: null,
        },
        attachmentName: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

// Index for faster queries
noteSchema.index({ advisorId: 1, studentId: 1 });

module.exports = mongoose.model("Note", noteSchema);
