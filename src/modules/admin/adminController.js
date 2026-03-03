const User = require("../users/User");
const Student = require("../students/student");
const ReviewSession = require("../reviews/reviewSession");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendUserCredentials } = require("../auth/emailService");

/* ======================================================
   INTERNAL HELPER FUNCTIONS
====================================================== */

// Response helpers
const sendSuccess = (res, data, message = "Success", status = 200) => {
  res.status(status).json({ message, ...data });
};

const sendError = (res, message, status = 500) => {
  res.status(status).json({ message });
};

const handleError = (res, err, context) => {
  console.error(`${context} ERROR:`, err);
  sendError(res, "Server error", 500);
};

// Password generation helper
const generateSecurePassword = () => {
  return crypto.randomBytes(4).toString("hex") + "A1!"; // 8-char + complexity
};

// User formatter helper
const formatUserForResponse = (user, model = "User") => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role || "student",
  status: user.status,
  avatar: user.avatar,
  model,
});


/**
 * GET /api/admin/me
 * Get logged-in admin's profile
 */
exports.getMyProfile = async (req, res) => {
  try {
    const adminId = req.user.id;

    const admin = await User.findById(adminId).select("-passwordHash");

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    return res.json({
      message: "Admin profile fetched",
      admin,
    });
  } catch (err) {
    console.error("GET ADMIN PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getDashboardCounts = async (req, res) => {
  try {
    // Get start of today for reviewsToday count
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [students, reviewers, advisors, totalReviews, pendingReviews, reviewsToday] = await Promise.all([
      Student.countDocuments(),
      User.countDocuments({ role: "reviewer" }),
      User.countDocuments({ role: "advisor" }),
      ReviewSession.countDocuments(),
      ReviewSession.countDocuments({ status: "pending" }),
      ReviewSession.countDocuments({ scheduledAt: { $gte: startOfToday } }),
    ]);

    res.json({
      students,
      reviewers,
      advisors,
      totalReviews,
      pendingReviews,
      reviewsToday,
    });
  } catch (err) {
    console.error("Admin counts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/admin/recent-activity
 * Get recent system activity for admin dashboard
 * 
 * PHASE 2 REFACTOR: Full MongoDB pipeline with $unionWith
 * - REMOVED: JS array spread [...arr1, ...arr2, ...arr3]
 * - REMOVED: JS array.sort() for combined activities
 * - REMOVED: JS array.slice(0, 20) for limiting
 * - ADDED: $unionWith to merge collections at DB level
 * - ADDED: Final $sort + $limit in single pipeline
 * 
 * NOTE: formatRelativeTime() INTENTIONALLY kept in JS (requires runtime Date.now())
 */
exports.getRecentActivity = async (req, res) => {
  try {
    // === SINGLE AGGREGATION PIPELINE WITH $unionWith ===
    // Replaces: 3 separate queries + JS [...spread] + sort() + slice()
    // MongoDB 8.0.17 supports $unionWith for cross-collection merging

    const allActivities = await ReviewSession.aggregate([
      // === STAGE 1: Get Review Activities (Base Collection) ===
      { $sort: { createdAt: -1 } },
      { $limit: 15 },
      {
        $lookup: {
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "studentInfo",
        },
      },
      { $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          id: "$_id",
          type: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", "completed"] }, then: "complete" },
                { case: { $eq: ["$status", "pending"] }, then: "pending" },
                { case: { $eq: ["$status", "accepted"] }, then: "add" },
              ],
              default: "pending",
            },
          },
          message: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$status", "completed"] },
                  then: {
                    $concat: [
                      "Review for ",
                      { $ifNull: ["$studentInfo.name", "Student"] },
                      " was completed.",
                    ],
                  },
                },
                {
                  case: { $eq: ["$status", "pending"] },
                  then: {
                    $concat: [
                      "Review for ",
                      { $ifNull: ["$studentInfo.name", "Student"] },
                      " is pending approval.",
                    ],
                  },
                },
                {
                  case: { $eq: ["$status", "accepted"] },
                  then: {
                    $concat: [
                      "Review for ",
                      { $ifNull: ["$studentInfo.name", "Student"] },
                      " was scheduled.",
                    ],
                  },
                },
              ],
              default: {
                $concat: [
                  "Review for ",
                  { $ifNull: ["$studentInfo.name", "Student"] },
                  " is pending approval.",
                ],
              },
            },
          },
          time: "$createdAt",
        },
      },

      // === STAGE 2: $unionWith Students Collection ===
      // Replaces: [...reviewActivities, ...studentActivities] spread
      {
        $unionWith: {
          coll: "students",
          pipeline: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                _id: 0,
                id: "$_id",
                type: { $literal: "register" },
                message: { $concat: ["New student ", "$name", " was registered."] },
                time: "$createdAt",
              },
            },
          ],
        },
      },

      // === STAGE 3: $unionWith Users Collection (advisors/reviewers) ===
      // Replaces: [...combined, ...userActivities] spread
      {
        $unionWith: {
          coll: "users",
          pipeline: [
            { $match: { role: { $in: ["advisor", "reviewer"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                _id: 0,
                id: "$_id",
                type: { $literal: "add" },
                message: { $concat: ["New ", "$role", " ", "$name", " was added."] },
                time: "$createdAt",
              },
            },
          ],
        },
      },

      // === STAGE 4: Final Sort (Replaces: array.sort()) ===
      // Previously: allActivities.sort((a, b) => new Date(b.time) - new Date(a.time))
      { $sort: { time: -1 } },

      // === STAGE 5: Final Limit (Replaces: array.slice(0, 20)) ===
      // Previously: limitedActivities = allActivities.slice(0, 20)
      { $limit: 20 },
    ]);

    // === FORMAT RELATIVE TIME ===
    // INTENTIONALLY KEPT IN JS: Requires dynamic Date.now() at response time
    // Cannot be moved to MongoDB as it needs current server timestamp
    const formatRelativeTime = (date) => {
      const now = new Date();
      const diff = now - new Date(date);
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes} min ago`;
      if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
      if (days === 1) return "Yesterday";
      return `${days} days ago`;
    };

    // Transform time field only - all other shaping done at DB level
    const formattedActivities = allActivities.map((act) => ({
      id: act.id,
      type: act.type,
      message: act.message,
      time: formatRelativeTime(act.time),
    }));

    res.json({ activities: formattedActivities });
  } catch (err) {
    console.error("Recent Activity Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/admin/review-stats
 * Get comprehensive review statistics for admin dashboard
 */
exports.getReviewStats = async (req, res) => {
  try {
    const now = new Date();

    // ========== STATUS COUNTS ==========
    const [scheduled, inProgress, completed, cancelled, total] = await Promise.all([
      ReviewSession.countDocuments({ status: "scheduled" }),
      ReviewSession.countDocuments({ status: { $in: ["pending", "in-progress"] } }),
      ReviewSession.countDocuments({ status: "completed" }),
      ReviewSession.countDocuments({ status: "cancelled" }),
      ReviewSession.countDocuments(),
    ]);

    // Calculate completion rate change (compare last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [recentCompleted, previousCompleted] = await Promise.all([
      ReviewSession.countDocuments({
        status: "completed",
        updatedAt: { $gte: thirtyDaysAgo },
      }),
      ReviewSession.countDocuments({
        status: "completed",
        updatedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      }),
    ]);

    const completionTrend = previousCompleted > 0
      ? Math.round(((recentCompleted - previousCompleted) / previousCompleted) * 100)
      : recentCompleted > 0 ? 100 : 0;

    // ========== MONTHLY TREND (Last 6 months) - Single Aggregation ==========
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const monthlyAggregation = await ReviewSession.aggregate([
      {
        $match: {
          scheduledAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$scheduledAt" },
            month: { $month: "$scheduledAt" },
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          inProgress: {
            $sum: {
              $cond: [{ $in: ["$status", ["pending", "in-progress"]] }, 1, 0],
            },
          },
          scheduled: {
            $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Map month numbers to names and fill gaps for all 6 months
    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyTrend = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth() + 1;

      const found = monthlyAggregation.find(
        (m) => m._id.year === targetYear && m._id.month === targetMonth
      );

      monthlyTrend.push({
        month: monthNames[targetMonth],
        completed: found?.completed || 0,
        inProgress: found?.inProgress || 0,
        scheduled: found?.scheduled || 0,
      });
    }

    // ========== REVIEWS BY DOMAIN/DEPARTMENT ==========
    // Get reviews grouped by reviewer domain
    const reviewsByDomain = await ReviewSession.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "reviewer",
          foreignField: "_id",
          as: "reviewerInfo",
        },
      },
      { $unwind: { path: "$reviewerInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ["$reviewerInfo.domain", "General"] },
          totalReviews: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          pending: {
            $sum: {
              $cond: [
                { $in: ["$status", ["scheduled", "pending", "in-progress"]] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          department: "$_id",
          totalReviews: 1,
          completed: 1,
          pending: 1,
          completionRate: {
            $cond: [
              { $gt: ["$totalReviews", 0] },
              { $round: [{ $multiply: [{ $divide: ["$completed", "$totalReviews"] }, 100] }, 0] },
              0,
            ],
          },
        },
      },
      { $sort: { totalReviews: -1 } },
      { $limit: 10 },
    ]);

    // ========== STATUS DISTRIBUTION (percentages) ==========
    const statusDistribution = {
      completed: total > 0 ? Math.round((completed / total) * 100) : 0,
      inProgress: total > 0 ? Math.round((inProgress / total) * 100) : 0,
      scheduled: total > 0 ? Math.round((scheduled / total) * 100) : 0,
      cancelled: total > 0 ? Math.round((cancelled / total) * 100) : 0,
    };

    return res.json({
      message: "Review stats fetched",
      stats: {
        // Summary cards
        scheduled,
        inProgress,
        completed,
        cancelled,
        total,
        completionTrend,

        // Charts data
        statusDistribution,
        monthlyTrend,
        reviewsByDomain,
      },
    });
  } catch (err) {
    console.error("Get Review Stats Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Create a new user (advisor, reviewer, or student)
 * POST /api/admin/create-user
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, role, domain, advisorId } = req.body;

    // 1. Validate required fields
    if (!name || !email || !role) {
      return res.status(400).json({
        message: "Name, email, and role are required",
      });
    }

    // 2. Validate role
    const validRoles = ["advisor", "reviewer", "student"];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        message: "Invalid role. Must be: advisor, reviewer, or student",
      });
    }

    const normalizedRole = role.toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Check for duplicate email in both User and Student collections
    const existingUser = await User.findOne({ email: normalizedEmail });
    const existingStudent = await Student.findOne({ email: normalizedEmail });

    if (existingUser || existingStudent) {
      return res.status(400).json({
        message: "A user with this email already exists",
      });
    }

    // 4. For students, advisorId is required
    if (normalizedRole === "student" && !advisorId) {
      return res.status(400).json({
        message: "Advisor ID is required for student creation",
      });
    }

    // 5. Generate secure temporary password (12 characters)
    const tempPassword = crypto.randomBytes(6).toString("hex");

    // 6. Hash password
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // 7. Set password expiration (3 days from now)
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 3);

    let newUser;

    // 8. Create user in appropriate collection
    if (normalizedRole === "student") {
      // Create student
      newUser = new Student({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        mustChangePassword: true,
        passwordExpiresAt,
        advisorId,
        status: "active",
      });
    } else {
      // Create advisor or reviewer
      newUser = new User({
        name: name.trim(),
        email: normalizedEmail,
        role: normalizedRole,
        passwordHash,
        mustChangePassword: true,
        passwordExpiresAt,
        domain: domain || undefined,
        status: "active",
      });
    }

    await newUser.save();

    // 9. Send credentials via email
    try {
      await sendUserCredentials(normalizedEmail, name.trim(), tempPassword);
    } catch (emailErr) {
      console.error("Email sending failed:", emailErr.message);
      // User is created successfully, just log the email error
    }

    // 10. Return success response
    return res.status(201).json({
      message: `${normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)} created successfully`,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: normalizedRole,
      },
    });
  } catch (err) {
    console.error("Create user error:", err);

    // === PHASE 2: Race Condition Hardening ===
    // Handle E11000 duplicate key error (race condition where two requests
    // try to create user with same email simultaneously)
    // The unique index on email will catch this even if findOne check passed
    if (err.code === 11000 || err.name === "MongoServerError" && err.code === 11000) {
      return res.status(400).json({
        message: "A user with this email already exists",
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * Get all users with optional role filter
 * GET /api/admin/users?role=advisor|reviewer|student
 * 
 * PHASE 2 REFACTOR: $unionWith for cross-collection merging
 * - REMOVED: JS array spread [...users, ...students]
 * - REMOVED: JS array.sort() for combined users
 * - ADDED: $unionWith to merge User + Student collections at DB level
 * - ADDED: Final $sort in MongoDB pipeline
 * 
 * Strategy:
 * - If role=student → query only Students
 * - If role=advisor|reviewer → query only Users  
 * - If no role → use $unionWith to merge both collections
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, status } = req.query;

    // === BUILD MATCH CONDITIONS ===
    // These will be used in aggregation $match stages
    const userMatchConditions = { role: { $ne: "admin" } };
    const studentMatchConditions = {};

    if (status) {
      userMatchConditions.status = status;
      studentMatchConditions.status = status;
    }

    // Search filter: Replaces JS filter() with MongoDB $regex
    if (search) {
      const searchRegex = new RegExp(search, "i");
      userMatchConditions.$or = [
        { name: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
      ];
      studentMatchConditions.$or = [
        { name: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
      ];
    }

    // Role filter for users
    if (role === "advisor" || role === "reviewer") {
      userMatchConditions.role = role;
    }

    let allUsers = [];

    // === CASE 1: Only Students (role=student) ===
    if (role === "student") {
      allUsers = await Student.aggregate([
        { $match: studentMatchConditions },
        {
          $lookup: {
            from: "users",
            localField: "advisorId",
            foreignField: "_id",
            as: "advisorInfo",
          },
        },
        { $unwind: { path: "$advisorInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            role: { $literal: "student" },
            domain: {
              $ifNull: [
                "$domain",
                { $ifNull: ["$course", { $ifNull: ["$batch", ""] }] },
              ],
            },
            status: 1,
            avatar: 1,
            advisorName: "$advisorInfo.name",
            createdAt: 1,
            isStudent: { $literal: true },
          },
        },
        { $sort: { createdAt: -1 } },
      ]);
    }
    // === CASE 2: Only Users (role=advisor or role=reviewer) ===
    else if (role === "advisor" || role === "reviewer") {
      allUsers = await User.aggregate([
        { $match: userMatchConditions },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            role: 1,
            domain: 1,
            status: 1,
            avatar: 1,
            createdAt: 1,
            isStudent: { $literal: false },
          },
        },
        { $sort: { createdAt: -1 } },
      ]);
    }
    // === CASE 3: All Users (no role filter) → Use $unionWith ===
    // Replaces: [...users, ...students] + allUsers.sort()
    else {
      allUsers = await User.aggregate([
        // Stage 1: Get Users (advisors, reviewers)
        { $match: userMatchConditions },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            role: 1,
            domain: 1,
            status: 1,
            avatar: 1,
            createdAt: 1,
            isStudent: { $literal: false },
          },
        },

        // Stage 2: $unionWith Students Collection
        // Replaces: [...users, ...students] spread
        {
          $unionWith: {
            coll: "students",
            pipeline: [
              { $match: studentMatchConditions },
              {
                $lookup: {
                  from: "users",
                  localField: "advisorId",
                  foreignField: "_id",
                  as: "advisorInfo",
                },
              },
              { $unwind: { path: "$advisorInfo", preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  email: 1,
                  role: { $literal: "student" },
                  domain: {
                    $ifNull: [
                      "$domain",
                      { $ifNull: ["$course", { $ifNull: ["$batch", ""] }] },
                    ],
                  },
                  status: 1,
                  avatar: 1,
                  advisorName: "$advisorInfo.name",
                  createdAt: 1,
                  isStudent: { $literal: true },
                },
              },
            ],
          },
        },

        // Stage 3: Final Sort (Replaces: array.sort())
        // Previously: allUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        { $sort: { createdAt: -1 } },
      ]);
    }

    res.json({ users: allUsers });
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get single user by ID
 * GET /api/admin/users/:id
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'student' or 'user'

    let user;

    if (type === "student") {
      user = await Student.findById(id)
        .populate("advisorId", "name email")
        .lean();
      if (user) {
        user.role = "student";
        user.isStudent = true;
      }
    } else {
      user = await User.findById(id).lean();
      if (user) {
        user.isStudent = false;
      }
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    console.error("Get user by ID error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update user details
 * PATCH /api/admin/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'student' or 'user'
    const { name, domain, phone, batch, course } = req.body;

    let user;
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (phone) updateData.phone = phone.trim();

    if (type === "student") {
      if (batch) updateData.batch = batch.trim();
      if (course) updateData.course = course.trim();
      if (domain) updateData.domain = domain.trim();

      user = await Student.findByIdAndUpdate(id, updateData, { new: true }).lean();
      if (user) {
        user.role = "student";
      }
    } else {
      if (domain) updateData.domain = domain.trim();

      user = await User.findByIdAndUpdate(id, updateData, { new: true }).lean();
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User updated successfully",
      user,
    });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Toggle user status (active/inactive)
 * PATCH /api/admin/users/:id/status
 * 
 * PHASE 2 REFACTOR: Atomic operation
 * - REMOVED: findById → mutate → save (2 round trips)
 * - ADDED: findOneAndUpdate with $cond (1 atomic operation)
 * - Benefits: Fewer DB round trips, concurrency-safe
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'student' or 'user'

    let user;
    const Model = type === "student" ? Student : User;

    // === ATOMIC STATUS TOGGLE ===
    // Replaces: findById → read status → modify → save
    // Uses MongoDB aggregation pipeline update (MongoDB 4.2+)
    // The $cond operator toggles status in a single atomic operation
    user = await Model.findByIdAndUpdate(
      id,
      [
        {
          $set: {
            status: {
              $cond: {
                if: { $eq: ["$status", "active"] },
                then: "inactive",
                else: "active",
              },
            },
          },
        },
      ],
      { new: true } // Return updated document
    ).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: `User ${user.status === "active" ? "activated" : "deactivated"} successfully`,
      status: user.status,
    });
  } catch (err) {
    console.error("Toggle user status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Delete user
 * DELETE /api/admin/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'student' or 'user'

    let user;

    if (type === "student") {
      user = await Student.findByIdAndDelete(id);
    } else {
      user = await User.findById(id);

      // Prevent deleting admin users
      if (user && user.role === "admin") {
        return res.status(403).json({ message: "Cannot delete admin users" });
      }

      if (user) {
        await User.findByIdAndDelete(id);
      }
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
