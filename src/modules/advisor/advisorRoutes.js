const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const advisorController = require("./advisorController");
const { uploadAvatar } = require("../../middlewares/upload");

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

module.exports = router;
