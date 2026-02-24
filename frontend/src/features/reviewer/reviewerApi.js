import api from "../../api/axios";

/* ===========================================
   Reviewer Reviews API
=========================================== */

// Fetch all reviews assigned to the reviewer
export const getMyReviews = () => {
    return api.get("/reviews/reviewer/me");
};

// Fetch completed reviews only (for history page)
export const getCompletedReviews = () => {
    return api.get("/reviews/reviewer/me?status=completed");
};

// Get single review details
export const getSingleReview = (reviewId) => {
    return api.get(`/reviews/reviewer/${reviewId}`);
};

// Accept a review request
export const acceptReview = (reviewId) => {
    return api.patch(`/reviews/reviewer/${reviewId}/accept`);
};

// Reject a review request
export const rejectReview = (reviewId, reason) => {
    return api.patch(`/reviews/reviewer/${reviewId}/reject`, { reason });
};

// Get performance analytics
export const getPerformanceAnalytics = () => {
    return api.get("/reviews/reviewer/performance");
};

// Get dashboard data (stats, upcoming reviews, pending feedback)
export const getReviewerDashboard = () => {
    return api.get("/reviews/reviewer/dashboard");
};

/* ===========================================
   Reviewer Profile API
=========================================== */

// Get reviewer profile
export const getMyReviewerProfile = () => {
    return api.get("/reviews/reviewer/profile");
};

// Update reviewer profile
export const updateMyReviewerProfile = (formData) => {
    return api.put("/reviews/reviewer/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

/* ===========================================
   Review Lifecycle API
=========================================== */

// Mark review as completed and submit evaluation
export const markReviewCompleted = (reviewId, evaluationData) => {
    return api.patch(`/reviews/reviewer/${reviewId}/complete`, evaluationData);
};

// Get review evaluations (role-based visibility)
export const getReviewEvaluations = (reviewId) => {
    return api.get(`/reviews/${reviewId}/evaluations`);
};
