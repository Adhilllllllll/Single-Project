const router = require("express").Router();
const reviewController = require("./reviewController");
const authMiddleware = require("../../middlewares/authMiddleware");
const { uploadAvatar } = require("../../middlewares/upload");

router.use((req, res, next) => {
    console.log("REVIEWS ROUTER HIT:", req.method, req.originalUrl);
    next();
});

/* =======================
   CREATE REVIEW (ADVISOR ONLY)
======================= */
router.post(
    "/",
    authMiddleware("advisor"),
    reviewController.createReview
);

/* =======================
   GET REVIEWS – REVIEWER
======================= */
router.get(
    "/reviewer/me",
    authMiddleware("reviewer"),
    reviewController.getMyReviewerReviews
);

/* =======================
   PERFORMANCE ANALYTICS – REVIEWER (must be before :reviewId)
======================= */
router.get(
    "/reviewer/performance",
    authMiddleware("reviewer"),
    reviewController.getPerformanceAnalytics
);

/* =======================
   REVIEWER COMPLETED HISTORY (must be before :reviewId)
======================= */
router.get(
    "/reviewer/history",
    authMiddleware("reviewer"),
    reviewController.getReviewerCompletedHistory
);


/* =======================
   REVIEWER PROFILE (must be before :reviewId)
======================= */
router.get(
    "/reviewer/profile",
    authMiddleware("reviewer"),
    reviewController.getReviewerProfile
);

router.put(
    "/reviewer/profile",
    authMiddleware("reviewer"),
    uploadAvatar.single("avatar"),
    reviewController.updateReviewerProfile
);

/* =======================
   REVIEWER DASHBOARD (must be before :reviewId)
======================= */
router.get(
    "/reviewer/dashboard",
    authMiddleware("reviewer"),
    reviewController.getReviewerDashboard
);

/* =======================
   STUDENT REVIEWS (must be before :reviewId)
======================= */
router.get(
    "/student/upcoming",
    authMiddleware("student"),
    reviewController.getStudentUpcomingReviews
);

router.get(
    "/student/history",
    authMiddleware("student"),
    reviewController.getStudentReviewHistory
);

router.get(
    "/student/progress",
    authMiddleware("student"),
    reviewController.getStudentProgress
);

router.get(
    "/student/:reviewId/report",
    authMiddleware("student"),
    reviewController.getStudentReviewReport
);

/* =======================
   GET REVIEWS – ADVISOR
======================= */
router.get(
    "/advisor/me",
    authMiddleware("advisor"),
    reviewController.getMyAdvisorReviews
);

/* =======================
   GET COMPLETED REVIEWS PENDING FINAL SCORE – ADVISOR
   (Must be before dynamic :reviewId routes)
======================= */
router.get(
    "/advisor/completed",
    authMiddleware("advisor"),
    reviewController.getCompletedReviewsForAdvisor
);

/* =======================
   GET SINGLE REVIEW – ADVISOR
======================= */
router.get(
    "/advisor/:reviewId",
    authMiddleware("advisor"),
    reviewController.getSingleReview
);

/* =======================
   RESCHEDULE REVIEW – ADVISOR
======================= */
router.patch(
    "/advisor/:reviewId/reschedule",
    authMiddleware("advisor"),
    reviewController.rescheduleReview
);

/* =======================
   CANCEL REVIEW – ADVISOR
======================= */
router.patch(
    "/advisor/:reviewId/cancel",
    authMiddleware("advisor"),
    reviewController.cancelReview
);

/* =======================
   GET SINGLE REVIEW – REVIEWER (dynamic :reviewId - must be AFTER static routes)
======================= */
router.get(
    "/reviewer/:reviewId",
    authMiddleware("reviewer"),
    reviewController.getSingleReviewByReviewer
);

/* =======================
   ACCEPT REVIEW – REVIEWER
======================= */
router.patch(
    "/reviewer/:reviewId/accept",
    authMiddleware("reviewer"),
    reviewController.acceptReviewByReviewer
);

/* =======================
   REJECT REVIEW – REVIEWER
======================= */
router.patch(
    "/reviewer/:reviewId/reject",
    authMiddleware("reviewer"),
    reviewController.rejectReviewByReviewer
);

/* =======================
   MARK REVIEW COMPLETED + SUBMIT EVALUATION – REVIEWER
======================= */
router.patch(
    "/reviewer/:reviewId/complete",
    authMiddleware("reviewer"),
    reviewController.markReviewCompleted
);

/* =======================
   SUBMIT FINAL SCORE – ADVISOR
======================= */
router.patch(
    "/advisor/:reviewId/final-score",
    authMiddleware("advisor"),
    reviewController.submitFinalScore
);

/* =======================
   GET REVIEW EVALUATIONS – ALL ROLES (role-based visibility)
======================= */
router.get(
    "/:reviewId/evaluations",
    authMiddleware(["advisor", "reviewer", "student"]),
    reviewController.getReviewEvaluations
);

/* =======================
   UPDATE REVIEW DETAILS – ADVISOR
======================= */
router.patch(
    "/advisor/:reviewId/edit",
    authMiddleware("advisor"),
    reviewController.updateReviewDetails
);

module.exports = router;

