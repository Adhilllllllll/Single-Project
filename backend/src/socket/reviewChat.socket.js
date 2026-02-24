const ReviewSession = require("../modules/reviews/reviewSession");
const ChatMessage = require("../modules/chat/ChatMessage");

/**
 * Review Session Chat Socket Handler
 * Rules:
 *   - All participants (Advisor, Reviewer, Student) can chat freely
 *   - Only validate membership in the review session
 *   - This is context-bound to the specific review session
 */
const reviewChatSocketHandler = (io, socket, onlineUsers) => {
    const { userId, userRole, userModel, userName } = socket;

    /**
     * Check if user is a participant in the review session
     */
    const isReviewParticipant = async (reviewSessionId) => {
        const review = await ReviewSession.findById(reviewSessionId)
            .populate("student", "_id")
            .populate("reviewer", "_id")
            .populate("advisor", "_id");

        if (!review) return { valid: false, review: null };

        const studentId = review.student?._id?.toString();
        const reviewerId = review.reviewer?._id?.toString();
        const advisorId = review.advisor?._id?.toString();

        const isParticipant = [studentId, reviewerId, advisorId].includes(userId);

        return { valid: isParticipant, review };
    };

    /**
     * Join a review session chat room
     */
    socket.on("reviewChat:join", async ({ reviewSessionId }) => {
        try {
            if (!reviewSessionId) {
                return socket.emit("reviewChat:error", { message: "Review session ID required" });
            }

            const { valid, review } = await isReviewParticipant(reviewSessionId);

            if (!valid) {
                return socket.emit("reviewChat:error", {
                    message: "You are not a participant in this review session"
                });
            }

            // Join the review chat room
            socket.join(`review:${reviewSessionId}`);
            console.log(`📋 ${userName} (${userRole}) joined review:${reviewSessionId}`);

            socket.emit("reviewChat:joined", {
                reviewSessionId,
                reviewInfo: {
                    studentName: review.student?.name,
                    reviewerName: review.reviewer?.name,
                    week: review.week,
                    status: review.status,
                }
            });
        } catch (err) {
            console.error("reviewChat:join error:", err);
            socket.emit("reviewChat:error", { message: "Failed to join review chat" });
        }
    });

    /**
     * Send a message in review session chat
     * All participants can send messages freely
     */
    socket.on("reviewChat:send", async ({ reviewSessionId, content }) => {
        try {
            if (!reviewSessionId || !content?.trim()) {
                return socket.emit("reviewChat:error", {
                    message: "Review session ID and message content required"
                });
            }

            const { valid, review } = await isReviewParticipant(reviewSessionId);

            if (!valid) {
                return socket.emit("reviewChat:error", {
                    message: "You are not authorized to send messages in this review"
                });
            }

            // Check if review is in a valid state for chat
            if (["cancelled"].includes(review.status)) {
                return socket.emit("reviewChat:error", {
                    message: "Cannot send messages in a cancelled review"
                });
            }

            // Create message with reviewSessionId (not conversationId)
            const message = await ChatMessage.create({
                reviewSessionId,
                senderId: userId,
                senderModel: userModel,
                content: content.trim(),
                messageType: "text",
            });

            const messageData = {
                _id: message._id,
                reviewSessionId,
                senderId: userId,
                senderName: userName,
                senderRole: userRole,
                content: content.trim(),
                createdAt: message.createdAt,
            };

            // Emit to all participants in the review room
            io.to(`review:${reviewSessionId}`).emit("reviewChat:receive", messageData);

            // Also notify participants not in the room
            const participantIds = [
                review.student?._id?.toString(),
                review.reviewer?._id?.toString(),
                review.advisor?._id?.toString(),
            ].filter((id) => id && id !== userId);

            participantIds.forEach((participantId) => {
                io.to(`user:${participantId}`).emit("reviewChat:newMessage", {
                    reviewSessionId,
                    message: messageData,
                });
            });

            console.log(`📨 Review message sent in review:${reviewSessionId} by ${userName}`);
        } catch (err) {
            console.error("reviewChat:send error:", err);
            socket.emit("reviewChat:error", { message: "Failed to send message" });
        }
    });

    /**
     * Leave review session chat room
     */
    socket.on("reviewChat:leave", ({ reviewSessionId }) => {
        if (reviewSessionId) {
            socket.leave(`review:${reviewSessionId}`);
            console.log(`👋 ${userName} left review:${reviewSessionId}`);
        }
    });

    /**
     * Get participants currently in the review chat
     */
    socket.on("reviewChat:getParticipants", async ({ reviewSessionId }) => {
        try {
            const room = io.sockets.adapter.rooms.get(`review:${reviewSessionId}`);
            const activeSocketIds = room ? Array.from(room) : [];

            const activeParticipants = [];
            for (const socketId of activeSocketIds) {
                const clientSocket = io.sockets.sockets.get(socketId);
                if (clientSocket) {
                    activeParticipants.push({
                        id: clientSocket.userId,
                        name: clientSocket.userName,
                        role: clientSocket.userRole,
                    });
                }
            }

            socket.emit("reviewChat:participants", { reviewSessionId, participants: activeParticipants });
        } catch (err) {
            console.error("reviewChat:getParticipants error:", err);
        }
    });
};

module.exports = reviewChatSocketHandler;
