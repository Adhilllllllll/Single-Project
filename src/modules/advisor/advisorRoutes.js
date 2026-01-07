const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const advisorController = require("./advisorController");
const notesTemplatesController = require("./notesTemplatesController");
const { uploadAvatar, uploadMaterial } = require("../../middlewares/upload");

// Advisor-only routes
router.get(
  "/me",
  authMiddleware("advisor"),
  advisorController.getMyProfile
);

// Update advisor profile (with optional avatar upload)
router.put(
  "/me",
  authMiddleware("advisor"),
  uploadAvatar.single("avatar"),
  advisorController.updateMyProfile
);

router.get(
  "/dashboard",
  authMiddleware("advisor"),
  advisorController.getDashboard
);

// Get students assigned to this advisor
router.get(
  "/students",
  authMiddleware("advisor"),
  advisorController.getAssignedStudents
);

// Get single student profile
router.get(
  "/students/:studentId",
  authMiddleware("advisor"),
  advisorController.getStudentProfile
);

// Get all reviewers with their availability slots
router.get(
  "/reviewers/availability",
  authMiddleware("advisor"),
  advisorController.getReviewersWithAvailability
);

// Get comprehensive analytics data
router.get(
  "/analytics",
  authMiddleware("advisor"),
  advisorController.getAnalytics
);

/* ======================================================
   NOTES ROUTES
====================================================== */
router.get(
  "/notes",
  authMiddleware("advisor"),
  notesTemplatesController.getNotes
);

router.post(
  "/notes",
  authMiddleware("advisor"),
  uploadMaterial.single("attachment"),
  notesTemplatesController.createNote
);

router.put(
  "/notes/:id",
  authMiddleware("advisor"),
  uploadMaterial.single("attachment"),
  notesTemplatesController.updateNote
);

router.delete(
  "/notes/:id",
  authMiddleware("advisor"),
  notesTemplatesController.deleteNote
);

/* ======================================================
   TEMPLATES ROUTES
====================================================== */
router.get(
  "/templates",
  authMiddleware("advisor"),
  notesTemplatesController.getTemplates
);

router.post(
  "/templates",
  authMiddleware("advisor"),
  notesTemplatesController.createTemplate
);

router.put(
  "/templates/:id",
  authMiddleware("advisor"),
  notesTemplatesController.updateTemplate
);

router.delete(
  "/templates/:id",
  authMiddleware("advisor"),
  notesTemplatesController.deleteTemplate
);

module.exports = router;

