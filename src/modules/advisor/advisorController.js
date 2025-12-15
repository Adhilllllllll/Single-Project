const User = require("../users/User");

/**
 * GET /api/advisor/me
 * Logged-in advisor profile
 */
exports.getMyProfile = async (req, res) => {
  try {
    const advisorId = req.user.id;

    const advisor = await User.findById(advisorId).select("-passwordHash");

    if (!advisor) {
      return res.status(404).json({ message: "Advisor not found" });
    }

    return res.json({
      message: "Advisor profile fetched",
      advisor,
    });
  } catch (err) {
    console.error("GET ADVISOR PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/advisor/dashboard
 * Placeholder dashboard
 */
exports.getDashboard = async (req, res) => {
  try {
    return res.json({
      message: "Advisor dashboard data",
      stats: {
        totalStudents: 0,
        totalReviews: 0,
        pendingReviews: 0,
      },
    });
  } catch (err) {
    console.error("ADVISOR DASHBOARD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
