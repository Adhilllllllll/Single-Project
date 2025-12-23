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

module.exports = router;
