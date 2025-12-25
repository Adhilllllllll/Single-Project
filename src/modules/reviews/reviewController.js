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
    const { status } = req.query;

    // Build query
    const query = {
      reviewer: new mongoose.Types.ObjectId(req.user.id),
    };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    const reviews = await ReviewSession.find(query)
      .populate("student", "name email")
      .populate("advisor", "name email domain")
      .sort({ scheduledAt: -1 });

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

/* ======================================================
   ACCEPT REVIEW – REVIEWER
====================================================== */
exports.acceptReviewByReviewer = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { reviewId } = req.params;

    const review = await ReviewSession.findOne({
      _id: reviewId,
      reviewer: reviewerId,
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.status !== "pending") {
      return res.status(400).json({
        message: `Cannot accept a review with status: ${review.status}`,
      });
    }

    review.status = "accepted";
    await review.save();

    res.status(200).json({
      message: "Review accepted successfully",
      reviewId: review._id,
      status: review.status,
    });
  } catch (err) {
    console.error("Accept Review Error:", err);
    res.status(500).json({ message: "Failed to accept review" });
  }
};

/* ======================================================
   REJECT REVIEW – REVIEWER
====================================================== */
exports.rejectReviewByReviewer = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { reviewId } = req.params;
    const { reason } = req.body;

    const review = await ReviewSession.findOne({
      _id: reviewId,
      reviewer: reviewerId,
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.status !== "pending") {
      return res.status(400).json({
        message: `Cannot reject a review with status: ${review.status}`,
      });
    }

    review.status = "rejected";
    if (reason) {
      review.feedback = `Rejected: ${reason}`;
    }
    await review.save();

    res.status(200).json({
      message: "Review rejected successfully",
      reviewId: review._id,
      status: review.status,
    });
  } catch (err) {
    console.error("Reject Review Error:", err);
    res.status(500).json({ message: "Failed to reject review" });
  }
};

/* ======================================================
   GET SINGLE REVIEW – REVIEWER
====================================================== */
exports.getSingleReviewByReviewer = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { reviewId } = req.params;

    const review = await ReviewSession.findOne({
      _id: reviewId,
      reviewer: reviewerId,
    })
      .populate("student", "name email")
      .populate("advisor", "name email domain");

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.status(200).json({
      review: {
        id: review._id,
        student: review.student?.name || "Unknown",
        studentEmail: review.student?.email || "",
        advisor: review.advisor?.name || "Unknown",
        advisorEmail: review.advisor?.email || "",
        domain: review.advisor?.domain || "General",
        scheduledAt: review.scheduledAt,
        week: review.week,
        mode: review.mode,
        status: review.status,
        meetingLink: review.meetingLink,
        location: review.location,
        feedback: review.feedback,
      },
    });
  } catch (err) {
    console.error("Get Single Review Error:", err);
    res.status(500).json({ message: "Failed to fetch review" });
  }
};

