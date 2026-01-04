const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const adminController = require("./adminController");

// Get admin profile
router.get(
  "/me",
  authMiddleware("admin"),
  adminController.getMyProfile
);

router.get(
  "/dashboard-counts",
  authMiddleware("admin"),
  adminController.getDashboardCounts
);

// Review statistics for Review Status page
router.get(
  "/review-stats",
  authMiddleware("admin"),
  adminController.getReviewStats
);

router.post(
  "/create-user",
  authMiddleware("admin"),
  adminController.createUser
);

/* =======================
   USER MANAGEMENT ROUTES
======================= */

// Get all users (with optional role filter)
router.get(
  "/users",
  authMiddleware("admin"),
  adminController.getAllUsers
);

// Get single user by ID
router.get(
  "/users/:id",
  authMiddleware("admin"),
  adminController.getUserById
);

// Update user
router.patch(
  "/users/:id",
  authMiddleware("admin"),
  adminController.updateUser
);

// Toggle user status (active/inactive)
router.patch(
  "/users/:id/status",
  authMiddleware("admin"),
  adminController.toggleUserStatus
);

// Delete user
router.delete(
  "/users/:id",
  authMiddleware("admin"),
  adminController.deleteUser
);

module.exports = router;

