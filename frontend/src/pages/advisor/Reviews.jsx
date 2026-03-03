import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdvisorReviews } from "../../features/advisor/advisorSlice";
import { rescheduleReview, cancelReview, submitFinalScore, getReviewEvaluations, updateReviewDetails } from "../../features/advisor/advisorApi";
import ViewReviewModal from "../../components/ViewReviewModal";
import RescheduleReviewModal from "../../components/RescheduleReviewModal";
import CancelReviewModal from "../../components/CancelReviewModal";
import FinalScoringModal from "../../components/FinalScoringModal";

const Reviews = () => {
    const dispatch = useDispatch();
    const { reviews, loading, error } = useSelector((state) => state.advisor);

    // Tab state
    const [activeTab, setActiveTab] = useState("all");

    // Search state
    const [searchQuery, setSearchQuery] = useState("");

    // Modal states
    const [viewModal, setViewModal] = useState({ open: false, review: null });
    const [rescheduleModal, setRescheduleModal] = useState({ open: false, review: null });
    const [cancelModal, setCancelModal] = useState({ open: false, review: null });
    const [finalScoreModal, setFinalScoreModal] = useState({ open: false, review: null, evaluation: null });

    // Loading states for modals
    const [rescheduleLoading, setRescheduleLoading] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [finalScoreLoading, setFinalScoreLoading] = useState(false);

    // Success message
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        dispatch(fetchAdvisorReviews());
    }, [dispatch]);

    // Clear success message after 3 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(""), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Filter reviews by tab and search
    const filteredReviews = useMemo(() => {
        let result = reviews;

        // Filter by status tab
        if (activeTab !== "all") {
            result = result.filter(r => r.status?.toLowerCase() === activeTab);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.student?.toLowerCase().includes(query) ||
                r.reviewer?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [reviews, activeTab, searchQuery]);

    // Modal handlers
    const handleView = useCallback((review) => {
        setViewModal({ open: true, review });
    }, []);

    const handleReschedule = useCallback((review) => {
        setRescheduleModal({ open: true, review });
    }, []);

    const handleCancel = useCallback((review) => {
        setCancelModal({ open: true, review });
    }, []);

    const handleCloseModals = useCallback(() => {
        setViewModal({ open: false, review: null });
        setRescheduleModal({ open: false, review: null });
        setCancelModal({ open: false, review: null });
        setFinalScoreModal({ open: false, review: null, evaluation: null });
    }, []);

    // Handle give final score - fetch evaluation and open modal
    const handleGiveFinalScore = async (review) => {
        try {
            setFinalScoreLoading(true);
            const response = await getReviewEvaluations(review.id);
            setFinalScoreModal({
                open: true,
                review: response.data.review,
                evaluation: response.data.reviewerEvaluation
            });
        } catch (err) {
            console.error("Failed to fetch evaluations:", err);
            alert(err.response?.data?.message || "Failed to fetch reviewer evaluation");
        } finally {
            setFinalScoreLoading(false);
        }
    };

    // Reschedule submit
    const handleRescheduleSubmit = async (data) => {
        setRescheduleLoading(true);
        try {
            await rescheduleReview(rescheduleModal.review.id, data);
            setSuccessMessage("Review rescheduled successfully!");
            handleCloseModals();
            dispatch(fetchAdvisorReviews()); // Refresh list
        } catch (err) {
            console.error("Reschedule error:", err);
            setSuccessMessage("");
        } finally {
            setRescheduleLoading(false);
        }
    };

    // Cancel submit
    const handleCancelSubmit = async (data) => {
        setCancelLoading(true);
        try {
            await cancelReview(cancelModal.review.id, data);
            setSuccessMessage("Review cancelled successfully!");
            handleCloseModals();
            dispatch(fetchAdvisorReviews()); // Refresh list
        } catch (err) {
            console.error("Cancel error:", err);
            setSuccessMessage("");
        } finally {
            setCancelLoading(false);
        }
    };

    // Status badge colors
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case "scheduled":
                return "bg-blue-100 text-blue-700";
            case "completed":
                return "bg-amber-100 text-amber-700";
            case "scored":
                return "bg-green-100 text-green-700";
            case "pending":
                return "bg-slate-100 text-slate-700";
            case "accepted":
                return "bg-teal-100 text-teal-700";
            case "cancelled":
                return "bg-red-100 text-red-700";
            default:
                return "bg-slate-100 text-slate-700";
        }
    };

    // Handle final score submit
    const handleFinalScoreSubmit = async (data) => {
        setFinalScoreLoading(true);
        try {
            await submitFinalScore(finalScoreModal.review.id, data);
            setSuccessMessage("Final score submitted successfully!");
            handleCloseModals();
            dispatch(fetchAdvisorReviews());
        } catch (err) {
            console.error("Final score error:", err);
            alert(err.response?.data?.message || "Failed to submit final score");
        } finally {
            setFinalScoreLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Manage Reviews</h2>
                    <p className="text-slate-500">View and manage all scheduled reviews</p>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {successMessage}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Search Bar */}
            <div className="relative">
                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    placeholder="Search by student or reviewer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
            </div>

            {/* Reviews Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading.reviews ? (
                    <div className="p-8">
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse"></div>
                            ))}
                        </div>
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-1">No reviews found</h3>
                        <p className="text-slate-500 text-sm">
                            {searchQuery ? "Try a different search term" : "No reviews available"}
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Student</th>
                                <th className="px-6 py-3">Reviewer</th>
                                <th className="px-6 py-3">Date & Time</th>
                                <th className="px-6 py-3">Domain</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredReviews.map(review => (
                                <tr key={review.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{review.student}</td>
                                    <td className="px-6 py-4 text-blue-600">{review.reviewer}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-900">{review.date}</div>
                                        <div className="text-xs text-slate-500">{review.time}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{review.domain || "General"}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                                            {review.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {/* View Button - Always visible */}
                                            <button
                                                onClick={() => handleView(review)}
                                                className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                                            >
                                                View
                                            </button>

                                            {/* Reschedule & Cancel - Only for scheduled/pending/accepted */}
                                            {review.status?.toLowerCase() !== "completed" &&
                                                review.status?.toLowerCase() !== "scored" &&
                                                review.status?.toLowerCase() !== "cancelled" && (
                                                    <>
                                                        <button
                                                            onClick={() => handleReschedule(review)}
                                                            className="px-3 py-1 bg-amber-500 text-white text-xs font-medium rounded hover:bg-amber-600 transition-colors"
                                                        >
                                                            Reschedule
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancel(review)}
                                                            className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                )}

                                            {/* Give Final Score - Only for completed reviews */}
                                            {review.status?.toLowerCase() === "completed" && (
                                                <button
                                                    onClick={() => handleGiveFinalScore(review)}
                                                    disabled={finalScoreLoading}
                                                    className="px-3 py-1 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 transition-colors disabled:opacity-50"
                                                >
                                                    {finalScoreLoading ? "Loading..." : "Final Score"}
                                                </button>
                                            )}

                                            {/* View Final Score - Only for scored reviews */}
                                            {review.status?.toLowerCase() === "scored" && (
                                                <span className={`px-3 py-1 text-xs font-medium rounded border ${review.marks >= 8 ? "bg-green-50 text-green-700 border-green-200" :
                                                        review.marks >= 6 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                            "bg-red-50 text-red-700 border-red-200"
                                                    }`}>
                                                    Scored: {review.marks}/10
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modals */}
            <ViewReviewModal
                isOpen={viewModal.open}
                onClose={handleCloseModals}
                review={viewModal.review}
                userRole="advisor"
                onUpdate={async (reviewId, data) => {
                    await updateReviewDetails(reviewId, data);
                    setSuccessMessage("Review updated successfully!");
                    dispatch(fetchAdvisorReviews());
                }}
            />

            <RescheduleReviewModal
                isOpen={rescheduleModal.open}
                onClose={handleCloseModals}
                review={rescheduleModal.review}
                onSubmit={handleRescheduleSubmit}
                isLoading={rescheduleLoading}
            />

            <CancelReviewModal
                isOpen={cancelModal.open}
                onClose={handleCloseModals}
                review={cancelModal.review}
                onSubmit={handleCancelSubmit}
                isLoading={cancelLoading}
            />

            <FinalScoringModal
                isOpen={finalScoreModal.open}
                onClose={handleCloseModals}
                onSubmit={handleFinalScoreSubmit}
                review={finalScoreModal.review}
                reviewerEvaluation={finalScoreModal.evaluation}
                loading={finalScoreLoading}
            />
        </div>
    );
};

export default Reviews;