/* ======================================================
   GET PERFORMANCE ANALYTICS – REVIEWER
====================================================== */
exports.getPerformanceAnalytics = async (req, res) => {
  try {
    const reviewerId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Get all reviews for this reviewer
    const allReviews = await ReviewSession.find({ reviewer: reviewerId });
    const completedReviews = allReviews.filter(r => r.status === "completed");

    // Total reviews
    const totalReviews = completedReviews.length;

    // Reviews this month
    const reviewsThisMonth = completedReviews.filter(r =>
      new Date(r.updatedAt) >= startOfMonth
    ).length;

    // Average rating (marks out of 10, convert to 5 scale)
    const reviewsWithMarks = completedReviews.filter(r => r.marks !== undefined && r.marks !== null);
    const avgRating = reviewsWithMarks.length > 0
      ? Math.round((reviewsWithMarks.reduce((sum, r) => sum + r.marks, 0) / reviewsWithMarks.length) * 10) / 10 / 2
      : 0;

    // On-time feedback calculation (within 24 hours of scheduledAt)
    let onTimeCount = 0;
    let within24Hours = 0;
    let within48Hours = 0;

    completedReviews.forEach(r => {
      if (r.scheduledAt && r.updatedAt) {
        const hoursToComplete = (new Date(r.updatedAt) - new Date(r.scheduledAt)) / (1000 * 60 * 60);
        if (hoursToComplete <= 24) {
          onTimeCount++;
          within24Hours++;
        } else if (hoursToComplete <= 48) {
          onTimeCount++;
          within48Hours++;
        }
      }
    });

    const onTimePercentage = totalReviews > 0
      ? Math.round((onTimeCount / totalReviews) * 100)
      : 0;

    // Monthly reviews (last 6 months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyReviews = [];

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const count = completedReviews.filter(r => {
        const reviewDate = new Date(r.updatedAt);
        return reviewDate >= monthStart && reviewDate <= monthEnd;
      }).length;

      monthlyReviews.push({
        month: monthNames[monthStart.getMonth()],
        count,
      });
    }

    // Workload distribution
    const activeReviews = allReviews.filter(r =>
      ["pending", "accepted", "scheduled"].includes(r.status)
    ).length;
    const maxCapacity = 10; // Configurable
    const availableSlots = Math.max(0, maxCapacity - activeReviews);
    const currentLoadPercentage = Math.round((activeReviews / maxCapacity) * 100);

    // Student satisfaction (rating breakdown)
    // Convert marks (0-10) to stars (1-5)
    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsWithMarks.forEach(r => {
      const stars = Math.min(5, Math.max(1, Math.ceil(r.marks / 2)));
      ratingBreakdown[stars]++;
    });

    res.status(200).json({
      totalReviews,
      reviewsThisMonth,
      avgRating,
      onTimePercentage,
      monthlyReviews,
      feedbackTimeliness: {
        within24Hours,
        within48Hours,
        onTimePercent: onTimePercentage,
      },
      workload: {
        activeReviews,
        maxCapacity,
        availableSlots,
        currentLoadPercentage,
      },
      studentSatisfaction: {
        avgRating,
        totalRatings: reviewsWithMarks.length,
        ratingBreakdown,
      },
    });
  } catch (err) {
    console.error("Performance Analytics Error:", err);
    res.status(500).json({ message: "Failed to fetch performance analytics" });
  }
};

