const Conversation = require("./Conversation");
const ChatMessage = require("./ChatMessage");
const ChatRequest = require("./ChatRequest");
const User = require("../users/User");
const Student = require("../students/student");
const ReviewSession = require("../reviews/reviewSession");

// === NOTIFICATION SERVICE ===
// Fire-and-forget notification triggers for chat events
const {
    notifyChatRequestCreated,
    notifyChatRequestApproved,
    notifyChatRequestRejected,
} = require("../notifications/notification.service");

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
   
   REFACTORED: N+1 Fix
   - REMOVED: Promise.all + map with async getUserInfo calls (N+1 queries)
   - ADDED: Single aggregation with $lookup to both users and students
   - All participant resolution now happens at DB level
====================================================== */
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const userObjectId = new (require("mongoose").Types.ObjectId)(userId);

        // === SINGLE AGGREGATION - REPLACES N+1 PATTERN ===
        // Previously: conversations.map(async (conv) => { await getUserInfo(...) })
        // Now: All lookups happen in one pipeline
        const conversations = await Conversation.aggregate([
            // Stage 1: Match user's active conversations
            { $match: { participants: userObjectId, isActive: true } },

            // Stage 2: Sort by last message (Replaces: .sort({ lastMessageAt: -1 }))
            { $sort: { lastMessageAt: -1 } },

            // Stage 3: Extract other participant ID
            // Replaces: conv.participants.find(p => p.toString() !== userId)
            {
                $addFields: {
                    otherParticipantId: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$participants",
                                    cond: { $ne: ["$$this", userObjectId] },
                                },
                            },
                            0,
                        ],
                    },
                    // Extract unread count for current user from Map
                    // Replaces: conv.unreadCount?.get?.(userId) || conv.unreadCount?.[userId] || 0
                    userUnreadCount: {
                        $ifNull: [{ $getField: { field: userId, input: "$unreadCount" } }, 0],
                    },
                },
            },

            // Stage 4: Lookup from Users collection
            // Replaces: await User.findById(otherParticipantId)
            {
                $lookup: {
                    from: "users",
                    localField: "otherParticipantId",
                    foreignField: "_id",
                    as: "userInfo",
                },
            },

            // Stage 5: Lookup from Students collection (for mixed models)
            // Replaces: await Student.findById(otherParticipantId)
            {
                $lookup: {
                    from: "students",
                    localField: "otherParticipantId",
                    foreignField: "_id",
                    as: "studentInfo",
                },
            },

            // Stage 6: Merge user/student info and project final shape
            // Replaces: getUserInfo() return object
            {
                $project: {
                    _id: 1,
                    otherParticipant: {
                        $cond: {
                            if: { $gt: [{ $size: "$userInfo" }, 0] },
                            then: {
                                _id: { $arrayElemAt: ["$userInfo._id", 0] },
                                name: { $arrayElemAt: ["$userInfo.name", 0] },
                                email: { $arrayElemAt: ["$userInfo.email", 0] },
                                avatar: { $arrayElemAt: ["$userInfo.avatar", 0] },
                                role: { $arrayElemAt: ["$userInfo.role", 0] },
                            },
                            else: {
                                $cond: {
                                    if: { $gt: [{ $size: "$studentInfo" }, 0] },
                                    then: {
                                        _id: { $arrayElemAt: ["$studentInfo._id", 0] },
                                        name: { $arrayElemAt: ["$studentInfo.name", 0] },
                                        email: { $arrayElemAt: ["$studentInfo.email", 0] },
                                        avatar: { $arrayElemAt: ["$studentInfo.avatar", 0] },
                                        role: { $literal: "student" },
                                    },
                                    else: { name: "Unknown" },
                                },
                            },
                        },
                    },
                    lastMessage: 1,
                    lastMessageAt: 1,
                    unreadCount: "$userUnreadCount",
                    createdAt: 1,
                },
            },
        ]);

        res.json({ conversations });
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
   
   REFACTORED: High-Traffic Optimization
   - REMOVED: JS map for transformation
   - REMOVED: JS forEach for iteration  
   - REMOVED: JS Set for deduplication (replaced with $group)
   - ADDED: Role-based aggregations with $lookup and $project
   - ADDED: $group for duplicate removal at DB level
