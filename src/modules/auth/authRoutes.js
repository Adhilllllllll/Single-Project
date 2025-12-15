const router = require("express").Router();
const authController = require("./authController");

// Auth routes
router.post("/login", authController.login);
router.post("/change-password", authController.changePassword);

module.exports = router;
