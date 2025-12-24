const ReviewSession = require("./reviewSession");
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
      .populate("reviewer", "name email domain")
      .sort({ scheduledAt: -1 });

    // Format response for frontend
    const formattedReviews = reviews.map(r => ({
      id: r._id,
      student: r.student?.name || "Unknown",
      studentEmail: r.student?.email || "",
      reviewer: r.reviewer?.name || "Unknown",
      reviewerEmail: r.reviewer?.email || "",
      domain: r.reviewer?.domain || "General",
      date: new Date(r.scheduledAt).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric"
      }),
      time: new Date(r.scheduledAt).toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit"
      }),
      scheduledAt: r.scheduledAt,
      week: r.week,
      status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
      mode: r.mode,
      meetingLink: r.meetingLink,
      location: r.location,
      marks: r.marks,
      feedback: r.feedback,
    }));

    res.status(200).json({ reviews: formattedReviews });
  } catch (err) {
    console.error("Advisor Reviews Error:", err);
    res.status(500).json({ message: "Failed to fetch advisor reviews" });
  }
};

/* ======================================================
   GET SINGLE REVIEW – ADVISOR
====================================================== */
exports.getSingleReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const advisorId = req.user.id;

    const review = await ReviewSession.findOne({
      _id: reviewId,
      advisor: advisorId,
    })
      .populate("student", "name email")
      .populate("reviewer", "name email domain");

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.status(200).json({
      review: {
        id: review._id,
        student: review.student?.name || "Unknown",
        studentEmail: review.student?.email || "",
        reviewer: review.reviewer?.name || "Unknown",
        reviewerEmail: review.reviewer?.email || "",
        domain: review.reviewer?.domain || "General",
        scheduledAt: review.scheduledAt,
        week: review.week,
        status: review.status,
        mode: review.mode,
        meetingLink: review.meetingLink,
        location: review.location,
        marks: review.marks,
        feedback: review.feedback,
      }
    });
  } catch (err) {
    console.error("Get Single Review Error:", err);
    res.status(500).json({ message: "Failed to fetch review" });
  }
};

/* ======================================================
   RESCHEDULE REVIEW – ADVISOR
====================================================== */
exports.rescheduleReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const advisorId = req.user.id;
    const { scheduledAt, notifyParticipants } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ message: "New date/time is required" });
    }

    const review = await ReviewSession.findOne({
      _id: reviewId,
      advisor: advisorId,
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.status === "completed" || review.status === "cancelled") {
      return res.status(400).json({
        message: `Cannot reschedule a ${review.status} review`
      });
    }

    review.scheduledAt = new Date(scheduledAt);
    review.status = "scheduled";
    await review.save();

    // TODO: Send notifications if notifyParticipants is true

    res.status(200).json({
      message: "Review rescheduled successfully",
      review: {
        id: review._id,
        scheduledAt: review.scheduledAt,
        status: review.status,
      }
    });
  } catch (err) {
    console.error("Reschedule Review Error:", err);
    res.status(500).json({ message: "Failed to reschedule review" });
  }
};

/* ======================================================
   CANCEL REVIEW – ADVISOR
====================================================== */
exports.cancelReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const advisorId = req.user.id;
    const { reason, notifyParticipants } = req.body;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ message: "Cancellation reason is required" });
    }

    const review = await ReviewSession.findOne({
      _id: reviewId,
      advisor: advisorId,
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.status === "completed") {
      return res.status(400).json({
        message: "Cannot cancel a completed review"
      });
    }

    if (review.status === "cancelled") {
      return res.status(400).json({
        message: "Review is already cancelled"
      });
    }

    review.status = "cancelled";
    review.feedback = `Cancelled: ${reason}`;
    await review.save();

    // TODO: Send notifications if notifyParticipants is true

    res.status(200).json({
      message: "Review cancelled successfully",
      reviewId: review._id,
    });
  } catch (err) {
    console.error("Cancel Review Error:", err);
    res.status(500).json({ message: "Failed to cancel review" });
  }
};


