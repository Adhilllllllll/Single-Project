const Conversation = require("./Conversation");
const ChatMessage = require("./ChatMessage");
const ChatRequest = require("./ChatRequest");
const User = require("../users/User");
const Student = require("../students/student");
const ReviewSession = require("../reviews/reviewSession");

/**
 * Validate if two users can chat (outside review sessions)
 * Reviewer ↔ Student requires approved ChatRequest
 */
const canUsersChat = async (role1, role2, userId1, userId2) => {
    const allowedPairs = [
        ["advisor", "student"],
        ["student", "advisor"],
        ["advisor", "reviewer"],
        ["reviewer", "advisor"],
        ["admin", "advisor"],
        ["admin", "reviewer"],
        ["admin", "student"],
        ["advisor", "admin"],
        ["reviewer", "admin"],
        ["student", "admin"],
    ];

    // Check basic allowed pairs
    const isBasicAllowed = allowedPairs.some(([a, b]) => role1 === a && role2 === b);
    if (isBasicAllowed) return true;

    // Check if Reviewer ↔ Student with approved request
    if ((role1 === "reviewer" && role2 === "student") || (role1 === "student" && role2 === "reviewer")) {
        const studentId = role1 === "student" ? userId1 : userId2;
        const reviewerId = role1 === "reviewer" ? userId1 : userId2;
        const isApproved = await ChatRequest.isChatApproved(studentId, reviewerId);
        return isApproved;
    }

    return false;
};

/**
 * Get user info from ID (checks both User and Student collections)
 */
const getUserInfo = async (userId) => {
    let user = await User.findById(userId).select("name email avatar role");
    if (user) return { user, model: "User" };

    const student = await Student.findById(userId).select("name email avatar");
    if (student) return { user: { ...student.toObject(), role: "student" }, model: "Student" };

    return null;
};

