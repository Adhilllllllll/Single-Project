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
 * Fetch all reviewers with their availability slots (both recurring and specific date)
 */
exports.getReviewersWithAvailability = async (req, res) => {
  try {
    // 1. Get all active reviewers (including reviewerStatus)
    const reviewers = await User.find({
      role: "reviewer",
      status: "active"
    }).select("_id name email domain reviewerStatus");

    // 2. Get availability for each reviewer (both recurring and specific)
    const reviewersWithAvailability = await Promise.all(
      reviewers.map(async (reviewer) => {
        // Fetch all slots - don't filter by status to catch all slots
        const slots = await ReviewerAvailability.find({
          reviewerId: reviewer._id,
          slotType: { $ne: "break" } // Exclude breaks
        }).sort({ availabilityType: 1, dayOfWeek: 1, specificDate: 1, startTime: 1 });

        // Separate recurring and specific slots
        const recurringSlots = slots.filter(s => s.availabilityType === "recurring");
        const specificSlots = slots.filter(s => s.availabilityType === "specific");

        // Map dayOfWeek numbers to day names for recurring slots
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const availabilityDays = [...new Set(recurringSlots.map(s => dayNames[s.dayOfWeek]))];

        // Get upcoming specific dates
        const now = new Date();
        const upcomingDates = specificSlots
          .filter(s => s.specificDate >= now)
          .map(s => s.specificDate.toISOString().split('T')[0])
          .slice(0, 5); // Limit to next 5 dates

        // Find next available slot
        const currentDay = now.getDay();
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Check recurring slots first
        let nextSlotText = "No slots available";
        const todayRecurringSlot = recurringSlots.find(s =>
          s.dayOfWeek === currentDay && s.startTime > currentTimeStr
        );
        const futureRecurringSlot = recurringSlots.find(s => s.dayOfWeek > currentDay);
        const nextWeekSlot = recurringSlots.find(s => s.dayOfWeek < currentDay);

        if (todayRecurringSlot) {
          nextSlotText = `Today ${todayRecurringSlot.startTime}`;
        } else if (futureRecurringSlot) {
          const dayDiff = futureRecurringSlot.dayOfWeek - currentDay;
          if (dayDiff === 1) {
            nextSlotText = `Tomorrow ${futureRecurringSlot.startTime}`;
          } else {
            nextSlotText = `${dayNames[futureRecurringSlot.dayOfWeek]} ${futureRecurringSlot.startTime}`;
          }
        } else if (nextWeekSlot) {
          nextSlotText = `${dayNames[nextWeekSlot.dayOfWeek]} ${nextWeekSlot.startTime}`;
        }

        // Check specific date slots
        const upcomingSpecificSlot = specificSlots.find(s => {
          const slotDate = new Date(s.specificDate);
          return slotDate >= now;
        });
        if (upcomingSpecificSlot && nextSlotText === "No slots available") {
          const slotDate = new Date(upcomingSpecificSlot.specificDate);
          const dateStr = slotDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          nextSlotText = `${dateStr} ${upcomingSpecificSlot.startTime}`;
        }

        return {
          id: reviewer._id,
          name: reviewer.name,
          email: reviewer.email,
          title: reviewer.domain || "Reviewer",
          availability: availabilityDays,
          upcomingDates: upcomingDates,
          slots: slots, // All slots (recurring + specific)
          recurringSlots: recurringSlots,
          specificSlots: specificSlots,
          nextSlot: nextSlotText,
          status: reviewer.reviewerStatus || "available",
          totalSlots: slots.length,
          recurringCount: recurringSlots.length,
          specificCount: specificSlots.length,
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
 * Supports filters: startDate, endDate, studentId, reviewerId
 */
exports.getAnalytics = async (req, res) => {
  try {
    const advisorId = req.user.id;
    const { startDate, endDate, studentId, reviewerId } = req.query;
    const now = new Date();

    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.scheduledAt = {};
      if (startDate) dateFilter.scheduledAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.scheduledAt.$lte = end;
      }
    }

    // Build base query
    const baseQuery = { advisor: advisorId, ...dateFilter };
    if (studentId) baseQuery.student = studentId;
    if (reviewerId) baseQuery.reviewer = reviewerId;

    // ========== STUDENT METRICS ==========
    const totalStudents = await Student.countDocuments({
      advisorId,
      status: "active"
    });

    const students = await Student.find({ advisorId, status: "active" }).select("progress name");
    const avgStudentProgress = students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + (s.progress || 0), 0) / students.length)
      : 0;

    // ========== REVIEW METRICS (with filters) ==========
    const totalReviews = await ReviewSession.countDocuments(baseQuery);

    const completedReviews = await ReviewSession.countDocuments({
      ...baseQuery,
      status: { $in: ["completed", "scored"] }
    });
    const pendingReviews = await ReviewSession.countDocuments({
      ...baseQuery,
      status: "pending"
    });
    const scheduledReviews = await ReviewSession.countDocuments({
      ...baseQuery,
      status: "scheduled"
    });
    const cancelledReviews = await ReviewSession.countDocuments({
      ...baseQuery,
      status: "cancelled"
    });

    const completionRate = totalReviews > 0
      ? Math.round((completedReviews / totalReviews) * 100)
      : 0;

    // ========== SCORE METRICS (from FinalEvaluation) ==========
    const FinalEvaluation = require("../reviews/FinalEvaluation");

    // Get scored reviews
    const scoredReviews = await ReviewSession.find({
      ...baseQuery,
      status: "scored"
    }).select("_id");

    const scoredReviewIds = scoredReviews.map(r => r._id);

    // Get final evaluations for scored reviews
    const finalEvaluations = await FinalEvaluation.find({
      reviewSession: { $in: scoredReviewIds }
    });

    let avgScore = 0;
    let avgAttendance = 0;
    let avgDiscipline = 0;

    if (finalEvaluations.length > 0) {
      avgScore = Math.round((finalEvaluations.reduce((sum, e) => sum + (e.finalScore || 0), 0) / finalEvaluations.length) * 10) / 10;
      avgAttendance = Math.round((finalEvaluations.reduce((sum, e) => sum + (e.attendance || 0), 0) / finalEvaluations.length) * 10) / 10;
      avgDiscipline = Math.round((finalEvaluations.reduce((sum, e) => sum + (e.discipline || 0), 0) / finalEvaluations.length) * 10) / 10;
    }

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
      const trendStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const trendEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const count = await ReviewSession.countDocuments({
        advisor: advisorId,
        scheduledAt: { $gte: trendStart, $lte: trendEnd }
      });

      const completedCount = await ReviewSession.countDocuments({
        advisor: advisorId,
        status: { $in: ["completed", "scored"] },
        scheduledAt: { $gte: trendStart, $lte: trendEnd }
      });

      monthlyTrend.push({
        month: trendStart.toLocaleString('default', { month: 'short' }),
        year: trendStart.getFullYear(),
        total: count,
        completed: completedCount,
      });
    }

    // ========== REVIEWER PERFORMANCE ==========
    const mongoose = require("mongoose");
    const reviewerMatchQuery = { advisor: new mongoose.Types.ObjectId(advisorId) };
    if (studentId) reviewerMatchQuery.student = new mongoose.Types.ObjectId(studentId);

    const reviewerStats = await ReviewSession.aggregate([
      { $match: reviewerMatchQuery },
      {
        $group: {
          _id: "$reviewer",
          totalReviews: { $sum: 1 },
          completedReviews: {
            $sum: { $cond: [{ $in: ["$status", ["completed", "scored"]] }, 1, 0] }
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
          }
        }
      },
      { $sort: { completedReviews: -1 } },
      { $limit: 10 }
    ]);

    // ========== STUDENT PERFORMANCE ==========
    const studentStats = await ReviewSession.aggregate([
      { $match: { advisor: new mongoose.Types.ObjectId(advisorId), status: { $in: ["completed", "scored"] } } },
      {
        $group: {
          _id: "$student",
          totalReviews: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "studentInfo"
        }
      },
      { $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$studentInfo.name", "Unknown"] },
          totalReviews: 1,
          progress: { $ifNull: ["$studentInfo.progress", 0] }
        }
      },
      { $sort: { totalReviews: -1 } },
      { $limit: 10 }
    ]);

    // Get reviewers list for filter dropdown
    const reviewers = await User.find({ role: "reviewer", status: "active" }).select("_id name");

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
        avgAttendance,
        avgDiscipline,
        reviewsThisWeek,
        reviewsThisMonth,

        // Charts Data
        monthlyTrend,
        reviewerPerformance: reviewerStats,
        studentPerformance: studentStats,

        // Status Breakdown
        statusBreakdown: {
          completed: completedReviews,
          pending: pendingReviews,
          scheduled: scheduledReviews,
          cancelled: cancelledReviews,
        },

        // Filter options
        filterOptions: {
          students: students.map(s => ({ _id: s._id, name: s.name })),
          reviewers: reviewers.map(r => ({ _id: r._id, name: r.name }))
        }
      }
    });
  } catch (err) {
    console.error("GET ANALYTICS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