====================================================== */
exports.getContacts = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const userObjectId = new (require("mongoose").Types.ObjectId)(userId);

        let contacts = [];

        if (userRole === "advisor") {
            // === ADVISOR CONTACTS ===
            // Replaces: students.map(s => ({ ...s, role: "student" }))
            // Replaces: [...contacts, ...reviewers.map(...)]

            // Get students with $project transformation
            const students = await Student.aggregate([
                { $match: { advisorId: userObjectId, status: "active" } },
                {
                    $project: {
                        name: 1,
                        email: 1,
                        avatar: 1,
                        role: { $literal: "student" },
                        model: { $literal: "Student" },
                    },
                },
            ]);

            // Get unique reviewers from review sessions
            // Replaces: ReviewSession.find().distinct() + User.find()
            const reviewers = await ReviewSession.aggregate([
                { $match: { advisor: userObjectId } },
                { $group: { _id: "$reviewer" } }, // Unique reviewer IDs
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "reviewerInfo",
                    },
                },
                { $unwind: "$reviewerInfo" },
                { $match: { "reviewerInfo.status": "active" } },
                {
                    $project: {
                        _id: "$reviewerInfo._id",
                        name: "$reviewerInfo.name",
                        email: "$reviewerInfo.email",
                        avatar: "$reviewerInfo.avatar",
                        role: "$reviewerInfo.role",
                        model: { $literal: "User" },
                    },
                },
            ]);

            contacts = [...students, ...reviewers];

        } else if (userRole === "student") {
            // === STUDENT CONTACTS ===
            // Get advisor via $lookup
            const studentWithAdvisor = await Student.aggregate([
                { $match: { _id: userObjectId } },
                {
                    $lookup: {
                        from: "users",
                        localField: "advisorId",
                        foreignField: "_id",
                        as: "advisorInfo",
                    },
                },
                { $unwind: { path: "$advisorInfo", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        advisor: {
                            _id: "$advisorInfo._id",
                            name: "$advisorInfo.name",
                            email: "$advisorInfo.email",
                            avatar: "$advisorInfo.avatar",
                            role: "$advisorInfo.role",
                            model: { $literal: "User" },
                        },
                    },
                },
            ]);

            if (studentWithAdvisor[0]?.advisor?._id) {
                contacts.push(studentWithAdvisor[0].advisor);
            }

            // Get approved reviewers via aggregation
            // Replaces: approvedRequests.forEach(req => { contacts.push(...) })
            const approvedReviewers = await ChatRequest.aggregate([
                { $match: { studentId: userObjectId, status: "approved" } },
                {
                    $lookup: {
                        from: "users",
                        localField: "reviewerId",
                        foreignField: "_id",
                        as: "reviewerInfo",
                    },
                },
                { $unwind: "$reviewerInfo" },
                {
                    $project: {
                        _id: "$reviewerInfo._id",
                        name: "$reviewerInfo.name",
                        email: "$reviewerInfo.email",
                        avatar: "$reviewerInfo.avatar",
                        role: "$reviewerInfo.role",
                        model: { $literal: "User" },
                        chatApproved: { $literal: true },
                    },
                },
            ]);

            contacts = [...contacts, ...approvedReviewers];
            const approvedReviewerIds = approvedReviewers.map(r => r._id.toString());

            // Get reviewers from sessions (for chat request)
            // Replaces: sessions.forEach with includes check
            const sessionReviewers = await ReviewSession.aggregate([
                {
                    $match: {
                        student: userObjectId,
                        status: { $in: ["pending", "scheduled", "accepted", "completed"] },
                    },
                },
                { $group: { _id: "$reviewer" } }, // Deduplicate
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "reviewerInfo",
                    },
                },
                { $unwind: "$reviewerInfo" },
                {
                    $project: {
                        _id: "$reviewerInfo._id",
                        name: "$reviewerInfo.name",
                        email: "$reviewerInfo.email",
                        avatar: "$reviewerInfo.avatar",
                        role: "$reviewerInfo.role",
                        model: { $literal: "User" },
                        canRequestChat: { $literal: true },
                    },
                },
            ]);

            // Filter out already approved reviewers (this check stays in JS for accuracy)
            sessionReviewers.forEach(reviewer => {
                if (!approvedReviewerIds.includes(reviewer._id.toString())) {
                    contacts.push(reviewer);
                }
            });

        } else if (userRole === "reviewer") {
            // === REVIEWER CONTACTS ===
            // Get unique advisors using $group (Replaces: Map-based deduplication)
            const advisors = await ReviewSession.aggregate([
                { $match: { reviewer: userObjectId } },
                { $group: { _id: "$advisor" } }, // Replaces: advisorMap.has() check
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "advisorInfo",
                    },
                },
                { $unwind: "$advisorInfo" },
                {
                    $project: {
                        _id: "$advisorInfo._id",
                        name: "$advisorInfo.name",
                        email: "$advisorInfo.email",
                        avatar: "$advisorInfo.avatar",
                        role: "$advisorInfo.role",
                        model: { $literal: "User" },
                    },
                },
            ]);

            contacts = [...advisors];

            // Get approved students
            // Replaces: approvedRequests.forEach(...)
            const approvedStudents = await ChatRequest.aggregate([
                { $match: { reviewerId: userObjectId, status: "approved" } },
                {
                    $lookup: {
                        from: "students",
                        localField: "studentId",
                        foreignField: "_id",
                        as: "studentInfo",
                    },
                },
                { $unwind: "$studentInfo" },
                {
                    $project: {
                        _id: "$studentInfo._id",
                        name: "$studentInfo.name",
                        email: "$studentInfo.email",
                        avatar: "$studentInfo.avatar",
                        role: { $literal: "student" },
                        model: { $literal: "Student" },
                        chatApproved: { $literal: true },
                    },
                },
            ]);

            contacts = [...contacts, ...approvedStudents];
        }

        // === FINAL DEDUPLICATION ===
        // Still needed for cross-source merges (advisor+reviewer from different queries)
        // Replaces: Set-based deduplication
        const uniqueContacts = [];
        const seenIds = new Set();
        contacts.forEach(c => {
            const id = c._id.toString();
            if (!seenIds.has(id)) {
                seenIds.add(id);
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

        // === NOTIFICATION: Notify advisor of new chat request ===
        // Fire-and-forget: don't await, don't block response
        notifyChatRequestCreated({
            advisorId: student.advisorId,
            studentName: student.name,
            reviewerName: reviewer.name,
            requestId: chatRequest._id,
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
   
   REFACTORED: Atomic Operation
   - REMOVED: findOne → status check → mutate → save (race-prone)
   - ADDED: findOneAndUpdate with status condition in query (atomic)
====================================================== */
exports.approveChatRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { id } = req.params;

        if (userRole !== "advisor") {
            return res.status(403).json({ message: "Only advisors can approve chat requests" });
        }

        // === ATOMIC UPDATE ===
        // Replaces: findOne → check status → modify → save
        // The status: "pending" in query ensures we only update pending requests
        const chatRequest = await ChatRequest.findOneAndUpdate(
            { _id: id, advisorId: userId, status: "pending" },
            { status: "approved", respondedAt: new Date() },
            { new: true }
        );

        if (!chatRequest) {
            // Could be: not found, not owner, or already processed
            const existing = await ChatRequest.findOne({ _id: id, advisorId: userId });
            if (!existing) {
                return res.status(404).json({ message: "Request not found" });
            }
            return res.status(400).json({ message: `Request already ${existing.status}` });
        }

        // === NOTIFICATION: Notify student and reviewer of approval ===
        // Fire-and-forget: async notification, don't block response
        notifyChatRequestApproved({
            studentId: chatRequest.studentId,
            reviewerId: chatRequest.reviewerId,
            studentName: "", // Will be looked up in service if needed
            reviewerName: "",
            requestId: chatRequest._id,
        });

        res.json({ message: "Chat request approved", request: chatRequest });
    } catch (err) {
        console.error("Approve Chat Request Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   REJECT CHAT REQUEST
   PATCH /api/chat/request/:id/reject
   
   REFACTORED: Atomic Operation
   - REMOVED: findOne → status check → mutate → save (race-prone)
   - ADDED: findOneAndUpdate with status condition (atomic)
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

        // === ATOMIC UPDATE ===
        // Replaces: findOne → check status → modify → save
        const chatRequest = await ChatRequest.findOneAndUpdate(
            { _id: id, advisorId: userId, status: "pending" },
            {
                status: "rejected",
                rejectionReason: rejectionReason,
                respondedAt: new Date()
            },
            { new: true }
        );

        if (!chatRequest) {
            const existing = await ChatRequest.findOne({ _id: id, advisorId: userId });
            if (!existing) {
                return res.status(404).json({ message: "Request not found" });
            }
            return res.status(400).json({ message: `Request already ${existing.status}` });
        }

        // === NOTIFICATION: Notify student of rejection ===
        // Fire-and-forget: async notification, don't block response
        notifyChatRequestRejected({
            studentId: chatRequest.studentId,
            reviewerName: "", // Will be looked up if needed
            reason: rejectionReason,
            requestId: chatRequest._id,
        });

        res.json({ message: "Chat request rejected", request: chatRequest });
    } catch (err) {
        console.error("Reject Chat Request Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
