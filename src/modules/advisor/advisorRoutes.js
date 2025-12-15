const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const advisorController = require("./advisorController");

// Advisor-only routes
router.get(
  "/me",
  authMiddleware("advisor"),
  advisorController.getMyProfile
);

router.get(
  "/dashboard",
  authMiddleware("advisor"),
  advisorController.getDashboard
);

module.exports = router;
