const ReviewSession = require("../reviewSession");
const Student = require("../students/student");
const User = require("../users/User");
const mongoose = require("mongoose");


/* ======================================================
   CREATE REVIEW (ADVISOR ONLY)
====================================================== */
exports.createReview = async (req, res) => {
    try {
        const advisorId = req.user.id;

        const {
            studentId,
            reviewerId,
            week,
            scheduledAt,
            mode,
            meetingLink,
            location,
        } = req.body;

        // Basic validation
        if (!studentId || !reviewerId || !week || !scheduledAt || !mode) {
            return res.status(400).json({
                message: "Missing required fields",
            });
        }

        if (!["online", "offline"].includes(mode)) {
            return res.status(400).json({
                message: "Invalid review mode",
            });
        }

        // Verify student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Ensure advisor owns the student
        if (student.advisorId.toString() !== advisorId) {
            return res.status(403).json({
                message: "You are not assigned as this student's advisor",
            });
        }

        // Verify reviewer
        const reviewer = await User.findOne({
            _id: reviewerId,
            role: "reviewer",
            status: "active",
        });

        if (!reviewer) {
            return res.status(404).json({ message: "Reviewer not found" });
        }

        const review = await ReviewSession.create({
            student: studentId,
            advisor: advisorId,
            reviewer: reviewerId,
            week,
            scheduledAt: new Date(scheduledAt),
            mode,
            meetingLink: mode === "online" ? meetingLink : null,
            location: mode === "offline" ? location : null,
        });

        return res.status(201).json({
            message: "Review scheduled successfully",
            review,
        });
    } catch (err) {
        console.error("Create Review Error:", err);
        res.status(500).json({
            message: "Failed to create review",
        });
    }
};

/* ======================================================
   GET REVIEWS – REVIEWER
====================================================== */
exports.getMyReviewerReviews = async (req, res) => {
  try {
    const reviews = await ReviewSession.find({
      reviewer: new mongoose.Types.ObjectId(req.user.id),
    })
      .populate("student", "name email")
      .populate("advisor", "name email")
      .sort({ scheduledAt: 1 });

    res.status(200).json(reviews);
  } catch (err) {
    console.error("Reviewer Reviews Error:", err);
    res.status(500).json({ message: "Failed to fetch reviewer reviews" });
  }
};

/* ======================================================
   GET REVIEWS – ADVISOR
====================================================== */
exports.getMyAdvisorReviews = async (req, res) => {
  try {
    const reviews = await ReviewSession.find({
      advisor: new mongoose.Types.ObjectId(req.user.id),
    })
      .populate("student", "name email")
      .populate("reviewer", "name email")
      .sort({ scheduledAt: 1 });

    res.status(200).json(reviews);
  } catch (err) {
    console.error("Advisor Reviews Error:", err);
    res.status(500).json({ message: "Failed to fetch advisor reviews" });
  }
};

