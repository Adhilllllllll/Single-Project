const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        deadline: {
            type: Date,
            required: true,
        },
        priority: {
            type: String,
            enum: ["High", "Medium", "Low"],
            default: "Medium",
        },
        status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed"],
            default: "Pending",
        },
        attachmentRequired: {
            type: Boolean,
            default: false,
        },
        attachment: {
            filename: String,
            path: String,
            uploadedAt: Date,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Advisor who created the task
        },
    },
    { timestamps: true }
);

// Indexes
taskSchema.index({ student: 1 });
taskSchema.index({ deadline: 1 });
taskSchema.index({ status: 1 });

module.exports = mongoose.model("Task", taskSchema);
