const router = require("express").Router();
const chatController = require("./chatController");
const authMiddleware = require("../../middlewares/authMiddleware");

// All routes require authentication (any role)
const auth = authMiddleware(["admin", "advisor", "reviewer", "student"]);
const advisorAuth = authMiddleware("advisor");
const studentAuth = authMiddleware("student");

/* ======================================================
   CONTACTS ROUTES
====================================================== */

// Get suggested contacts for current user
router.get("/contacts", auth, chatController.getContacts);

/* ======================================================
   CHAT REQUEST ROUTES (Reviewer-Student approval)
====================================================== */

// Student requests chat with reviewer
router.post("/request", studentAuth, chatController.createChatRequest);

// Advisor views pending/all chat requests
router.get("/requests", advisorAuth, chatController.getChatRequests);

// Advisor approves a chat request
router.patch("/request/:id/approve", advisorAuth, chatController.approveChatRequest);

// Advisor rejects a chat request
router.patch("/request/:id/reject", advisorAuth, chatController.rejectChatRequest);

/* ======================================================
   CONVERSATION ROUTES
====================================================== */

// Get all conversations for current user
router.get("/conversations", auth, chatController.getConversations);

// Start or get existing conversation with a user
router.post("/conversations", auth, chatController.startConversation);

// Get messages for a conversation
router.get("/:conversationId/messages", auth, chatController.getMessages);

// Mark conversation as read
router.post("/:conversationId/read", auth, chatController.markAsRead);

/* ======================================================
   REVIEW SESSION CHAT ROUTES
====================================================== */

// Get messages for a review session chat
router.get("/review/:reviewSessionId/messages", auth, chatController.getReviewMessages);

module.exports = router;

