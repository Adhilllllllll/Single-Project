const User = require("../users/User");
const Student = require("../students/student");
const ReviewerAvailability = require("../reviewerAvailability/ReviewerAvailability");

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

    // TODO: Add reviews count when review module is ready
    return res.json({
      message: "Advisor dashboard data",
      stats: {
        totalStudents,
        avgProgress: 68, // TODO: Calculate from actual student progress
        reviewsThisWeek: 5, // TODO: Calculate from reviews collection
        pendingScores: 2, // TODO: Calculate from pending reviews
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

