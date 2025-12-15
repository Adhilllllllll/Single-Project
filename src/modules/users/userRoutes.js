const router = require("express").Router();
const userController = require("./userController");
const authMiddleware = require("../../middlewares/authMiddleware");

// Admin-only routes
router.post("/create", authMiddleware("admin"), userController.createUser);
router.post(
  "/resend-credentials",
  authMiddleware("admin"),
  userController.resendCredentials
);

module.exports = router;
