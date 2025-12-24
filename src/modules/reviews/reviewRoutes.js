const router = require("express").Router();
const reviewController = require("./reviewController");
const authMiddleware = require("../../middlewares/authMiddleware");



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
   GET REVIEWS – ADVISOR
======================= */
router.get(
    "/advisor/me",
    authMiddleware("advisor"),
    reviewController.getMyAdvisorReviews
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

module.exports = router;

