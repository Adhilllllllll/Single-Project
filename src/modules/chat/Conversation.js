const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
    {
        // Array of participant IDs (always 2 for 1-1 chat)
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                refPath: "participantModels",
                required: true,
            },
        ],
        // Model type for each participant ("User" or "Student")
        participantModels: [
            {
                type: String,
                enum: ["User", "Student"],
                required: true,
            },
        ],
        // Role of each participant for quick filtering
        participantRoles: [
            {
                type: String,
                enum: ["admin", "advisor", "reviewer", "student"],
            },
        ],
        // Last message preview
        lastMessage: {
            type: String,
            maxlength: 200,
        },
        lastMessageAt: {
            type: Date,
            default: Date.now,
        },
        // Unread count per participant: { odId: count }
        unreadCount: {
            type: Map,
            of: Number,
            default: {},
        },
        // Conversation status
        isActive: {
            type: Boolean,
            default: true,
        },
        // Metadata
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

// Index for efficient querying
conversationSchema.index({ participants: 1 });
conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ "unreadCount.$**": 1 });

/**
 * Find existing conversation between two users
 */
conversationSchema.statics.findBetweenUsers = async function (userId1, userId2) {
    return this.findOne({
        participants: { $all: [userId1, userId2] },
        isActive: true,
    });
};

/**
 * Get all conversations for a user
 */
conversationSchema.statics.getForUser = async function (userId) {
    return this.find({
        participants: userId,
        isActive: true,
    })
        .sort({ lastMessageAt: -1 })
        .populate("participants", "name email avatar role");
};

module.exports = mongoose.model("Conversation", conversationSchema);