/* ======================================================
   GET REVIEWER PROFILE
====================================================== */
exports.getReviewerProfile = async (req, res) => {
  try {
    const reviewerId = req.user.id;

    const reviewer = await User.findById(reviewerId).select("-passwordHash");

    if (!reviewer) {
      return res.status(404).json({ message: "Reviewer not found" });
    }

    return res.json({
      message: "Reviewer profile fetched",
      reviewer,
    });
  } catch (err) {
    console.error("GET REVIEWER PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   UPDATE REVIEWER PROFILE
====================================================== */
exports.updateReviewerProfile = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { name, phone, about, domain } = req.body;

    // Validate name
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Build update object
    const updateData = {
      name: name.trim(),
    };

    if (phone !== undefined) {
      updateData.phone = phone.trim();
    }

    if (about !== undefined) {
      updateData.about = about.trim();
    }

    if (domain !== undefined) {
      updateData.domain = domain.trim();
    }

    // Handle avatar upload
    if (req.file) {
      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    const reviewer = await User.findByIdAndUpdate(
      reviewerId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!reviewer) {
      return res.status(404).json({ message: "Reviewer not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      reviewer,
    });
  } catch (err) {
    console.error("UPDATE REVIEWER PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   REVIEWER DASHBOARD DATA
====================================================== */
exports.getReviewerDashboard = async (req, res) => {
  try {
    const reviewerId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();

    // Get all reviews for this reviewer
    const allReviews = await ReviewSession.find({ reviewer: reviewerId })
      .populate("student", "name email")
      .populate("advisor", "name email")
      .sort({ scheduledAt: 1 });

    // 1. Reviews This Week (scheduled reviews in current week)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const reviewsThisWeek = allReviews.filter((r) => {
      const scheduledDate = new Date(r.scheduledAt);
      return (
        scheduledDate >= startOfWeek &&
        scheduledDate < endOfWeek &&
        ["scheduled", "accepted", "pending"].includes(r.status)
      );
    }).length;

    // 2. Pending Feedback (completed but no marks/feedback)
    const pendingFeedbackReviews = allReviews.filter(
      (r) => r.status === "completed" && (r.marks === undefined || r.marks === null)
    );

    // 3. Total Completed
    const totalCompleted = allReviews.filter((r) => r.status === "completed").length;

    // 4. Average Rating (from marks 0-10, converted to 0-5 scale)
    const reviewsWithMarks = allReviews.filter(
      (r) => r.status === "completed" && r.marks !== undefined && r.marks !== null
    );
    const avgRating =
      reviewsWithMarks.length > 0
        ? (reviewsWithMarks.reduce((sum, r) => sum + r.marks, 0) / reviewsWithMarks.length / 2).toFixed(1)
        : 0;

    // 5. Upcoming Reviews (scheduled/accepted, future dates, limit 5)
    const upcomingReviews = allReviews
      .filter(
        (r) =>
          ["scheduled", "accepted"].includes(r.status) &&
          new Date(r.scheduledAt) >= now
      )
      .slice(0, 5)
      .map((r) => ({
        _id: r._id,
        student: r.student,
        advisor: r.advisor,
        scheduledAt: r.scheduledAt,
        status: r.status,
        mode: r.mode,
        meetingLink: r.meetingLink,
      }));

    // 6. Pending Feedback list (limit 5)
    const pendingFeedbackList = pendingFeedbackReviews.slice(0, 5).map((r) => ({
      _id: r._id,
      student: r.student,
      scheduledAt: r.scheduledAt,
      updatedAt: r.updatedAt,
    }));

    res.status(200).json({
      stats: {
        reviewsThisWeek,
        pendingFeedback: pendingFeedbackReviews.length,
        totalCompleted,
        avgRating: parseFloat(avgRating),
      },
      upcomingReviews,
      pendingFeedbackList,
    });
  } catch (err) {
    console.error("REVIEWER DASHBOARD ERROR:", err);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
};

/* ======================================================
   GET STUDENT UPCOMING REVIEWS
====================================================== */
exports.getStudentUpcomingReviews = async (req, res) => {
  try {
    const studentId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();

    // Fetch upcoming reviews (scheduled, accepted, pending - future dates)
    const upcomingReviews = await ReviewSession.find({
      student: studentId,
      status: { $in: ["pending", "scheduled", "accepted"] },
      scheduledAt: { $gte: now },
    })
      .populate("advisor", "name email")
      .populate("reviewer", "name email")
      .sort({ scheduledAt: 1 })
      .lean();

    // Format response
    const formatted = upcomingReviews.map((r) => ({
      _id: r._id,
      reviewer: r.reviewer,
      advisor: r.advisor,
      scheduledAt: r.scheduledAt,
      status: r.status,
      mode: r.mode,
      meetingLink: r.meetingLink,
      location: r.location,
      week: r.week,
    }));

    res.status(200).json({ upcomingReviews: formatted });
  } catch (err) {
    console.error("STUDENT UPCOMING REVIEWS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch upcoming reviews" });
  }
};

/* ======================================================
   GET STUDENT REVIEW HISTORY
====================================================== */
exports.getStudentReviewHistory = async (req, res) => {
  try {
    const studentId = new mongoose.Types.ObjectId(req.user.id);

    // Fetch completed reviews
    const completedReviews = await ReviewSession.find({
      student: studentId,
      status: "completed",
    })
      .populate("reviewer", "name email")
      .populate("advisor", "name email")
      .sort({ updatedAt: -1 })
      .lean();

    // Format response with score calculation
    const formatted = completedReviews.map((r) => ({
      _id: r._id,
      reviewer: r.reviewer,
      advisor: r.advisor,
      scheduledAt: r.scheduledAt,
      completedAt: r.updatedAt,
      status: r.status,
      marks: r.marks,
      // Convert marks (0-10) to percentage
      score: r.marks !== undefined && r.marks !== null ? Math.round(r.marks * 10) : null,
      feedback: r.feedback,
      week: r.week,
    }));

    res.status(200).json({ reviewHistory: formatted });
  } catch (err) {
    console.error("STUDENT REVIEW HISTORY ERROR:", err);
    res.status(500).json({ message: "Failed to fetch review history" });
  }
};

/* ======================================================
   GET STUDENT REVIEW REPORT
====================================================== */
exports.getStudentReviewReport = async (req, res) => {
  try {
    const studentId = new mongoose.Types.ObjectId(req.user.id);
    const { reviewId } = req.params;

    // Fetch the review ensuring it belongs to this student
    const review = await ReviewSession.findOne({
      _id: reviewId,
      student: studentId,
    })
      .populate("reviewer", "name email")
      .populate("advisor", "name email")
      .populate("student", "name email batch course")
      .lean();

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Format report response
    const report = {
      _id: review._id,
      student: review.student,
      reviewer: review.reviewer,
      advisor: review.advisor,
      scheduledAt: review.scheduledAt,
      completedAt: review.updatedAt,
      status: review.status,
      week: review.week,
      mode: review.mode,
      marks: review.marks,
      score: review.marks !== undefined && review.marks !== null ? Math.round(review.marks * 10) : null,
      feedback: review.feedback,
    };

    res.status(200).json({ report });
  } catch (err) {
    console.error("STUDENT REVIEW REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to fetch review report" });
  }
};

/* ======================================================
   GET STUDENT PROGRESS DATA
====================================================== */
exports.getStudentProgress = async (req, res) => {
  try {
    const studentId = new mongoose.Types.ObjectId(req.user.id);

    // Fetch all reviews for this student
    const allReviews = await ReviewSession.find({ student: studentId })
      .populate("reviewer", "name")
      .sort({ scheduledAt: 1 })
      .lean();

    // Total reviews and completed count
    const totalReviews = allReviews.length;
    const completedReviews = allReviews.filter(r => r.status === "completed");
    const completedCount = completedReviews.length;

    // Calculate average score (marks are 0-10, convert to percentage)
    const reviewsWithMarks = completedReviews.filter(
      r => r.marks !== undefined && r.marks !== null
    );
    const avgScore = reviewsWithMarks.length > 0
      ? Math.round(reviewsWithMarks.reduce((sum, r) => sum + r.marks, 0) / reviewsWithMarks.length * 10)
      : 0;

    // Overall progress percentage (completed / total * 100)
    const overallProgress = totalReviews > 0
      ? Math.round((completedCount / totalReviews) * 100)
      : 0;

    // Progress over time (weekly scores)
    const weeklyProgress = allReviews
      .filter(r => r.status === "completed" && r.marks !== undefined)
      .map(r => ({
        week: r.week,
        score: Math.round(r.marks * 10),
        date: r.scheduledAt,
      }))
      .sort((a, b) => a.week - b.week);

    // Learning milestones (all reviews as milestones)
    const milestones = allReviews.map(r => ({
      _id: r._id,
      title: `Week ${r.week} Review`,
      date: r.scheduledAt,
      status: r.status,
      reviewer: r.reviewer?.name,
      score: r.marks !== undefined ? Math.round(r.marks * 10) : null,
    }));

    // Calculate improvement areas from feedback
    const improvementAreas = [];
    const uniqueFeedback = new Set();

    completedReviews.forEach(r => {
      if (r.feedback && r.feedback.trim()) {
        // Split feedback into sentences and extract actionable items
        const sentences = r.feedback.split(/[.!?]/).filter(s => s.trim());
        sentences.forEach(s => {
          const trimmed = s.trim();
          if (trimmed.length > 20 && trimmed.length < 100 && !uniqueFeedback.has(trimmed)) {
            uniqueFeedback.add(trimmed);
            if (improvementAreas.length < 5) {
              improvementAreas.push(trimmed);
            }
          }
        });
      }
    });

    // If no feedback, add default improvement areas based on low scores
    if (improvementAreas.length === 0) {
      const lowScoreReviews = reviewsWithMarks.filter(r => r.marks < 7);
      if (lowScoreReviews.length > 0) {
        improvementAreas.push("Focus on areas with lower scores");
        improvementAreas.push("Review feedback from completed sessions");
        improvementAreas.push("Practice consistently before reviews");
      }
    }

    res.status(200).json({
      stats: {
        overallProgress,
        milestonesCompleted: completedCount,
        totalMilestones: totalReviews,
        avgScore,
      },
      weeklyProgress,
      milestones,
      improvementAreas,
    });
  } catch (err) {
    console.error("STUDENT PROGRESS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch progress data" });
  }
};
