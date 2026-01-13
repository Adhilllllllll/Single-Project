const router = require("express").Router();
const userController = require("../users/userController")
const authController = require("./authController");
const authMiddleware = require("../../middlewares/authMiddleware");

// Auth routes
router.post("/login", authController.login);
router.post("/change-password", authMiddleware(), userController.changePassword);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

module.exports = router;

