// const router = require("express").Router();
// const userController = require("./userController");
// const authMiddleware = require("../../middlewares/authMiddleware");

// // Admin-only routes
// router.post("/create", authMiddleware("admin"), userController.createUser);
// router.post(
//   "/resend-credentials",
//   authMiddleware("admin"),
//   userController.resendCredentials
// );




// module.exports = router;

const router = require("express").Router();
const userController = require("./userController");
const authMiddleware = require("../../middlewares/authMiddleware");
const User = require("./User");

// Admin-only routes
router.post("/create", authMiddleware("admin"), userController.createUser);

// Get all advisors (for student creation dropdown)
router.get("/advisors", authMiddleware("admin"), async (req, res) => {
    try {
        const advisors = await User.find({ role: "advisor", status: "active" })
            .select("_id name email")
            .sort({ name: 1 });
        res.json(advisors);
    } catch (err) {
        console.error("Fetch advisors error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
