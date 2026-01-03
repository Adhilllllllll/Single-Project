const User = require("../users/User");
const Student = require("../students/student");
const ReviewerAvailability = require("../reviewerAvailability/ReviewerAvailability");
const ReviewSession = require("../reviews/reviewSession");

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
 * PUT /api/advisor/me
 * Update advisor profile (name, phone, about, avatar)
 */
exports.updateMyProfile = async (req, res) => {
  try {
    const advisorId = req.user.id;
    const { name, phone, about } = req.body;

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

    // Handle avatar upload
    if (req.file) {
      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    const advisor = await User.findByIdAndUpdate(
      advisorId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!advisor) {
      return res.status(404).json({ message: "Advisor not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      advisor,
    });
  } catch (err) {
    console.error("UPDATE ADVISOR PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/advisor/dashboard
 * Dashboard stats with real data
 */
exports.getDashboard = async (req, res) => {
  try {
    const advisorId = req.user.id;

    // Get real student count
    const totalStudents = await Student.countDocuments({
      advisorId,
      status: "active"
    });

    // Get this week's date range (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Get reviews this week
    const reviewsThisWeek = await ReviewSession.countDocuments({
      advisor: advisorId,
      scheduledAt: { $gte: weekStart, $lt: weekEnd }
    });

    // Get pending scores (completed reviews without score approval)
    const pendingScores = await ReviewSession.countDocuments({
      advisor: advisorId,
      status: "completed",
      scoreApproved: { $ne: true }
    });

    // Calculate average progress from students
    const students = await Student.find({ advisorId, status: "active" }).select("progress");
    const avgProgress = students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + (s.progress || 0), 0) / students.length)
      : 0;

    return res.json({
      message: "Advisor dashboard data",
      stats: {
        totalStudents,
        avgProgress,
        reviewsThisWeek,
        pendingScores,
      },
    });
  } catch (err) {
    console.error("ADVISOR DASHBOARD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/advisor/students
 * Fetch students assigned to the logged-in advisor
 */
exports.getAssignedStudents = async (req, res) => {
  try {
    const advisorId = req.user.id;

    const students = await Student.find({
      advisorId,
      status: "active"
    })
      .select("_id name email phone course batch status createdAt")
      .sort({ name: 1 });

    // Format response
    const formattedStudents = students.map(student => ({
      id: student._id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      project: student.course || "Project", // Use course as project name
      batch: student.batch,
      status: "Active",
      progress: Math.floor(Math.random() * 40) + 60, // TODO: Replace with real progress when available
      joinedAt: student.createdAt,
      lastReviewDate: null, // TODO: Fetch from reviews collection
    }));

    return res.json({
      message: "Assigned students fetched",
      students: formattedStudents,
      count: formattedStudents.length,
    });
  } catch (err) {
    console.error("GET ASSIGNED STUDENTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/advisor/students/:studentId
 * Fetch single student profile with review details
 */
exports.getStudentProfile = async (req, res) => {
  try {
    const advisorId = req.user.id;
    const { studentId } = req.params;

    const student = await Student.findOne({
      _id: studentId,
      advisorId, // Ensure student belongs to this advisor
    }).populate("advisorId", "name email");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // TODO: Fetch actual review data from reviews collection when available
    // For now, return mock review data
    const profileData = {
      id: student._id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      course: student.course,
      batch: student.batch,
      status: student.status,
      joinedAt: student.createdAt,
      advisor: {
        name: student.advisorId?.name || "Unknown",
        email: student.advisorId?.email || "",
      },
      // TODO: Replace with real data from reviews collection
      currentWeek: "Week 8",
      lastReviewDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      lastReviewStatus: "Completed",
      lastWeekPerformance: "Good",
      reviewsCompleted: 7,
      pendingReviews: 1,
      overallScore: 85,
    };

    return res.json({
      message: "Student profile fetched",
      student: profileData,
    });
  } catch (err) {
    console.error("GET STUDENT PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * GET /api/advisor/reviewers/availability
 * Fetch all reviewers with their availability slots
 */
exports.getReviewersWithAvailability = async (req, res) => {
  try {
    // 1. Get all active reviewers
    const reviewers = await User.find({
      role: "reviewer",
      status: "active"
    }).select("_id name email domain");

    // 2. Get availability for each reviewer
    const reviewersWithAvailability = await Promise.all(
      reviewers.map(async (reviewer) => {
        const slots = await ReviewerAvailability.find({
          reviewerId: reviewer._id,
          status: "active"
        }).sort({ dayOfWeek: 1, startTime: 1 });

        // Map dayOfWeek numbers to day names
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const availabilityDays = [...new Set(slots.map(s => dayNames[s.dayOfWeek]))];

        // Find next available slot (simple logic for demo)
        const now = new Date();
        const currentDay = now.getDay();
        const nextSlot = slots.find(s => s.dayOfWeek >= currentDay);

        let nextSlotText = "No slots available";
        if (nextSlot) {
          const dayDiff = nextSlot.dayOfWeek - currentDay;
          if (dayDiff === 0) {
            nextSlotText = `Today ${nextSlot.startTime}`;
          } else if (dayDiff === 1) {
            nextSlotText = `Tomorrow ${nextSlot.startTime}`;
          } else {
            nextSlotText = `${dayNames[nextSlot.dayOfWeek]} ${nextSlot.startTime}`;
          }
        }

        return {
          id: reviewer._id,
          name: reviewer.name,
          email: reviewer.email,
          title: reviewer.domain || "Reviewer",
          availability: availabilityDays,
          slots: slots,
          nextSlot: nextSlotText,
          status: slots.length > 0 ? "Available" : "No Slots",
          totalSlots: slots.length,
        };
      })
    );

    return res.json({
      message: "Reviewers with availability fetched",
      reviewers: reviewersWithAvailability,
    });
  } catch (err) {
    console.error("GET REVIEWERS AVAILABILITY ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/advisor/analytics
 * Comprehensive analytics with real data from MongoDB
 */
exports.getAnalytics = async (req, res) => {
  try {
    const advisorId = req.user.id;
    const now = new Date();

    // ========== STUDENT METRICS ==========
    const totalStudents = await Student.countDocuments({
      advisorId,
      status: "active"
    });

    // Get students with progress
    const students = await Student.find({ advisorId, status: "active" }).select("progress");
    const avgStudentProgress = students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + (s.progress || 0), 0) / students.length)
      : 0;

    // ========== REVIEW METRICS ==========
    // Total reviews created by this advisor
    const totalReviews = await ReviewSession.countDocuments({ advisor: advisorId });

    // Reviews by status
    const completedReviews = await ReviewSession.countDocuments({
      advisor: advisorId,
      status: "completed"
    });
    const pendingReviews = await ReviewSession.countDocuments({
      advisor: advisorId,
      status: "pending"
    });
    const scheduledReviews = await ReviewSession.countDocuments({
      advisor: advisorId,
      status: "scheduled"
    });
    const cancelledReviews = await ReviewSession.countDocuments({
      advisor: advisorId,
      status: "cancelled"
    });

    // Completion rate
    const completionRate = totalReviews > 0
      ? Math.round((completedReviews / totalReviews) * 100)
      : 0;

    // ========== SCORE METRICS ==========
    const reviewsWithScores = await ReviewSession.find({
      advisor: advisorId,
      status: "completed",
      totalScore: { $exists: true, $ne: null }
    }).select("totalScore");

    const avgScore = reviewsWithScores.length > 0
      ? Math.round(reviewsWithScores.reduce((sum, r) => sum + (r.totalScore || 0), 0) / reviewsWithScores.length)
      : 0;

    // ========== THIS WEEK METRICS ==========
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const reviewsThisWeek = await ReviewSession.countDocuments({
      advisor: advisorId,
      scheduledAt: { $gte: weekStart, $lt: weekEnd }
    });

    // ========== THIS MONTH METRICS ==========
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const reviewsThisMonth = await ReviewSession.countDocuments({
      advisor: advisorId,
      scheduledAt: { $gte: monthStart, $lte: monthEnd }
    });

    // ========== MONTHLY TREND (Last 6 months) ==========
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const count = await ReviewSession.countDocuments({
        advisor: advisorId,
        scheduledAt: { $gte: startDate, $lte: endDate }
      });

      const completedCount = await ReviewSession.countDocuments({
        advisor: advisorId,
        status: "completed",
        scheduledAt: { $gte: startDate, $lte: endDate }
      });

      monthlyTrend.push({
        month: startDate.toLocaleString('default', { month: 'short' }),
        year: startDate.getFullYear(),
        total: count,
        completed: completedCount,
      });
    }

    // ========== REVIEWER PERFORMANCE ==========
    const reviewerStats = await ReviewSession.aggregate([
      { $match: { advisor: advisorId } },
      {
        $group: {
          _id: "$reviewer",
          totalReviews: { $sum: 1 },
          completedReviews: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          avgScore: {
            $avg: {
              $cond: [
                { $and: [{ $eq: ["$status", "completed"] }, { $ne: ["$totalScore", null] }] },
                "$totalScore",
                null
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "reviewerInfo"
        }
      },
      { $unwind: { path: "$reviewerInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$reviewerInfo.name", "Unknown"] },
          totalReviews: 1,
          completedReviews: 1,
          completionRate: {
            $cond: [
              { $gt: ["$totalReviews", 0] },
              { $multiply: [{ $divide: ["$completedReviews", "$totalReviews"] }, 100] },
              0
            ]
          },
          avgScore: { $round: [{ $ifNull: ["$avgScore", 0] }, 0] }
        }
      },
      { $sort: { completedReviews: -1 } },
      { $limit: 10 }
    ]);

    return res.json({
      message: "Analytics data fetched",
      analytics: {
        // Summary Cards
        totalStudents,
        avgStudentProgress,
        totalReviews,
        completedReviews,
        pendingReviews,
        scheduledReviews,
        cancelledReviews,
        completionRate,
        avgScore,
        reviewsThisWeek,
        reviewsThisMonth,

        // Charts Data
        monthlyTrend,
        reviewerPerformance: reviewerStats,

        // Status Breakdown
        statusBreakdown: {
          completed: completedReviews,
          pending: pendingReviews,
          scheduled: scheduledReviews,
          cancelled: cancelledReviews,
        }
      }
    });
  } catch (err) {
    console.error("GET ANALYTICS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
