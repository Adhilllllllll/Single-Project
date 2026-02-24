import api from "../../api/axios";

/*
  Advisor API layer
  -----------------
  Endpoints for advisor-specific functionality.
*/

// Fetch advisor dashboard stats
export const getDashboardStats = () => {
  return api.get("/advisor/dashboard");
};

// Fetch advisor profile
export const getAdvisorProfile = () => {
  return api.get("/advisor/me");
};

// Fetch assigned students
export const getAssignedStudents = () => {
  return api.get("/advisor/students");
};

// Fetch single student profile by ID
export const getStudentProfile = (studentId) => {
  return api.get(`/advisor/students/${studentId}`);
};

// Fetch advisor reviews (upcoming, pending, completed)
export const getAdvisorReviews = () => {
  return api.get("/reviews/advisor/me");
};

// Fetch single review by ID
export const getSingleReview = (reviewId) => {
  return api.get(`/reviews/advisor/${reviewId}`);
};

// Reschedule a review
export const rescheduleReview = (reviewId, data) => {
  return api.patch(`/reviews/advisor/${reviewId}/reschedule`, data);
};

// Cancel a review
export const cancelReview = (reviewId, data) => {
  return api.patch(`/reviews/advisor/${reviewId}/cancel`, data);
};

// Approve a pending review score
export const approveReviewScore = (reviewId) => {
  return api.post(`/advisor/reviews/${reviewId}/approve`);
};

// Fetch all reviewers with their availability (for assigning reviews)
export const getReviewersAvailability = () => {
  return api.get("/advisor/reviewers/availability");
};

/* ===========================================
   Review Lifecycle API (Final Scoring)
=========================================== */

// Get completed reviews that need final scoring
export const getCompletedReviewsPendingScore = () => {
  return api.get("/reviews/advisor/completed");
};

// Submit final score for a review
export const submitFinalScore = (reviewId, data) => {
  return api.patch(`/reviews/advisor/${reviewId}/final-score`, data);
};

// Get review evaluations (role-based visibility)
export const getReviewEvaluations = (reviewId) => {
  return api.get(`/reviews/${reviewId}/evaluations`);
};

// Update review details (date, mode, meetingLink, location)
export const updateReviewDetails = (reviewId, data) => {
  return api.patch(`/reviews/advisor/${reviewId}/edit`, data);
};

