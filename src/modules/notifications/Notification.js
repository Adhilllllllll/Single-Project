const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: function () { return !this.isBroadcast; }, // Not required for broadcast
        },
        recipientModel: {
            type: String,
            enum: ["User", "Student"],
            default: "User",
        },
        // Admin sender tracking
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        senderModel: {
            type: String,
            enum: ["User", "System"],
            default: "System",
        },
        // Broadcast notification fields
        isBroadcast: {
            type: Boolean,
            default: false,
        },
        recipientGroup: {
            type: String,
            enum: ["students", "reviewers", "all_users", null],
            default: null,
        },
        type: {
            type: String,
            enum: [
                "review_reminder",
                "review_scheduled",
                "review_rescheduled",
                "review_cancelled",
                "review_completed",
                "feedback_available",
                "new_message",
                "task_deadline",
                "task_assigned",
                "system",
                "info",
                "success",
                "warning",
                "admin_broadcast", // New type for admin broadcasts
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
        // Delivery status for admin tracking
        deliveryStatus: {
            type: String,
            enum: ["pending", "delivered", "failed"],
            default: "delivered",
        },
    },
    { timestamps: true }
);

// Indexes for efficient querying
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ senderId: 1, createdAt: -1 }); // For admin sent notifications
notificationSchema.index({ isBroadcast: 1, recipientGroup: 1 }); // For broadcast queries

module.exports = mongoose.model("Notification", notificationSchema);

