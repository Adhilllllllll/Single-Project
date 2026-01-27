const Conversation = require("../modules/chat/Conversation");
const ChatMessage = require("../modules/chat/ChatMessage");
const ChatRequest = require("../modules/chat/ChatRequest");
const User = require("../modules/users/User");
const Student = require("../modules/students/student");

// === NOTIFICATION SERVICE ===
// Fire-and-forget notification trigger for new chat messages
const { notifyChatMessage } = require("../modules/notifications/notification.service");

/**
 * Normal Chat Socket Handler
 * Rules:
 *   - Advisor ↔ Student ✅
 *   - Advisor ↔ Reviewer ✅
 *   - Reviewer ↔ Student ✅ (only if approved by advisor)
 */
const chatSocketHandler = (io, socket, onlineUsers) => {
    const { userId, userRole, userModel, userName } = socket;

    /**
     * Validate if two users can chat (async to check ChatRequest)
     */
    const canUsersChat = async (role1, role2, userId1, userId2) => {
        // Build a set of allowed chat pairs
        const allowedPairs = [
            ["advisor", "student"],
            ["student", "advisor"],
            ["advisor", "reviewer"],
            ["reviewer", "advisor"],
            // Admin can chat with anyone
            ["admin", "advisor"],
            ["admin", "reviewer"],
            ["admin", "student"],
            ["advisor", "admin"],
            ["reviewer", "admin"],
            ["student", "admin"],
        ];

        const isBasicAllowed = allowedPairs.some(
            ([a, b]) => (role1 === a && role2 === b)
        );

        if (isBasicAllowed) return true;

        // Check if Reviewer ↔ Student with approved ChatRequest
        if ((role1 === "reviewer" && role2 === "student") || (role1 === "student" && role2 === "reviewer")) {
            const studentId = role1 === "student" ? userId1 : userId2;
            const reviewerId = role1 === "reviewer" ? userId1 : userId2;
            const isApproved = await ChatRequest.isChatApproved(studentId, reviewerId);
            return isApproved;
        }

        return false;
    };

    /**
     * Get user role from their ID
     */
    const getUserRole = async (targetUserId) => {
        let user = await User.findById(targetUserId).select("role");
        if (user) return user.role;

        const student = await Student.findById(targetUserId);
        if (student) return "student";

        return null;
    };

    /**
     * Join a conversation room
     */
    socket.on("chat:join", async ({ conversationId }) => {
        try {
            if (!conversationId) {
                return socket.emit("chat:error", { message: "Conversation ID required" });
            }

            // Verify user is a participant
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return socket.emit("chat:error", { message: "Conversation not found" });
            }

            const isParticipant = conversation.participants.some(
                (p) => p.toString() === userId
            );

            if (!isParticipant) {
                return socket.emit("chat:error", { message: "Not authorized to join this conversation" });
            }

            // Join the room
            socket.join(`chat:${conversationId}`);
            console.log(`💬 ${userName} joined chat:${conversationId}`);

            socket.emit("chat:joined", { conversationId });
        } catch (err) {
            console.error("chat:join error:", err);
            socket.emit("chat:error", { message: "Failed to join conversation" });
        }
    });

    /**
     * Send a message
     */
    socket.on("chat:send", async ({ conversationId, content }) => {
        try {
            if (!conversationId || !content?.trim()) {
                return socket.emit("chat:error", { message: "Conversation ID and message content required" });
            }

            // Verify conversation and participation
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return socket.emit("chat:error", { message: "Conversation not found" });
            }

            const isParticipant = conversation.participants.some(
                (p) => p.toString() === userId
            );

            if (!isParticipant) {
                return socket.emit("chat:error", { message: "Not authorized to send messages here" });
            }

            // Get other participant's role for validation
            const otherParticipantId = conversation.participants.find(
                (p) => p.toString() !== userId
            );
            const otherRole = await getUserRole(otherParticipantId);

            const canChat = await canUsersChat(userRole, otherRole, userId, otherParticipantId.toString());
            if (!canChat) {
                return socket.emit("chat:error", {
                    message: `Chat with this user requires advisor approval`
                });
            }

            // Create message
            const message = await ChatMessage.create({
                conversationId,
                senderId: userId,
                senderModel: userModel,
                content: content.trim(),
                messageType: "text",
            });

            // Update conversation
            conversation.lastMessage = content.trim().substring(0, 100);
            conversation.lastMessageAt = new Date();

            // Increment unread count for other participant
            const unreadCount = conversation.unreadCount || new Map();
            const currentCount = unreadCount.get(otherParticipantId.toString()) || 0;
            unreadCount.set(otherParticipantId.toString(), currentCount + 1);
            conversation.unreadCount = unreadCount;

            await conversation.save();

            // Populate sender info for response
            const populatedMessage = await ChatMessage.findById(message._id)
                .populate("senderId", "name avatar");

            const messageData = {
                _id: message._id,
                conversationId,
                senderId: userId,
                senderName: userName,
                content: content.trim(),
                createdAt: message.createdAt,
            };

            // Emit to all in room (including sender for confirmation)
            io.to(`chat:${conversationId}`).emit("chat:receive", messageData);

            // Also emit to recipient's personal room in case they're not in chat room
            io.to(`user:${otherParticipantId}`).emit("chat:newMessage", {
                conversationId,
                message: messageData,
            });

            // === NOTIFICATION: Create persistent notification for recipient ===
            // Fire-and-forget: creates DB record + emits if online
            // This ensures notification persists even if recipient is offline
            notifyChatMessage({
                recipientId: otherParticipantId.toString(),
                recipientModel: conversation.participantModels?.[1] || "User",
                conversationId,
                senderName: userName,
                messagePreview: content.trim(),
            });

            console.log(`📨 Message sent in chat:${conversationId} by ${userName}`);
        } catch (err) {
            console.error("chat:send error:", err);
            socket.emit("chat:error", { message: "Failed to send message" });
        }
    });

    /**
     * Mark messages as read
     */
    socket.on("chat:markRead", async ({ conversationId }) => {
        try {
            if (!conversationId) return;

            // Mark all messages as read
            await ChatMessage.updateMany(
                { conversationId, senderId: { $ne: userId }, isRead: false },
                { isRead: true }
            );

            // Reset unread count
            const conversation = await Conversation.findById(conversationId);
            if (conversation && conversation.unreadCount) {
                conversation.unreadCount.set(userId, 0);
                await conversation.save();
            }

            socket.emit("chat:messagesRead", { conversationId });
        } catch (err) {
            console.error("chat:markRead error:", err);
        }
    });

    /**
     * Leave conversation room
     */
    socket.on("chat:leave", ({ conversationId }) => {
        if (conversationId) {
            socket.leave(`chat:${conversationId}`);
            console.log(`👋 ${userName} left chat:${conversationId}`);
        }
    });

    /**
     * Typing indicator (optional)
     */
    socket.on("chat:typing", ({ conversationId, isTyping }) => {
        socket.to(`chat:${conversationId}`).emit("chat:userTyping", {
            userId,
            userName,
            isTyping,
        });
    });
};

module.exports = chatSocketHandler;