/* ======================================================
   GET ALL CONVERSATIONS
   GET /api/chat/conversations
====================================================== */
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.id;

        const conversations = await Conversation.find({
            participants: userId,
            isActive: true,
        })
            .sort({ lastMessageAt: -1 })
            .lean();

        // Populate participant info manually (since we have mixed models)
        const populatedConversations = await Promise.all(
            conversations.map(async (conv) => {
                const otherParticipantId = conv.participants.find(
                    (p) => p.toString() !== userId
                );
                const otherInfo = await getUserInfo(otherParticipantId);

                return {
                    _id: conv._id,
                    otherParticipant: otherInfo?.user || { name: "Unknown" },
                    lastMessage: conv.lastMessage,
                    lastMessageAt: conv.lastMessageAt,
                    unreadCount: conv.unreadCount?.get?.(userId) || conv.unreadCount?.[userId] || 0,
                    createdAt: conv.createdAt,
                };
            })
        );

        res.json({ conversations: populatedConversations });
    } catch (err) {
        console.error("Get Conversations Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   START OR GET EXISTING CONVERSATION
   POST /api/chat/conversations
   Body: { targetUserId }
====================================================== */
exports.startConversation = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role || "student";
        const { targetUserId } = req.body;

        if (!targetUserId) {
            return res.status(400).json({ message: "Target user ID required" });
        }

        if (targetUserId === userId) {
            return res.status(400).json({ message: "Cannot start conversation with yourself" });
        }

        // Get target user info
        const targetInfo = await getUserInfo(targetUserId);
        if (!targetInfo) {
            return res.status(404).json({ message: "Target user not found" });
        }

        const targetRole = targetInfo.user.role;

        // Validate chat permission (async for reviewer-student approval check)
        const canChat = await canUsersChat(userRole, targetRole, userId, targetUserId);
        if (!canChat) {
            // Provide helpful message for reviewer-student case
            if ((userRole === "reviewer" && targetRole === "student") || (userRole === "student" && targetRole === "reviewer")) {
                return res.status(403).json({
                    message: "Chat with this user requires advisor approval. Please request permission first.",
                });
            }
            return res.status(403).json({
                message: `${userRole} cannot chat with ${targetRole}`,
            });
        }

        // Check for existing conversation
        let conversation = await Conversation.findBetweenUsers(userId, targetUserId);

        if (conversation) {
            return res.json({
                conversation: {
                    _id: conversation._id,
                    otherParticipant: targetInfo.user,
                    isNew: false,
                },
            });
        }

        // Get current user info
        const currentInfo = await getUserInfo(userId);

        if (!currentInfo) {
            console.error("Could not find current user info for:", userId);
            return res.status(500).json({ message: "Could not verify your user profile" });
        }

        // Create new conversation
        conversation = await Conversation.create({
            participants: [userId, targetUserId],
            participantModels: [currentInfo.model, targetInfo.model],
            participantRoles: [userRole, targetRole],
            createdBy: userId,
        });

        res.status(201).json({
            conversation: {
                _id: conversation._id,
                otherParticipant: targetInfo.user,
                isNew: true,
            },
        });
    } catch (err) {
        console.error("Start Conversation Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   GET CONVERSATION MESSAGES
   GET /api/chat/:conversationId/messages
   Query: ?page=1&limit=50
====================================================== */
exports.getMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        // Verify user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        const isParticipant = conversation.participants.some(
            (p) => p.toString() === userId
        );
        if (!isParticipant) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const messages = await ChatMessage.getConversationMessages(
            conversationId,
            page,
            limit
        );

        // Get total count for pagination
        const total = await ChatMessage.countDocuments({
            conversationId,
            isDeleted: false,
        });

        res.json({
            messages,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("Get Messages Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   GET REVIEW SESSION MESSAGES
   GET /api/chat/review/:reviewSessionId/messages
====================================================== */
exports.getReviewMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reviewSessionId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        // Verify user is participant in review
        const review = await ReviewSession.findById(reviewSessionId);
        if (!review) {
            return res.status(404).json({ message: "Review session not found" });
        }

        const participantIds = [
            review.student?.toString(),
            review.reviewer?.toString(),
            review.advisor?.toString(),
        ];

        if (!participantIds.includes(userId)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const messages = await ChatMessage.getReviewMessages(
            reviewSessionId,
            page,
            limit
        );

        const total = await ChatMessage.countDocuments({
            reviewSessionId,
            isDeleted: false,
        });

        res.json({
            messages,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("Get Review Messages Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   MARK CONVERSATION AS READ
   POST /api/chat/:conversationId/read
====================================================== */
exports.markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;

        // Mark messages as read
        await ChatMessage.updateMany(
            { conversationId, senderId: { $ne: userId }, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        // Reset unread count
        await Conversation.findByIdAndUpdate(conversationId, {
            [`unreadCount.${userId}`]: 0,
        });

        res.json({ success: true });
    } catch (err) {
        console.error("Mark As Read Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   GET SUGGESTED CONTACTS
   GET /api/chat/contacts
   Returns users the current user can chat with
====================================================== */
exports.getContacts = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let contacts = [];

        if (userRole === "advisor") {
            // Advisor sees their assigned students
            const students = await Student.find({ advisorId: userId, status: "active" })
                .select("name email avatar")
                .lean();

            contacts = students.map(s => ({
                ...s,
                role: "student",
                model: "Student",
            }));

            // Also get reviewers they've worked with
            const reviewSessions = await ReviewSession.find({ advisor: userId })
                .distinct("reviewer");

            if (reviewSessions.length > 0) {
                const reviewers = await User.find({
                    _id: { $in: reviewSessions },
                    status: "active"
                }).select("name email avatar role").lean();

                contacts = [...contacts, ...reviewers.map(r => ({ ...r, model: "User" }))];
            }
        } else if (userRole === "student") {
            // Student sees their advisor
            const student = await Student.findById(userId).populate("advisorId", "name email avatar role");
            if (student?.advisorId) {
                contacts.push({
                    ...student.advisorId.toObject(),
                    model: "User",
                });
            }

            // Get reviewers with approved chat requests
            const approvedRequests = await ChatRequest.find({
                studentId: userId,
                status: "approved"
            }).populate("reviewerId", "name email avatar role");

            approvedRequests.forEach(req => {
                if (req.reviewerId) {
                    contacts.push({
                        ...req.reviewerId.toObject(),
                        model: "User",
                        chatApproved: true,
                    });
                }
            });

            // Get reviewers from review sessions (for requesting chat)
            const sessions = await ReviewSession.find({
                student: userId,
                status: { $in: ["pending", "scheduled", "accepted", "completed"] }
            }).populate("reviewer", "name email avatar role");

            const existingReviewerIds = approvedRequests.map(r => r.reviewerId?._id?.toString());
            sessions.forEach(session => {
                if (session.reviewer && !existingReviewerIds.includes(session.reviewer._id.toString())) {
                    contacts.push({
                        ...session.reviewer.toObject(),
                        model: "User",
                        canRequestChat: true,
                    });
                }
            });
        } else if (userRole === "reviewer") {
            // Reviewer sees advisors they've worked with
            const sessions = await ReviewSession.find({ reviewer: userId })
                .populate("advisor", "name email avatar role");

            const advisorMap = new Map();
            sessions.forEach(s => {
                if (s.advisor && !advisorMap.has(s.advisor._id.toString())) {
                    advisorMap.set(s.advisor._id.toString(), {
                        ...s.advisor.toObject(),
                        model: "User",
                    });
                }
            });
            contacts = [...advisorMap.values()];

            // Get students with approved chat requests
            const approvedRequests = await ChatRequest.find({
                reviewerId: userId,
                status: "approved"
            }).populate("studentId", "name email avatar");

            approvedRequests.forEach(req => {
                if (req.studentId) {
                    contacts.push({
                        ...req.studentId.toObject(),
                        role: "student",
                        model: "Student",
                        chatApproved: true,
                    });
                }
            });
        }

        // Remove duplicates by ID
        const uniqueContacts = [];
        const seenIds = new Set();
        contacts.forEach(c => {
            if (!seenIds.has(c._id.toString())) {
                seenIds.add(c._id.toString());
                uniqueContacts.push(c);
            }
        });

        res.json({ contacts: uniqueContacts });
    } catch (err) {
        console.error("Get Contacts Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   CREATE CHAT REQUEST
   POST /api/chat/request
   Student requests permission to chat with a reviewer
====================================================== */
exports.createChatRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { reviewerId, reason } = req.body;

        if (userRole !== "student") {
            return res.status(403).json({ message: "Only students can request chat with reviewers" });
        }

        if (!reviewerId) {
            return res.status(400).json({ message: "Reviewer ID required" });
        }

        // Verify reviewer exists
        const reviewer = await User.findById(reviewerId);
        if (!reviewer || reviewer.role !== "reviewer") {
            return res.status(404).json({ message: "Reviewer not found" });
        }

        // Get student's advisor
        const student = await Student.findById(userId);
        if (!student || !student.advisorId) {
            return res.status(400).json({ message: "Student advisor not found" });
        }

        // Check if already approved
        const existingApproved = await ChatRequest.findOne({
            studentId: userId,
            reviewerId,
            status: "approved",
        });
        if (existingApproved) {
            return res.status(400).json({ message: "Chat already approved with this reviewer" });
        }

        // Check if pending request exists
        const existingPending = await ChatRequest.findOne({
            studentId: userId,
            reviewerId,
            status: "pending",
        });
        if (existingPending) {
            return res.status(400).json({ message: "A pending request already exists" });
        }

        // Create request
        const chatRequest = await ChatRequest.create({
            studentId: userId,
            reviewerId,
            advisorId: student.advisorId,
            reason: reason || "Student requested to chat with reviewer",
        });

        res.status(201).json({
            message: "Chat request submitted. Waiting for advisor approval.",
            request: chatRequest
        });
    } catch (err) {
        console.error("Create Chat Request Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   GET CHAT REQUESTS (FOR ADVISOR)
   GET /api/chat/requests
====================================================== */
exports.getChatRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { status } = req.query;

        if (userRole !== "advisor") {
            return res.status(403).json({ message: "Only advisors can view chat requests" });
        }

        const query = { advisorId: userId };
        if (status) query.status = status;

        const requests = await ChatRequest.find(query)
            .populate("studentId", "name email avatar")
            .populate("reviewerId", "name email avatar")
            .sort({ createdAt: -1 });

        res.json({ requests });
    } catch (err) {
        console.error("Get Chat Requests Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   APPROVE CHAT REQUEST
   PATCH /api/chat/request/:id/approve
====================================================== */
exports.approveChatRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { id } = req.params;

        if (userRole !== "advisor") {
            return res.status(403).json({ message: "Only advisors can approve chat requests" });
        }

        const chatRequest = await ChatRequest.findOne({ _id: id, advisorId: userId });
        if (!chatRequest) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (chatRequest.status !== "pending") {
            return res.status(400).json({ message: `Request already ${chatRequest.status}` });
        }

        chatRequest.status = "approved";
        chatRequest.respondedAt = new Date();
        await chatRequest.save();

        res.json({ message: "Chat request approved", request: chatRequest });
    } catch (err) {
        console.error("Approve Chat Request Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   REJECT CHAT REQUEST
   PATCH /api/chat/request/:id/reject
====================================================== */
exports.rejectChatRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { id } = req.params;
        const { rejectionReason } = req.body;

        if (userRole !== "advisor") {
            return res.status(403).json({ message: "Only advisors can reject chat requests" });
        }

        const chatRequest = await ChatRequest.findOne({ _id: id, advisorId: userId });
        if (!chatRequest) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (chatRequest.status !== "pending") {
            return res.status(400).json({ message: `Request already ${chatRequest.status}` });
        }

        chatRequest.status = "rejected";
        chatRequest.rejectionReason = rejectionReason;
        chatRequest.respondedAt = new Date();
        await chatRequest.save();

        res.json({ message: "Chat request rejected", request: chatRequest });
    } catch (err) {
        console.error("Reject Chat Request Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
