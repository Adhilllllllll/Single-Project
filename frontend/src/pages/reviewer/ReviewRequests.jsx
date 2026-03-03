import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    fetchReviewerReviews,
    fetchSingleReview,
    acceptReviewRequest,
    rejectReviewRequest,
    clearSelectedReview,
} from "../../features/reviewer/reviewerSlice";
import { markReviewCompleted } from "../../features/reviewer/reviewerApi";
import ReviewerEvaluationModal from "../../components/ReviewerEvaluationModal";

// Format date for display
const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

// Format time for display
const formatTime = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

// Status badge colors
const getStatusBadge = (status) => {
    switch (status) {
        case "pending":
            return { bg: "bg-blue-100", text: "text-blue-700", label: "New" };
        case "accepted":
            return { bg: "bg-green-100", text: "text-green-700", label: "Accepted" };
        case "rejected":
            return { bg: "bg-red-100", text: "text-red-700", label: "Rejected" };
        case "completed":
            return { bg: "bg-purple-100", text: "text-purple-700", label: "Completed" };
        case "cancelled":
            return { bg: "bg-slate-100", text: "text-slate-700", label: "Cancelled" };
        default:
            return { bg: "bg-slate-100", text: "text-slate-600", label: status };
    }
};

const ReviewRequests = () => {
    const dispatch = useDispatch();
    const { reviews, selectedReview, loading, error } = useSelector((state) => state.reviewer);

    const [searchQuery, setSearchQuery] = useState("");
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [selectedReviewId, setSelectedReviewId] = useState(null);
    const [selectedReviewForEval, setSelectedReviewForEval] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    // Fetch reviews on mount
    useEffect(() => {
        dispatch(fetchReviewerReviews());
    }, [dispatch]);

    // Clear success message after 3 seconds
    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(() => setSuccessMsg(""), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    // Filter reviews based on search query
    const filteredReviews = useMemo(() => {
        if (!searchQuery.trim()) return reviews;
        const query = searchQuery.toLowerCase();
        return reviews.filter(r =>
            r.student?.name?.toLowerCase().includes(query) ||
            r.advisor?.name?.toLowerCase().includes(query) ||
            r.advisor?.domain?.toLowerCase().includes(query)
        );
    }, [reviews, searchQuery]);

    // Handle view review
    const handleView = (reviewId) => {
        dispatch(fetchSingleReview(reviewId));
        setViewModalOpen(true);
    };

    // Handle accept
    const handleAccept = async (reviewId) => {
        if (!window.confirm("Are you sure you want to accept this review request?")) return;
        setActionLoading(true);
        try {
            await dispatch(acceptReviewRequest(reviewId)).unwrap();
            setSuccessMsg("Review accepted successfully!");
        } catch (err) {
            // Error handled by Redux
        }
        setActionLoading(false);
    };

    // Handle reject click
    const handleRejectClick = (reviewId) => {
        setSelectedReviewId(reviewId);
        setRejectReason("");
        setRejectModalOpen(true);
    };

    // Handle reject submit
    const handleRejectSubmit = async () => {
        setActionLoading(true);
        try {
            await dispatch(rejectReviewRequest({ reviewId: selectedReviewId, reason: rejectReason })).unwrap();
            setSuccessMsg("Review rejected successfully!");
            setRejectModalOpen(false);
        } catch (err) {
            // Error handled by Redux
        }
        setActionLoading(false);
    };

    // Handle complete click - open evaluation modal
    const handleCompleteClick = (review) => {
        setSelectedReviewForEval(review);
        setEvaluationModalOpen(true);
    };

    // Handle evaluation submit
    const handleEvaluationSubmit = async (evaluationData) => {
        setActionLoading(true);
        try {
            await markReviewCompleted(selectedReviewForEval._id, evaluationData);
            setSuccessMsg("Review completed and evaluation submitted successfully!");
            setEvaluationModalOpen(false);
            setSelectedReviewForEval(null);
            // Refresh reviews
            dispatch(fetchReviewerReviews());
        } catch (err) {
            console.error("Failed to complete review:", err);
            alert(err.response?.data?.message || "Failed to complete review");
        }
        setActionLoading(false);
    };

    // Close view modal
    const closeViewModal = () => {
        setViewModalOpen(false);
        dispatch(clearSelectedReview());
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Review Requests</h2>
                    <p className="text-slate-500">Manage incoming review requests</p>
                </div>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                    {reviews.length} Requests
                </span>
            </div>

            {/* Success Message */}
            {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
                    {successMsg}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Search */}
            <div className="flex gap-4">
                <input
                    type="text"
                    placeholder="Search by student, advisor, or domain..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading && reviews.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        No review requests found.
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Student</th>
                                <th className="px-6 py-3">Advisor</th>
                                <th className="px-6 py-3">Date & Time</th>
                                <th className="px-6 py-3">Domain</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredReviews.map((request) => {
                                const badge = getStatusBadge(request.status);
                                const isPending = request.status === "pending";
                                return (
                                    <tr key={request._id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                                                    {request.student?.name?.charAt(0) || "S"}
                                                </div>
                                                <span className="font-medium text-slate-900">
                                                    {request.student?.name || "Unknown"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {request.advisor?.name || "Unknown"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-900">{formatDate(request.scheduledAt)}</div>
                                            <div className="text-xs text-slate-500">{formatTime(request.scheduledAt)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {request.advisor?.domain ? (
                                                <span className="text-slate-700">{request.advisor.domain}</span>
                                            ) : (
                                                <span className="text-slate-400 italic">Not specified</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {/* View Button */}
                                                <button
                                                    onClick={() => handleView(request._id)}
                                                    className="p-1.5 text-slate-500 hover:text-purple-600 transition-colors"
                                                    title="View Details"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>

                                                {/* Accept Button - Only for pending */}
                                                {isPending && (
                                                    <button
                                                        onClick={() => handleAccept(request._id)}
                                                        disabled={actionLoading}
                                                        className="p-1.5 text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
                                                        title="Accept"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {/* Reject Button - Only for pending */}
                                                {isPending && (
                                                    <button
                                                        onClick={() => handleRejectClick(request._id)}
                                                        disabled={actionLoading}
                                                        className="p-1.5 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                                                        title="Reject"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {/* Mark Complete Button - Only for accepted */}
                                                {request.status === "accepted" && (
                                                    <button
                                                        onClick={() => handleCompleteClick(request)}
                                                        disabled={actionLoading}
                                                        className="px-3 py-1 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                                                        title="Mark as Completed"
                                                    >
                                                        Complete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* View Review Modal */}
            {viewModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900">Review Details</h3>
                            <button onClick={closeViewModal} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : selectedReview ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Student</label>
                                            <p className="font-medium text-slate-900">{selectedReview.student}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Advisor</label>
                                            <p className="font-medium text-slate-900">{selectedReview.advisor}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Domain</label>
                                            <p className="font-medium text-slate-900">{selectedReview.domain}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Week</label>
                                            <p className="font-medium text-slate-900">Week {selectedReview.week}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Date</label>
                                            <p className="font-medium text-slate-900">{formatDate(selectedReview.scheduledAt)}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Time</label>
                                            <p className="font-medium text-slate-900">{formatTime(selectedReview.scheduledAt)}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Mode</label>
                                            <p className="font-medium text-slate-900 capitalize">{selectedReview.mode}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Status</label>
                                            <p className="font-medium text-slate-900 capitalize">{selectedReview.status}</p>
                                        </div>
                                    </div>
                                    {selectedReview.meetingLink && (
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Meeting Link</label>
                                            <a href={selectedReview.meetingLink} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline block truncate">
                                                {selectedReview.meetingLink}
                                            </a>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-slate-400 text-center">No data available</p>
                            )}
                        </div>
                        <div className="flex justify-end p-4 border-t border-slate-200">
                            <button onClick={closeViewModal} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Confirmation Modal */}
            {rejectModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900">Reject Review Request</h3>
                            <button onClick={() => setRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-slate-600">Are you sure you want to reject this review request?</p>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reason (optional)</label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Enter reason for rejection..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
                            <button
                                onClick={() => setRejectModalOpen(false)}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectSubmit}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {actionLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Evaluation Modal */}
            <ReviewerEvaluationModal
                isOpen={evaluationModalOpen}
                onClose={() => {
                    setEvaluationModalOpen(false);
                    setSelectedReviewForEval(null);
                }}
                onSubmit={handleEvaluationSubmit}
                review={selectedReviewForEval}
                loading={actionLoading}
            />
        </div>
    );
};

export default ReviewRequests;
