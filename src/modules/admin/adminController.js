const User = require("../users/User");
const Student =require("../students/student")

exports.getDashboardCounts = async (req, res) => {
  try {
    const [students, reviewers, advisors] = await Promise.all([
      Student.countDocuments(),
      User.countDocuments({ role: "reviewer" }),
      User.countDocuments({ role: "advisor" }),
    ]);

    res.json({ students, reviewers, advisors });
  } catch (err) {
    console.error("Admin counts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
