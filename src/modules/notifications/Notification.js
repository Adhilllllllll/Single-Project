const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        recipientModel: {
            type: String,
            enum: ["User", "Student"],
            default: "User",
        },
        type: {
            type: String,
            enum: [
                "review_reminder",
                "review_scheduled",
                "review_completed",
                "feedback_available",
                "new_message",
                "task_deadline",
                "task_assigned",
                "system",
                "info",
                "success",
                "warning",
            ],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: Date,
        link: String, // Optional link to navigate to
        metadata: {
            reviewId: mongoose.Schema.Types.ObjectId,
            taskId: mongoose.Schema.Types.ObjectId,
            senderId: mongoose.Schema.Types.ObjectId,
        },
    },
    { timestamps: true }
);

// Indexes for efficient querying
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
