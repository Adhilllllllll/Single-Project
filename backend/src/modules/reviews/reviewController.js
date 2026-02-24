/**
 * ========================================================================
 *    REVIEW CONTROLLER
 *    Manages review sessions across Advisor, Reviewer, and Student roles
 * ========================================================================
 * 
 * TABLE OF CONTENTS
 * -----------------
 * 1. INTERNAL HELPERS (Line ~30)
 *    - Response helpers: sendSuccess, sendError, handleControllerError
 *    - Formatters: formatReviewDate, formatReviewForResponse
 *    - Validators: isValidObjectId, toObjectId
 * 
 * 2. ADVISOR FLOWS (Line ~70)
 *    - createReview: Schedule new review session
 *    - getMyAdvisorReviews: List advisor's reviews
 *    - getSingleReview: Get review details
 *    - rescheduleReview: Change review timing
 *    - cancelReview: Cancel a scheduled review
 *    - updateReviewDetails: Edit review mode/link/location
 *    - submitFinalScore: Submit final evaluation
 *    - getCompletedReviewsForAdvisor: Reviews pending final score
 * 
 * 3. REVIEWER FLOWS (Line ~350)
 *    - getMyReviewerReviews: List assigned reviews
 *    - acceptReviewByReviewer: Accept review assignment
 *    - rejectReviewByReviewer: Decline with reason
 *    - getSingleReviewByReviewer: Get review details
 *    - markReviewCompleted: Submit reviewer evaluation
 *    - getReviewerDashboard: Dashboard stats + data
 *    - getReviewerProfile: Get profile info
 *    - updateReviewerProfile: Update profile
 *    - getPerformanceAnalytics: Historical analytics
 *    - getReviewerCompletedHistory: Paginated history
 * 
 * 4. STUDENT FLOWS (Line ~720)
 *    - getStudentUpcomingReviews: Scheduled + predicted reviews
 *    - getStudentReviewHistory: Past reviews
 *    - getStudentReviewReport: Single review report
 *    - getStudentProgress: Progress metrics
 * 
 * 5. SHARED / MULTI-ROLE (Line ~1270)
 *    - getReviewEvaluations: Role-based evaluation access
 * 
 * ========================================================================
 */

const ReviewSession = require("./reviewSession");
const ReviewerEvaluation = require("./ReviewerEvaluation");
const FinalEvaluation = require("./FinalEvaluation");
const Student = require("../students/student");
const User = require("../users/User");
const mongoose = require("mongoose");
const Notification = require("../notifications/Notification");
const { sendReviewAssignmentEmail } = require("../auth/emailService");

// Import helpers (Phase 1 refactor)
const {
  formatReviewDate,
  formatReviewForResponse,
  isValidObjectId,
  toObjectId,
} = require("./review.helpers");

// Import validation (Phase 2 refactor)
const {
  ValidationError,
  validateCreateReview,
  validateRescheduleReview,
  validateCancelReview,
  validateUpdateReviewerProfile,
} = require("./review.validation");

// Import service (Phase 3 refactor)
const reviewService = require("./review.service");
const { ServiceError } = reviewService;

/* ========================================================================
   1. RESPONSE HELPERS
   ========================================================================
   Purpose: HTTP response standardization (kept here as they use res object)
   ======================================================================== */

// Response helpers - standardize all responses
const sendSuccess = (res, data, message = "Success", status = 200) => {
  res.status(status).json({ message, ...data });
};

const sendError = (res, message, status = 500) => {
  res.status(status).json({ message });
};

const handleControllerError = (res, err, context, fallbackMsg = "Operation failed") => {
  console.error(`${context} Error:`, err);
  sendError(res, fallbackMsg, 500);
};

/* ========================================================================
   2. ADVISOR FLOWS
   ========================================================================
   Role: Advisor (manages student reviews)
   Purpose: Create, reschedule, cancel reviews; submit final scores
   Side Effects: Notifications to reviewer/student, email on assignment
   ======================================================================== */

/**
 * CREATE REVIEW
 * Schedules a new review session between student and reviewer
 * Side effects: Notification + email to reviewer
 */
exports.createReview = async (req, res) => {
  try {
    const advisorId = req.user.id;

    // Validate input (Phase 2)
    let validated;
    try {
      validated = validateCreateReview(req.body);
    } catch (err) {
      if (err instanceof ValidationError) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }

    // Call service (Phase 3)
    const review = await reviewService.createReview(validated, advisorId);

    return res.status(201).json({
      message: "Review scheduled successfully",
      review,
    });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error("Create Review Error:", err);
    res.status(500).json({ message: "Failed to create review" });
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
      reviewer: toObjectId(req.user.id),
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
      advisor: toObjectId(req.user.id),
    })
      .populate("student", "name email")
      .populate("reviewer", "name email domain")
      .sort({ scheduledAt: -1 })
      .lean();

    const formattedReviews = reviews.map(formatReviewForResponse);
    sendSuccess(res, { reviews: formattedReviews });
  } catch (err) {
    handleControllerError(res, err, "Advisor Reviews", "Failed to fetch advisor reviews");
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

    // Validate input (Phase 2)
    let validated;
    try {
      validated = validateRescheduleReview(req.body);
    } catch (err) {
      if (err instanceof ValidationError) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }

    // Call service (Phase 3)
    const review = await reviewService.rescheduleReview(reviewId, advisorId, validated);

    res.status(200).json({
      message: "Review rescheduled successfully",
      review: {
        id: review._id,
        scheduledAt: review.scheduledAt,
        status: review.status,
        reviewer: review.reviewer,
      }
    });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
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

    // Validate input (Phase 2)
    let validated;
    try {
      validated = validateCancelReview(req.body);
    } catch (err) {
      if (err instanceof ValidationError) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }

    // Call service (Phase 3)
    const review = await reviewService.cancelReview(reviewId, advisorId, validated.reason);

    sendSuccess(res, { reviewId: review._id }, "Review cancelled successfully");
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    handleControllerError(res, err, "Cancel Review", "Failed to cancel review");
  }
};

