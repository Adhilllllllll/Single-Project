 

const mongoose = require("mongoose");
const User = require("../users/User");
const Student = require("../students/student");
const reviewerAvailability = require("../reviewerAvailability/ReviewerAvailability")
const ReviewSession = require("../reviews/reviewSession");
const FinalEvaluation = require("../reviews/FinalEvaluation");

/* ======================================================
   HELPERS
====================================================== */

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const sendSuccess = (res, data, message = "Success", status = 200) =>
  res.status(status).json({ message, ...data });

const sendError = (res, message = "Server error", status = 500) =>
  res.status(status).json({ message });

/* ======================================================
   PROFILE
====================================================== */

exports.getMyProfile = async (req, res) => {
  try {
    const advisor = await User.findById(req.user.id)
      .select("-passwordHash")
      .lean();

    if (!advisor) return sendError(res, "Advisor not found", 404);

    sendSuccess(res, { advisor }, "Advisor profile fetched");
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    sendError(res);
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const { name, phone, about } = req.body;

    if (!name?.trim()) {
      return sendError(res, "Name is required", 400);
    }

    const update = {
      name: name.trim(),
      ...(phone && { phone: phone.trim() }),
      ...(about && { about: about.trim() }),
      ...(req.file && { avatar: `/uploads/avatars/${req.file.filename}` }),
    };

    const advisor = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true }
    )
      .select("-passwordHash")
      .lean();

    if (!advisor) return sendError(res, "Advisor not found", 404);

    sendSuccess(res, { advisor }, "Profile updated");
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    sendError(res);
  }
};

/* ======================================================
   DASHBOARD (FULLY DB DRIVEN)
====================================================== */

exports.getDashboard = async (req, res) => {
  try {
    const advisorId = toObjectId(req.user.id);
    const now = new Date();

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const [studentAgg, reviewAgg, pendingScores] = await Promise.all([
      Student.aggregate([
        { $match: { advisorId, status: "active" } },
        {
          $group: {
            _id: null,
            totalStudents: { $sum: 1 },
            avgProgress: { $avg: "$progress" },
          },
        },
      ]),
      ReviewSession.aggregate([
        {
          $match: {
            advisor: advisorId,
            scheduledAt: { $gte: weekStart, $lt: weekEnd },
          },
        },
        { $count: "reviewsThisWeek" },
      ]),
      ReviewSession.countDocuments({
        advisor: advisorId,
        status: "completed",
        scoreApproved: { $ne: true },
      }),
    ]);

    sendSuccess(res, {
      stats: {
        totalStudents: studentAgg[0]?.totalStudents || 0,
        avgProgress: Math.round(studentAgg[0]?.avgProgress || 0),
        reviewsThisWeek: reviewAgg[0]?.reviewsThisWeek || 0,
        pendingScores,
      },
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    sendError(res);
  }
};

/* ======================================================
   STUDENTS
====================================================== */

exports.getAssignedStudents = async (req, res) => {
  try {
    const advisorId = toObjectId(req.user.id);

    // === AGGREGATION to fetch students with their last review date ===
    // Joins ReviewSession collection to get actual last completed review
    const students = await Student.aggregate([
      // Match active students for this advisor
      { $match: { advisorId, status: "active" } },

      // Lookup last completed review for each student
      {
        $lookup: {
          from: "reviewsessions",
          let: { studentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$student", "$$studentId"] },
                status: { $in: ["completed", "scored"] },
              },
            },
            { $sort: { scheduledAt: -1 } },
            { $limit: 1 },
            { $project: { scheduledAt: 1, status: 1 } },
          ],
          as: "lastReview",
        },
      },

      // Format output with fields frontend expects
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          phone: 1,
          course: 1,
          batch: 1,
          progress: { $ifNull: ["$progress", 0] },
          currentWeek: { $ifNull: ["$currentWeek", 1] },
          createdAt: 1,
          // Extract lastReviewDate from the lookup result
          lastReviewDate: { $arrayElemAt: ["$lastReview.scheduledAt", 0] },
          // Compute display status based on progress
          status: {
            $switch: {
              branches: [
                { case: { $gte: [{ $ifNull: ["$progress", 0] }, 80] }, then: "Active" },
                { case: { $gte: [{ $ifNull: ["$progress", 0] }, 50] }, then: "Review" },
              ],
              default: "Pending",
            },
          },
        },
      },

      // Sort by name
      { $sort: { name: 1 } },
    ]);

    sendSuccess(res, {
      students,
      count: students.length,
    });
  } catch (err) {
    console.error("GET STUDENTS ERROR:", err);
    sendError(res);
  }
};



