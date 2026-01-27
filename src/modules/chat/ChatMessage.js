const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
    {
        // For normal chat - links to Conversation
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            index: true,
        },
        // For review session chat - links to ReviewSession
        // NOTE: Only one of conversationId or reviewSessionId should be set
        reviewSessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ReviewSession",
            index: true,
        },
        // Sender information
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "senderModel",
            required: true,
        },
        senderModel: {
            type: String,
            enum: ["User", "Student"],
            required: true,
        },
        // Message content
        content: {
            type: String,
            required: true,
            maxlength: 5000,
        },
        // Message type
        messageType: {
            type: String,
            enum: ["text", "system", "file"],
            default: "text",
        },
        // Read status
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: Date,
        // Soft delete
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Compound indexes for efficient querying
chatMessageSchema.index({ conversationId: 1, createdAt: -1 });
chatMessageSchema.index({ reviewSessionId: 1, createdAt: -1 });
chatMessageSchema.index({ senderId: 1, createdAt: -1 });

// === PHASE 2: Performance Index for markAsRead ===
// Supports: updateMany({ conversationId, senderId: { $ne }, isRead: false })
chatMessageSchema.index({ conversationId: 1, senderId: 1, isRead: 1 });

/**
 * Get messages for a conversation (paginated)
 */
chatMessageSchema.statics.getConversationMessages = async function (
    conversationId,
    page = 1,
    limit = 50
) {
    const skip = (page - 1) * limit;

    const messages = await this.find({
        conversationId,
        isDeleted: false
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("senderId", "name avatar");

    // Reverse to show oldest first
    return messages.reverse();
};

/**
 * Get messages for a review session (paginated)
 */
chatMessageSchema.statics.getReviewMessages = async function (
    reviewSessionId,
    page = 1,
    limit = 50
) {
    const skip = (page - 1) * limit;

    const messages = await this.find({
        reviewSessionId,
        isDeleted: false
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("senderId", "name avatar");

    return messages.reverse();
};

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