/* ========================================================================
   3. REVIEWER FLOWS
   ========================================================================
   Role: Reviewer (conducts reviews, provides evaluations)
   Purpose: Accept/reject assignments, submit evaluations, view history
   Side Effects: Status updates, evaluation records
   ======================================================================== */

/**
 * ACCEPT REVIEW
 * Reviewer accepts a pending review assignment
 */
exports.acceptReviewByReviewer = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { reviewId } = req.params;

    // Call service (Phase 3)
    const review = await reviewService.acceptReview(reviewId, reviewerId);

    sendSuccess(res, { reviewId: review._id, status: review.status }, "Review accepted successfully");
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    handleControllerError(res, err, "Accept Review", "Failed to accept review");
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

    // Call service (Phase 3)
    const review = await reviewService.rejectReview(reviewId, reviewerId, reason);

    sendSuccess(res, { reviewId: review._id, status: review.status }, "Review rejected successfully");
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    handleControllerError(res, err, "Reject Review", "Failed to reject review");
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
      .populate("advisor", "name email domain")
      .lean();

    if (!review) return sendError(res, "Review not found", 404);

    sendSuccess(res, {
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
    handleControllerError(res, err, "Get Single Review", "Failed to fetch review");
  }
};

/* ======================================================
   GET PERFORMANCE ANALYTICS – REVIEWER
   
   REFACTORED: MongoDB-First
   - REMOVED: allReviews.filter() for completed reviews
   - REMOVED: completedReviews.filter() for monthly/marks filtering  
   - REMOVED: forEach() for timeliness counting
   - REMOVED: forEach() for rating breakdown
   - REMOVED: for loop for monthly reviews
   - ADDED: Single $facet aggregation for all stats
====================================================== */
exports.getPerformanceAnalytics = async (req, res) => {
  try {
    const reviewerId = toObjectId(req.user.id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // === SINGLE AGGREGATION WITH $facet ===
    // Replaces: 15+ JS array operations (filter, forEach, reduce)
    const [result] = await ReviewSession.aggregate([
      // Stage 1: Match all reviews for this reviewer
      { $match: { reviewer: reviewerId } },

      // Stage 2: $facet - compute all stats in parallel
      {
        $facet: {
          // === Total completed count ===
          // Replaces: completedReviews.length
          totalCompleted: [
            { $match: { status: "completed" } },
            { $count: "count" },
          ],

          // === Reviews this month ===
          // Replaces: completedReviews.filter(r => new Date(r.updatedAt) >= startOfMonth).length
          reviewsThisMonth: [
            {
              $match: {
                status: "completed",
                updatedAt: { $gte: startOfMonth },
              },
            },
            { $count: "count" },
          ],

          // === Average rating (marks/10 → rating/5) ===
          // Replaces: reviewsWithMarks.reduce((sum, r) => sum + r.marks, 0) / length
          avgRating: [
            {
              $match: {
                status: "completed",
                marks: { $exists: true, $ne: null },
              },
            },
            {
              $group: {
                _id: null,
                avg: { $avg: "$marks" },
                count: { $sum: 1 },
              },
            },
          ],

          // === Timeliness (hours to complete) ===
          // Replaces: completedReviews.forEach + hoursToComplete calculation
          timeliness: [
            { $match: { status: "completed" } },
            {
              $project: {
                hoursToComplete: {
                  $divide: [
                    { $subtract: ["$updatedAt", "$scheduledAt"] },
                    1000 * 60 * 60, // Convert ms to hours
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                within24Hours: {
                  $sum: { $cond: [{ $lte: ["$hoursToComplete", 24] }, 1, 0] },
                },
                within48Hours: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gt: ["$hoursToComplete", 24] },
                          { $lte: ["$hoursToComplete", 48] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                onTimeCount: {
                  $sum: { $cond: [{ $lte: ["$hoursToComplete", 48] }, 1, 0] },
                },
                total: { $sum: 1 },
              },
            },
          ],

          // === Monthly reviews (last 6 months) ===
          // Replaces: for loop with filter() for each month
          monthlyReviews: [
            {
              $match: {
                status: "completed",
                updatedAt: { $gte: sixMonthsAgo },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$updatedAt" },
                  month: { $month: "$updatedAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],

          // === Active reviews (workload) ===
          // Replaces: allReviews.filter(r => ["pending", "accepted", "scheduled"].includes(r.status)).length
          activeReviews: [
            { $match: { status: { $in: ["pending", "accepted", "scheduled"] } } },
            { $count: "count" },
          ],

          // === Rating breakdown (convert marks 0-10 to stars 1-5) ===
          // Replaces: reviewsWithMarks.forEach + star calculation
          ratingBreakdown: [
            {
              $match: {
                status: "completed",
                marks: { $exists: true, $ne: null },
              },
            },
            {
              $project: {
                stars: {
                  $min: [
                    5,
                    { $max: [1, { $ceil: { $divide: ["$marks", 2] } }] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: "$stars",
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    // === EXTRACT RESULTS (handle empty cases) ===
    const totalReviews = result.totalCompleted[0]?.count || 0;
    const reviewsThisMonth = result.reviewsThisMonth[0]?.count || 0;

    // Average rating: marks/10 → 5-star scale
    const avgData = result.avgRating[0];
    const avgRating = avgData ? Math.round((avgData.avg / 2) * 10) / 10 : 0;
    const totalRatings = avgData?.count || 0;

    // Timeliness
    const timeData = result.timeliness[0] || {};
    const within24Hours = timeData.within24Hours || 0;
    const within48Hours = timeData.within48Hours || 0;
    const onTimeCount = timeData.onTimeCount || 0;
    const onTimePercentage = totalReviews > 0
      ? Math.round((onTimeCount / totalReviews) * 100)
      : 0;

    // Monthly reviews - format with month names
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyReviews = [];

    // Build last 6 months with 0s for missing months
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthNum = monthDate.getMonth() + 1; // 1-indexed
      const yearNum = monthDate.getFullYear();

      const found = result.monthlyReviews.find(
        m => m._id.month === monthNum && m._id.year === yearNum
      );

      monthlyReviews.push({
        month: monthNames[monthDate.getMonth()],
        count: found?.count || 0,
      });
    }

    // Active reviews (workload)
    const activeReviews = result.activeReviews[0]?.count || 0;
    const maxCapacity = 10;
    const availableSlots = Math.max(0, maxCapacity - activeReviews);
    const currentLoadPercentage = Math.round((activeReviews / maxCapacity) * 100);

    // Rating breakdown - ensure all stars 1-5 are present
    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    result.ratingBreakdown.forEach(r => {
      if (r._id >= 1 && r._id <= 5) {
        ratingBreakdown[r._id] = r.count;
      }
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
        totalRatings,
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
   
   REFACTORED: MongoDB-First
   - REMOVED: allReviews.filter() for week/status filtering
   - REMOVED: allReviews.filter().slice().map() chains
   - REMOVED: reduce() for average calculation
   - ADDED: Single $facet aggregation for stats + lists
   - ADDED: $lookup for student/advisor population
====================================================== */
exports.getReviewerDashboard = async (req, res) => {
  try {
    const reviewerId = toObjectId(req.user.id);
    const now = new Date();

    // Calculate week boundaries
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // === SINGLE AGGREGATION WITH $facet ===
    // Replaces: 10 JS array operations (filter, slice, map, reduce)
    const [result] = await ReviewSession.aggregate([
      // Stage 1: Match all reviews for this reviewer
      { $match: { reviewer: reviewerId } },

      // Stage 2: $facet - compute all stats + lists in parallel
      {
        $facet: {
          // === Reviews this week count ===
          // Replaces: allReviews.filter(r => date >= startOfWeek && date < endOfWeek && status in [...]).length
          reviewsThisWeek: [
            {
              $match: {
                scheduledAt: { $gte: startOfWeek, $lt: endOfWeek },
                status: { $in: ["scheduled", "accepted", "pending"] },
              },
            },
            { $count: "count" },
          ],

          // === Pending feedback count ===
          // Replaces: allReviews.filter(r => status === "completed" && marks === undefined).length
          pendingFeedback: [
            {
              $match: {
                status: "completed",
                $or: [
                  { marks: { $exists: false } },
                  { marks: null },
                ],
              },
            },
            { $count: "count" },
          ],

          // === Total completed ===
          // Replaces: allReviews.filter(r => r.status === "completed").length
          totalCompleted: [
            { $match: { status: "completed" } },
            { $count: "count" },
          ],

          // === Average rating ===
          // Replaces: reviewsWithMarks.reduce((sum, r) => sum + r.marks, 0) / length / 2
          avgRating: [
            {
              $match: {
                status: "completed",
                marks: { $exists: true, $ne: null },
              },
            },
            {
              $group: {
                _id: null,
                avg: { $avg: "$marks" },
              },
            },
          ],

          // === Upcoming reviews (limit 5) ===
          // Replaces: allReviews.filter().slice(0, 5).map()
          upcomingReviews: [
            {
              $match: {
                status: { $in: ["scheduled", "accepted"] },
                scheduledAt: { $gte: now },
              },
            },
            { $sort: { scheduledAt: 1 } },
            { $limit: 5 },
            // Lookup student
            {
              $lookup: {
                from: "students",
                localField: "student",
                foreignField: "_id",
                as: "studentData",
                pipeline: [{ $project: { name: 1, email: 1 } }],
              },
            },
            // Lookup advisor
            {
              $lookup: {
                from: "users",
                localField: "advisor",
                foreignField: "_id",
                as: "advisorData",
                pipeline: [{ $project: { name: 1, email: 1 } }],
              },
            },
            // Format output
            {
              $project: {
                _id: 1,
                student: { $arrayElemAt: ["$studentData", 0] },
                advisor: { $arrayElemAt: ["$advisorData", 0] },
                scheduledAt: 1,
                status: 1,
                mode: 1,
                meetingLink: 1,
              },
            },
          ],

          // === Pending feedback list (limit 5) ===
          // Replaces: pendingFeedbackReviews.slice(0, 5).map()
          pendingFeedbackList: [
            {
              $match: {
                status: "completed",
                $or: [
                  { marks: { $exists: false } },
                  { marks: null },
                ],
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 5 },
            // Lookup student
            {
              $lookup: {
                from: "students",
                localField: "student",
                foreignField: "_id",
                as: "studentData",
                pipeline: [{ $project: { name: 1, email: 1 } }],
              },
            },
            // Format output
            {
              $project: {
                _id: 1,
                student: { $arrayElemAt: ["$studentData", 0] },
                scheduledAt: 1,
                updatedAt: 1,
              },
            },
          ],
        },
      },
    ]);

    // === EXTRACT RESULTS ===
    const reviewsThisWeek = result.reviewsThisWeek[0]?.count || 0;
    const pendingFeedback = result.pendingFeedback[0]?.count || 0;
    const totalCompleted = result.totalCompleted[0]?.count || 0;

    // Average rating: marks/10 → 5-star scale
    const avgData = result.avgRating[0];
    const avgRating = avgData ? parseFloat((avgData.avg / 2).toFixed(1)) : 0;

    res.status(200).json({
      stats: {
        reviewsThisWeek,
        pendingFeedback,
        totalCompleted,
        avgRating,
      },
      upcomingReviews: result.upcomingReviews,
      pendingFeedbackList: result.pendingFeedbackList,
    });
  } catch (err) {
    console.error("REVIEWER DASHBOARD ERROR:", err);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
};


/* ========================================================================
   4. STUDENT FLOWS
   ========================================================================
   Role: Student (view their reviews and progress)
   Purpose: Access upcoming reviews, history, reports, progress metrics
   Side Effects: None (read-only operations)
   ======================================================================== */

/**
 * GET STUDENT UPCOMING REVIEWS
 * Returns scheduled reviews + calculated next expected review
 */
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

    // Format scheduled reviews
    const scheduledReviews = upcomingReviews.map((r) => ({
      _id: r._id,
      reviewer: r.reviewer,
      advisor: r.advisor,
      scheduledAt: r.scheduledAt,
      status: r.status,
      mode: r.mode,
      meetingLink: r.meetingLink,
      location: r.location,
      week: r.week,
      type: "scheduled", // Explicitly scheduled by advisor
    }));

    // ========== CALCULATE NEXT EXPECTED REVIEW ==========
    // Get the last completed/scored review for this student
    const lastCompletedReview = await ReviewSession.findOne({
      student: studentId,
      status: { $in: ["completed", "scored"] },
    })
      .sort({ scheduledAt: -1 })
      .lean();

    let nextExpectedReview = null;

    if (lastCompletedReview) {
      // Calculate next expected date: lastCompleted + 7 days
      const lastReviewDate = new Date(lastCompletedReview.scheduledAt);
      const nextExpectedDate = new Date(lastReviewDate);
      nextExpectedDate.setDate(nextExpectedDate.getDate() + 7);

      // Only show if no scheduled review exists for that week
      // and the date is in the future
      const hasScheduledForNextWeek = scheduledReviews.some(r => {
        const scheduledDate = new Date(r.scheduledAt);
        const diffDays = Math.abs((scheduledDate - nextExpectedDate) / (1000 * 60 * 60 * 24));
        return diffDays <= 3; // Within 3 days tolerance
      });

      if (!hasScheduledForNextWeek && nextExpectedDate > now) {
        nextExpectedReview = {
          expectedDate: nextExpectedDate,
          lastReviewDate: lastReviewDate,
          lastReviewWeek: lastCompletedReview.week,
          nextWeek: (lastCompletedReview.week || 0) + 1,
          type: "expected", // Auto-calculated, not yet scheduled
          message: "Based on weekly review cycle",
        };
      }
    }

    res.status(200).json({
      upcomingReviews: scheduledReviews,
      nextExpectedReview,
      stats: {
        totalScheduled: scheduledReviews.length,
        hasNextExpected: !!nextExpectedReview,
      }
    });
  } catch (err) {
    console.error("STUDENT UPCOMING REVIEWS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch upcoming reviews" });
  }
};

/* ======================================================
   GET STUDENT REVIEW HISTORY
   
   REFACTORED: MongoDB-First
   - REMOVED: completedReviews.map() for formatting
   - ADDED: $project with $cond for score calculation
   - ADDED: $lookup for reviewer/advisor population
====================================================== */
exports.getStudentReviewHistory = async (req, res) => {
  try {
    const studentId = new mongoose.Types.ObjectId(req.user.id);

    // === AGGREGATION WITH $project FOR FORMATTING ===
    // Replaces: completedReviews.map(r => ({ ... }))
    const reviewHistory = await ReviewSession.aggregate([
      // Match completed/scored reviews for this student
      {
        $match: {
          student: studentId,
          status: { $in: ["completed", "scored"] },
        },
      },
      // Sort by completion date descending
      { $sort: { updatedAt: -1 } },
      // Lookup reviewer
      {
        $lookup: {
          from: "users",
          localField: "reviewer",
          foreignField: "_id",
          as: "reviewerData",
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      // Lookup advisor
      {
        $lookup: {
          from: "users",
          localField: "advisor",
          foreignField: "_id",
          as: "advisorData",
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      // Project final format
      // Replaces: .map(r => ({ _id, reviewer, advisor, score: Math.round(r.marks * 10), ... }))
      {
        $project: {
          _id: 1,
          reviewer: { $arrayElemAt: ["$reviewerData", 0] },
          advisor: { $arrayElemAt: ["$advisorData", 0] },
          scheduledAt: 1,
          completedAt: "$updatedAt",
          status: 1,
          marks: 1,
          // Convert marks (0-10) to percentage
          score: {
            $cond: [
              { $and: [{ $ne: ["$marks", null] }, { $type: "$marks" }] },
              { $round: [{ $multiply: ["$marks", 10] }, 0] },
              null,
            ],
          },
          feedback: 1,
          week: 1,
        },
      },
    ]);

    res.status(200).json({ reviewHistory });
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

    // Fetch FinalEvaluation if review is scored
    let finalEvaluation = null;
    if (review.status === "scored") {
      finalEvaluation = await FinalEvaluation.findOne({
        reviewSession: review._id,
      }).lean();
    }

    // Fetch ReviewerEvaluation for additional context
    let reviewerEvaluation = null;
    if (review.status === "completed" || review.status === "scored") {
      reviewerEvaluation = await ReviewerEvaluation.findOne({
        reviewSession: review._id,
      }).lean();
    }

    // Format report response with all evaluation data
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

      // FinalEvaluation data (from advisor - authoritative scores)
      finalEvaluation: finalEvaluation ? {
        finalScore: finalEvaluation.finalScore,
        attendance: finalEvaluation.attendance,
        discipline: finalEvaluation.discipline,
        adjustedScores: finalEvaluation.adjustedScores,
        finalRemarks: finalEvaluation.finalRemarks,
      } : null,

      // ReviewerEvaluation data (from reviewer)
      reviewerEvaluation: reviewerEvaluation ? {
        scores: reviewerEvaluation.scores,
        averageScore: reviewerEvaluation.averageScore,
        feedback: reviewerEvaluation.feedback,
        remarks: reviewerEvaluation.remarks,
      } : null,
    };

    res.status(200).json({ report });
  } catch (err) {
    console.error("STUDENT REVIEW REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to fetch review report" });
  }
};

/* ======================================================
   GET STUDENT PROGRESS DATA
   
   REFACTORED: MongoDB-First
   - REMOVED: allReviews.filter() for completed status
   - REMOVED: completedReviews.filter() for marks filter
   - REMOVED: reduce() for average calculation
   - REMOVED: filter().map().sort() for weekly progress
   - ADDED: $facet aggregation for stats
   - ADDED: $project with $cond for severity calculation
   - KEPT: Text processing for improvement areas (appropriate for JS)
====================================================== */
exports.getStudentProgress = async (req, res) => {
  try {
    const studentId = new mongoose.Types.ObjectId(req.user.id);

    // === AGGREGATION FOR STATS + WEEKLY PROGRESS ===
    // Replaces: filter, reduce, map operations on fetched data
    const [result] = await ReviewSession.aggregate([
      { $match: { student: studentId } },

      {
        $facet: {
          // === Total reviews count ===
          // Replaces: allReviews.length
          totalCount: [{ $count: "count" }],

          // === Completed/scored count and average ===
          // Replaces: completedReviews.filter().length + reduce() for avg
          completedStats: [
            { $match: { status: { $in: ["completed", "scored"] } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                avgMarks: {
                  $avg: {
                    $cond: [
                      { $and: [{ $ne: ["$marks", null] }, { $type: "$marks" }] },
                      "$marks",
                      null,
                    ],
                  },
                },
              },
            },
          ],

          // === Weekly progress (completed with marks) ===
          // Replaces: allReviews.filter().map().sort()
          weeklyProgress: [
            {
              $match: {
                status: { $in: ["completed", "scored"] },
                marks: { $exists: true, $ne: null },
              },
            },
            { $sort: { week: 1 } },
            {
              $project: {
                week: 1,
                score: { $round: [{ $multiply: ["$marks", 10] }, 0] },
                date: "$scheduledAt",
                // Severity: ≥8 green, 6-7 yellow, <6 red
                severity: {
                  $switch: {
                    branches: [
                      { case: { $gte: ["$marks", 8] }, then: "green" },
                      { case: { $gte: ["$marks", 6] }, then: "yellow" },
                    ],
                    default: "red",
                  },
                },
              },
            },
          ],

          // === Milestones (all reviews) ===
          // Replaces: allReviews.map()
          milestones: [
            { $sort: { scheduledAt: 1 } },
            {
              $lookup: {
                from: "users",
                localField: "reviewer",
                foreignField: "_id",
                as: "reviewerData",
                pipeline: [{ $project: { name: 1 } }],
              },
            },
            {
              $project: {
                _id: 1,
                title: { $concat: ["Week ", { $toString: "$week" }, " Review"] },
                date: "$scheduledAt",
                status: 1,
                reviewer: { $arrayElemAt: ["$reviewerData.name", 0] },
                score: {
                  $cond: [
                    { $and: [{ $ne: ["$marks", null] }, { $type: "$marks" }] },
                    { $round: [{ $multiply: ["$marks", 10] }, 0] },
                    null,
                  ],
                },
              },
            },
          ],

          // === Completed reviews with feedback (for text processing) ===
          // This minimal projection fetches only what's needed for JS text processing
          feedbackData: [
            {
              $match: {
                status: { $in: ["completed", "scored"] },
                feedback: { $exists: true, $ne: "" },
              },
            },
            {
              $project: {
                feedback: 1,
                marks: 1,
              },
            },
          ],
        },
      },
    ]);

    // === EXTRACT STATS ===
    const totalReviews = result.totalCount[0]?.count || 0;
    const completedCount = result.completedStats[0]?.count || 0;
    const avgMarks = result.completedStats[0]?.avgMarks || 0;
    const avgScore = avgMarks > 0 ? Math.round(avgMarks * 10) : 0;

    const overallProgress = totalReviews > 0
      ? Math.round((completedCount / totalReviews) * 100)
      : 0;

    // === IMPROVEMENT AREAS (Text processing - stays in JS) ===
    // This is appropriate for JS as it's string manipulation
    const improvementAreas = [];
    const uniqueFeedback = new Set();

    result.feedbackData.forEach(r => {
      if (r.feedback && r.feedback.trim()) {
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

    // Default suggestions if no feedback extracted
    if (improvementAreas.length === 0) {
      const hasLowScores = result.feedbackData.some(r => r.marks !== undefined && r.marks < 7);
      if (hasLowScores) {
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
      weeklyProgress: result.weeklyProgress,
      milestones: result.milestones,
      improvementAreas,
    });
  } catch (err) {
    console.error("STUDENT PROGRESS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch progress data" });
  }
};


/* ======================================================
   MARK REVIEW AS COMPLETED + SUBMIT EVALUATION – REVIEWER
====================================================== */
exports.markReviewCompleted = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { reviewId } = req.params;
    const { scores, feedback, remarks } = req.body;

    // Validate required fields
    if (!scores || !feedback) {
      return res.status(400).json({
        message: "Scores and feedback are required"
      });
    }

    // Validate scores structure (4 task-wise scores, NO overallPerformance)
    const requiredScores = [
      'technicalUnderstanding',
      'taskCompletion',
      'communication',
      'problemSolving'
    ];

    for (const scoreKey of requiredScores) {
      if (scores[scoreKey] === undefined || scores[scoreKey] === null) {
        return res.status(400).json({
          message: `Score for ${scoreKey} is required`
        });
      }
      if (scores[scoreKey] < 0 || scores[scoreKey] > 10) {
        return res.status(400).json({
          message: `Score for ${scoreKey} must be between 0 and 10`
        });
      }
      // Validate 0.5 step
      if ((scores[scoreKey] * 10) % 5 !== 0) {
        return res.status(400).json({
          message: `Score for ${scoreKey} must be in 0.5 increments`
        });
      }
    }

    // Find the review
    const review = await ReviewSession.findOne({
      _id: reviewId,
      reviewer: reviewerId,
    }).populate("advisor", "name email");

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Validate status transition - only accepted reviews can be completed
    if (review.status !== "accepted") {
      return res.status(400).json({
        message: `Cannot mark review as completed. Current status: ${review.status}. Only accepted reviews can be completed.`,
      });
    }

    // Check if evaluation already exists
    const existingEvaluation = await ReviewerEvaluation.findOne({
      reviewSession: reviewId,
    });

    if (existingEvaluation) {
      return res.status(400).json({
        message: "Evaluation already submitted for this review",
      });
    }

    // Create reviewer evaluation (4 task-wise scores only)
    const evaluation = new ReviewerEvaluation({
      reviewSession: reviewId,
      reviewer: reviewerId,
      scores: {
        technicalUnderstanding: scores.technicalUnderstanding,
        taskCompletion: scores.taskCompletion,
        communication: scores.communication,
        problemSolving: scores.problemSolving,
      },
      feedback: feedback.trim(),
      remarks: remarks?.trim() || "",
    });

    await evaluation.save();

    // Update review status to completed
    review.status = "completed";
    review.feedback = feedback.trim();
    await review.save();

    // Create notification for advisor
    try {
      await Notification.create({
        recipient: review.advisor._id,
        type: "review_completed",
        title: "Review Completed",
        message: `Review has been completed and evaluation submitted. Ready for final scoring.`,
        data: {
          reviewId: review._id,
          reviewerEvaluationId: evaluation._id,
        },
      });
    } catch (notifErr) {
      console.error("Failed to create notification:", notifErr);
      // Don't fail the request if notification fails
    }

    res.status(200).json({
      message: "Review marked as completed and evaluation submitted successfully",
      reviewId: review._id,
      status: review.status,
      evaluation: {
        id: evaluation._id,
        averageScore: evaluation.averageScore,
      },
    });
  } catch (err) {
    console.error("Mark Review Completed Error:", err);
    res.status(500).json({ message: "Failed to complete review" });
  }
};

/* ======================================================
   SUBMIT FINAL SCORE – ADVISOR
====================================================== */
exports.submitFinalScore = async (req, res) => {
  try {
    const advisorId = req.user.id;
    const { reviewId } = req.params;
    const { finalScore, attendance, discipline, adjustedScores, finalRemarks } = req.body;

    // Validate required fields
    if (finalScore === undefined || finalScore === null) {
      return res.status(400).json({
        message: "Final score is required"
      });
    }

    // Validate score ranges and 0.5 step
    const validateScore = (score, name) => {
      if (score < 0 || score > 10) {
        return `${name} must be between 0 and 10`;
      }
      if ((score * 10) % 5 !== 0) {
        return `${name} must be in 0.5 increments`;
      }
      return null;
    };

    const finalScoreError = validateScore(finalScore, "Final score");
    if (finalScoreError) {
      return res.status(400).json({ message: finalScoreError });
    }

    // Validate attendance if provided
    if (attendance !== undefined && attendance !== null) {
      const attendanceError = validateScore(attendance, "Attendance");
      if (attendanceError) {
        return res.status(400).json({ message: attendanceError });
      }
    }

    // Validate discipline if provided
    if (discipline !== undefined && discipline !== null) {
      const disciplineError = validateScore(discipline, "Discipline");
      if (disciplineError) {
        return res.status(400).json({ message: disciplineError });
      }
    }

    // Find the review
    const review = await ReviewSession.findOne({
      _id: reviewId,
      advisor: advisorId,
    })
      .populate("student", "name email")
      .populate("reviewer", "name email");

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Validate status transition - only completed reviews can be scored
    if (review.status !== "completed") {
      return res.status(400).json({
        message: `Cannot submit final score. Current status: ${review.status}. Only completed reviews can be scored.`,
      });
    }

    // Get reviewer evaluation
    const reviewerEvaluation = await ReviewerEvaluation.findOne({
      reviewSession: reviewId,
    });

    if (!reviewerEvaluation) {
      return res.status(400).json({
        message: "Reviewer evaluation not found. Reviewer must complete evaluation first.",
      });
    }

    // Check if final evaluation already exists
    const existingFinalEval = await FinalEvaluation.findOne({
      reviewSession: reviewId,
    });

    if (existingFinalEval) {
      return res.status(400).json({
        message: "Final score already submitted for this review",
      });
    }

    // Create final evaluation with attendance and discipline
    const finalEvaluation = new FinalEvaluation({
      reviewSession: reviewId,
      advisor: advisorId,
      reviewerEvaluation: reviewerEvaluation._id,
      finalScore,
      attendance: attendance || 0,
      discipline: discipline || 0,
      adjustedScores: adjustedScores || {},
      finalRemarks: finalRemarks?.trim() || "",
    });

    await finalEvaluation.save();

    // Update review status to scored and store final marks
    review.status = "scored";
    review.marks = finalScore;
    await review.save();

    // Create notification for student
    try {
      await Notification.create({
        recipient: review.student._id,
        type: "final_score_published",
        title: "Final Score Published",
        message: `Your review score has been finalized. Final Score: ${finalScore}/10`,
        data: {
          reviewId: review._id,
          finalScore,
        },
      });
    } catch (notifErr) {
      console.error("Failed to create notification:", notifErr);
    }

    // Create notification for reviewer (read-only visibility)
    try {
      await Notification.create({
        recipient: review.reviewer._id,
        type: "final_score_published",
        title: "Final Score Published",
        message: `The advisor has finalized the score for the review you conducted.`,
        data: {
          reviewId: review._id,
          finalScore,
        },
      });
    } catch (notifErr) {
      console.error("Failed to create notification:", notifErr);
    }

    res.status(200).json({
      message: "Final score submitted successfully",
      reviewId: review._id,
      status: review.status,
      finalEvaluation: {
        id: finalEvaluation._id,
        finalScore,
      },
    });
  } catch (err) {
    console.error("Submit Final Score Error:", err);
    res.status(500).json({ message: "Failed to submit final score" });
  }
};

/* ======================================================
   GET REVIEW EVALUATIONS – ROLE-BASED ACCESS
====================================================== */
exports.getReviewEvaluations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { reviewId } = req.params;

    // Find the review
    const review = await ReviewSession.findById(reviewId)
      .populate("student", "name email")
      .populate("reviewer", "name email")
      .populate("advisor", "name email");

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Role-based access control
    const isAdvisor = review.advisor._id.toString() === userId;
    const isReviewer = review.reviewer._id.toString() === userId;
    const isStudent = review.student._id.toString() === userId;

    if (!isAdvisor && !isReviewer && !isStudent) {
      return res.status(403).json({
        message: "You don't have permission to view this review's evaluations"
      });
    }

    // Get reviewer evaluation
    const reviewerEvaluation = await ReviewerEvaluation.findOne({
      reviewSession: reviewId,
    }).populate("reviewer", "name email");

    // Get final evaluation
    const finalEvaluation = await FinalEvaluation.findOne({
      reviewSession: reviewId,
    }).populate("advisor", "name email");

    // Build response based on role
    const response = {
      review: {
        id: review._id,
        status: review.status,
        scheduledAt: review.scheduledAt,
        student: review.student,
        reviewer: review.reviewer,
        advisor: review.advisor,
        week: review.week,
      },
    };

    // Reviewer can see their own evaluation
    // Advisor can see reviewer evaluation
    // Student cannot see reviewer evaluation (only final)
    if ((isReviewer || isAdvisor) && reviewerEvaluation) {
      response.reviewerEvaluation = {
        id: reviewerEvaluation._id,
        scores: reviewerEvaluation.scores,
        averageScore: reviewerEvaluation.averageScore,
        feedback: reviewerEvaluation.feedback,
        remarks: reviewerEvaluation.remarks,
        submittedAt: reviewerEvaluation.createdAt,
        submittedBy: reviewerEvaluation.reviewer,
      };
    }

    // Final evaluation visible to all participants
    if (finalEvaluation) {
      response.finalEvaluation = {
        id: finalEvaluation._id,
        finalScore: finalEvaluation.finalScore,
        finalRemarks: finalEvaluation.finalRemarks,
        submittedAt: finalEvaluation.createdAt,
        submittedBy: finalEvaluation.advisor,
      };

      // Adjusted scores visible only to advisor
      if (isAdvisor && finalEvaluation.adjustedScores) {
        response.finalEvaluation.adjustedScores = finalEvaluation.adjustedScores;
      }
    }

    res.status(200).json(response);
  } catch (err) {
    console.error("Get Review Evaluations Error:", err);
    res.status(500).json({ message: "Failed to fetch evaluations" });
  }
};

/* ======================================================
   GET COMPLETED REVIEWS FOR ADVISOR (PENDING FINAL SCORE)
====================================================== */
exports.getCompletedReviewsForAdvisor = async (req, res) => {
  try {
    const advisorId = req.user.id;

    // Get all completed reviews for this advisor
    const completedReviews = await ReviewSession.find({
      advisor: advisorId,
      status: "completed",
    })
      .populate("student", "name email")
      .populate("reviewer", "name email")
      .sort({ updatedAt: -1 })
      .lean();

    // Get reviewer evaluations for these reviews
    const reviewIds = completedReviews.map(r => r._id);
    const evaluations = await ReviewerEvaluation.find({
      reviewSession: { $in: reviewIds },
    }).lean();

    // Map evaluations to reviews
    const evaluationMap = {};
    evaluations.forEach(e => {
      evaluationMap[e.reviewSession.toString()] = e;
    });

    // Format response
    const formatted = completedReviews.map(r => ({
      id: r._id,
      student: r.student,
      reviewer: r.reviewer,
      scheduledAt: r.scheduledAt,
      completedAt: r.updatedAt,
      week: r.week,
      status: r.status,
      reviewerEvaluation: evaluationMap[r._id.toString()] ? {
        averageScore: evaluationMap[r._id.toString()].averageScore,
        feedback: evaluationMap[r._id.toString()].feedback,
      } : null,
    }));

    res.status(200).json({ completedReviews: formatted });
  } catch (err) {
    console.error("Get Completed Reviews Error:", err);
    res.status(500).json({ message: "Failed to fetch completed reviews" });
  }
};

/* ======================================================
   UPDATE REVIEW DETAILS – ADVISOR
   Allows editing: scheduledAt, mode, meetingLink, location
   Blocked for: scored, cancelled reviews
====================================================== */
exports.updateReviewDetails = async (req, res) => {
  try {
    const advisorId = req.user.id;
    const { reviewId } = req.params;
    const { scheduledAt, mode, meetingLink, location } = req.body;

    // Find the review
    const review = await ReviewSession.findOne({
      _id: reviewId,
      advisor: advisorId,
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Block editing for scored or cancelled reviews
    if (review.status === "scored" || review.status === "cancelled") {
      return res.status(400).json({
        message: `Cannot edit a ${review.status} review`,
      });
    }

    // Update allowed fields
    if (scheduledAt) {
      review.scheduledAt = new Date(scheduledAt);
    }

    if (mode && ["online", "offline"].includes(mode)) {
      review.mode = mode;
    }

    if (meetingLink !== undefined) {
      review.meetingLink = meetingLink;
    }

    if (location !== undefined) {
      review.location = location;
    }

    await review.save();

    // Populate for response
    await review.populate("student", "name email");
    await review.populate("reviewer", "name email");

    res.status(200).json({
      message: "Review updated successfully",
      review: {
        id: review._id,
        student: review.student,
        reviewer: review.reviewer,
        scheduledAt: review.scheduledAt,
        mode: review.mode,
        meetingLink: review.meetingLink,
        location: review.location,
        status: review.status,
        week: review.week,
      },
    });
  } catch (err) {
    console.error("Update Review Details Error:", err);
    res.status(500).json({ message: "Failed to update review details" });
  }
};

/* ======================================================
   GET REVIEWER COMPLETED HISTORY – REVIEWER
   Returns completed/scored reviews with submitted evaluation scores
====================================================== */
exports.getReviewerCompletedHistory = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { page = 1, limit = 20, sortBy = "date_desc" } = req.query;

    // Build sort option
    let sortOption = { scheduledAt: -1 };
    if (sortBy === "date_asc") sortOption = { scheduledAt: 1 };

    // Get completed/scored reviews for this reviewer
    const reviews = await ReviewSession.find({
      reviewer: new mongoose.Types.ObjectId(reviewerId),
      status: { $in: ["completed", "scored"] },
    })
      .populate("student", "name email")
      .populate("advisor", "name email domain")
      .sort(sortOption)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await ReviewSession.countDocuments({
      reviewer: new mongoose.Types.ObjectId(reviewerId),
      status: { $in: ["completed", "scored"] },
    });

    // Get reviewer evaluations for these reviews
    const reviewIds = reviews.map((r) => r._id);
    const evaluations = await ReviewerEvaluation.find({
      reviewSession: { $in: reviewIds },
    }).lean();

    // Map evaluations by review ID
    const evalMap = {};
    evaluations.forEach((e) => {
      evalMap[e.reviewSession.toString()] = e;
    });

    // Format response with scores
    const formattedHistory = reviews.map((r) => {
      const evaluation = evalMap[r._id.toString()];
      return {
        id: r._id,
        student: {
          id: r.student?._id,
          name: r.student?.name || "Unknown",
          email: r.student?.email || "",
        },
        advisor: {
          id: r.advisor?._id,
          name: r.advisor?.name || "Unknown",
          domain: r.advisor?.domain || "General",
        },
        scheduledAt: r.scheduledAt,
        completedAt: r.updatedAt,
        week: r.week,
        status: r.status,
        mode: r.mode,
        // Reviewer's submitted scores
        scores: evaluation?.scores || null,
        averageScore: evaluation?.averageScore || null,
        feedback: evaluation?.feedback || "",
        remarks: evaluation?.remarks || "",
      };
    });

    res.status(200).json({
      history: formattedHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Get Reviewer History Error:", err);
    res.status(500).json({ message: "Failed to fetch review history" });
  }
};


