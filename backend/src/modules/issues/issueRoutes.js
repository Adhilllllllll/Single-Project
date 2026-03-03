const router = require("express").Router();
const issueController = require("./issueController");
const authMiddleware = require("../../middlewares/authMiddleware");

// Auth middlewares
const studentAuth = authMiddleware("student");
const advisorOrAdminAuth = authMiddleware(["advisor", "admin"]);
const anyAuth = authMiddleware(["student", "advisor", "admin"]);

/* ======================================================
   STUDENT ROUTES
====================================================== */

// Submit new issue
router.post("/", studentAuth, issueController.createIssue);

// Get my submitted issues
router.get("/my", studentAuth, issueController.getMyIssues);

/* ======================================================
   ADVISOR/ADMIN ROUTES
====================================================== */

// Get issues assigned to me
router.get("/", advisorOrAdminAuth, issueController.getIssues);

// Respond to an issue
router.post("/:id/respond", advisorOrAdminAuth, issueController.respondToIssue);

// Update issue status
router.patch("/:id/status", advisorOrAdminAuth, issueController.updateIssueStatus);

/* ======================================================
   COMMON ROUTES
====================================================== */

// Get issue counts (for badges)
router.get("/counts", anyAuth, issueController.getIssueCounts);

// Get single issue by ID
router.get("/:id", anyAuth, issueController.getIssueById);

module.exports = router;