exports.getStudentProfile = async (req, res) => {
  try {
    const advisorId = toObjectId(req.user.id);
    const studentId = toObjectId(req.params.studentId);

    const student = await Student.findOne({
      _id: studentId,
      advisorId,
    })
      .populate("advisorId", "name email")
      .lean();

    if (!student) return sendError(res, "Student not found", 404);

    const reviewStats = await ReviewSession.aggregate([
      { $match: { student: studentId } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $in: ["$status", ["completed", "scored"]] }, 1, 0] },
          },
        },
      },
    ]);

    sendSuccess(res, {
      student: {
        ...student,
        reviewsCompleted: reviewStats[0]?.completed || 0,
        totalReviews: reviewStats[0]?.totalReviews || 0,
      },
    });
  } catch (err) {
    console.error("STUDENT PROFILE ERROR:", err);
    sendError(res);
  }
};

/* ======================================================
   REVIEWERS + AVAILABILITY (NO N+1)
====================================================== */

exports.getReviewersWithAvailability = async (req, res) => {
  try {
    const reviewers = await User.aggregate([
      { $match: { role: "reviewer", status: "active" } },
      {
        $lookup: {
          from: "revieweravailabilities",
          localField: "_id",
          foreignField: "reviewerId",
          as: "slots",
          pipeline: [{ $match: { slotType: { $ne: "break" } } }],
        },
      },
      {
        $addFields: {
          recurringSlots: {
            $filter: {
              input: "$slots",
              as: "s",
              cond: { $eq: ["$$s.availabilityType", "recurring"] },
            },
          },
          specificSlots: {
            $filter: {
              input: "$slots",
              as: "s",
              cond: { $eq: ["$$s.availabilityType", "specific"] },
            },
          },
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          domain: 1,
          reviewerStatus: 1,
          slots: 1,
          recurringSlots: 1,
          specificSlots: 1,
          totalSlots: { $size: "$slots" },
        },
      },
    ]);

    sendSuccess(res, { reviewers });
  } catch (err) {
    console.error("REVIEWERS ERROR:", err);
    sendError(res);
  }
};

/* ======================================================
   ANALYTICS (ENTERPRISE SAFE)
====================================================== */

exports.getAnalytics = async (req, res) => {
  try {
    const advisorId = toObjectId(req.user.id);
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      reviewMetrics,
      scoreMetrics,
      monthlyTrend,
      reviewerPerformance,
      studentPerformance,
    ] = await Promise.all([
      ReviewSession.aggregate([
        { $match: { advisor: advisorId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $in: ["$status", ["completed", "scored"]] }, 1, 0] },
            },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
            scheduled: { $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          },
        },
      ]),
      FinalEvaluation.aggregate([
        {
          $lookup: {
            from: "reviewsessions",
            localField: "reviewSession",
            foreignField: "_id",
            as: "session",
          },
        },
        { $unwind: "$session" },
        { $match: { "session.advisor": advisorId } },
        {
          $group: {
            _id: null,
            avgScore: { $avg: "$finalScore" },
          },
        },
      ]),
      ReviewSession.aggregate([
        { $match: { advisor: advisorId, scheduledAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: "$scheduledAt" }, month: { $month: "$scheduledAt" } },
            total: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      ReviewSession.aggregate([
        { $match: { advisor: advisorId } },
        {
          $group: {
            _id: "$reviewer",
            totalReviews: { $sum: 1 },
          },
        },
        { $sort: { totalReviews: -1 } },
        { $limit: 10 },
      ]),
      ReviewSession.aggregate([
        { $match: { advisor: advisorId } },
        {
          $group: {
            _id: "$student",
            totalReviews: { $sum: 1 },
          },
        },
        { $sort: { totalReviews: -1 } },
        { $limit: 10 },
      ]),
    ]);

    sendSuccess(res, {
      analytics: {
        metrics: reviewMetrics[0] || {},
        avgScore: Math.round(scoreMetrics[0]?.avgScore || 0),
        monthlyTrend,
        reviewerPerformance,
        studentPerformance,
      },
    });
  } catch (err) {
    console.error("ANALYTICS ERROR:", err);
    sendError(res);
  }
};
