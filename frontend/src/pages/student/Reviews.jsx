import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    fetchUpcomingReviews,
    fetchReviewHistory,
    fetchReviewReport,
    clearSelectedReport,
} from "../../features/student/studentSlice";

/* ============================================
   Skeleton Loader Components
============================================ */
const SkeletonCard = () => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-pulse">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
            <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
            <div className="h-10 w-24 bg-slate-200 rounded-lg"></div>
        </div>
    </div>
);

const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
        <td className="px-6 py-4"><div className="h-6 bg-slate-200 rounded-full w-12"></div></td>
        <td className="px-6 py-4"><div className="h-6 bg-slate-200 rounded-full w-20"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
    </tr>
);

/* ============================================
   Report Modal Component - Enhanced for Final Scores
============================================ */
const ReportModal = React.memo(({ report, onClose, loading }) => {
    if (!report && !loading) return null;

    // Get score color based on value (0-10 scale)
    // Green (≥8), Yellow (6-7), Red (<6)
    const getScoreColor = (score) => {
        if (score >= 8) return "bg-green-100 text-green-700";
        if (score >= 6) return "bg-yellow-100 text-yellow-700";
        return "bg-red-100 text-red-700";
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Review Report</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6">
                    {loading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                            <div className="h-20 bg-slate-200 rounded"></div>
                        </div>
                    ) : report ? (
                        <div className="space-y-5">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Reviewer</p>
                                    <p className="font-medium text-slate-900">{report.reviewer?.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Week</p>
                                    <p className="font-medium text-slate-900">Week {report.week}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Date</p>
                                    <p className="font-medium text-slate-900">
                                        {new Date(report.completedAt).toLocaleDateString("en-US", {
                                            month: "short", day: "numeric", year: "numeric"
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Final Scores Section */}
                            <div className="bg-gradient-to-r from-teal-50 to-green-50 rounded-xl p-4 border border-teal-100">
                                <h4 className="text-sm font-semibold text-teal-800 mb-3">Final Scores</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    {/* Final Score */}
                                    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                        <div className={`text-2xl font-bold ${(report.finalEvaluation?.finalScore ?? report.score ?? 0) >= 6 ? "text-green-600" : "text-amber-600"}`}>
                                            {report.finalEvaluation?.finalScore ?? report.score ?? "—"}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">Final Score</div>
                                    </div>
                                    {/* Attendance */}
                                    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                        <div className={`text-2xl font-bold ${(report.finalEvaluation?.attendance ?? 0) >= 6 ? "text-green-600" : "text-amber-600"}`}>
                                            {report.finalEvaluation?.attendance ?? "—"}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">Attendance</div>
                                    </div>
                                    {/* Discipline */}
                                    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                        <div className={`text-2xl font-bold ${(report.finalEvaluation?.discipline ?? 0) >= 6 ? "text-green-600" : "text-amber-600"}`}>
                                            {report.finalEvaluation?.discipline ?? "—"}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">Discipline</div>
                                    </div>
                                </div>
                            </div>

                            {/* Feedback */}
                            <div className="pt-2 border-t border-slate-200">
                                <p className="text-xs text-slate-500 uppercase mb-2">Feedback</p>
                                <p className="text-slate-700 leading-relaxed">
                                    {report.feedback || "No feedback provided."}
                                </p>
                            </div>

                            {/* Final Remarks from Advisor */}
                            {report.finalEvaluation?.finalRemarks && (
                                <div className="pt-2 border-t border-slate-200">
                                    <p className="text-xs text-slate-500 uppercase mb-2">Advisor Remarks</p>
                                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg">
                                        {report.finalEvaluation.finalRemarks}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
});


/* ============================================
   Main Reviews Component
============================================ */
const Reviews = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showReportModal, setShowReportModal] = useState(false);

    const {
        upcomingReviews,
        nextExpectedReview,
        reviewHistory,
        selectedReport,
        upcomingLoading,
        historyLoading,
        reportLoading,
        error,
    } = useSelector((state) => state.student);

    // Fetch data on mount
    useEffect(() => {
        dispatch(fetchUpcomingReviews());
        dispatch(fetchReviewHistory());
    }, [dispatch]);

    // Format date helper
    const formatDate = useCallback((dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }, []);

    // Format time helper
    const formatTime = useCallback((dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    }, []);

    // Check if review is joinable
    const isJoinable = useCallback((review) => {
        const now = new Date();
        const scheduledTime = new Date(review.scheduledAt);
        const timeDiff = (scheduledTime - now) / (1000 * 60); // in minutes

        // Joinable if status is scheduled/accepted and within 15 mins before to 1 hour after
        return (
            ["scheduled", "accepted"].includes(review.status) &&
            timeDiff <= 15 && timeDiff >= -60
        );
    }, []);

    // Get initials
    const getInitials = useCallback((name) => {
        if (!name) return "?";
        return name.split(" ").map(n => n.charAt(0)).join("").toUpperCase().slice(0, 2);
    }, []);

    // Handle join session - uses meetingLink (format: /review-room/{reviewId})
    const handleJoinSession = useCallback((review) => {
        if (review.meetingLink) {
            // Internal route - use navigate for SPA routing
            if (review.meetingLink.startsWith('/review-room/')) {
                navigate(review.meetingLink);
            } else {
                // External link (legacy or future external providers)
                window.open(review.meetingLink, "_blank");
            }
        } else {
            // Fallback for reviews without meetingLink
            navigate(`/review-room/${review._id}`);
        }
    }, [navigate]);

    // Handle view report
    const handleViewReport = useCallback((reviewId) => {
        dispatch(fetchReviewReport(reviewId));
        setShowReportModal(true);
    }, [dispatch]);

    // Handle close modal
    const handleCloseModal = useCallback(() => {
        setShowReportModal(false);
        dispatch(clearSelectedReport());
    }, [dispatch]);

    // Score badge color - based on marks (0-10 scale, converted to %)
    // Green (≥80% = 8+), Yellow (60-79% = 6-7.9), Red (<60% = <6)
    const getScoreColor = useCallback((score) => {
        if (score >= 80) return "bg-green-100 text-green-700";
        if (score >= 60) return "bg-yellow-100 text-yellow-700";
        return "bg-red-100 text-red-700";
    }, []);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Reviews</h1>
                <p className="text-slate-500">View your review schedule and history</p>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Next Expected Review Card */}
            {nextExpectedReview && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-xl shadow-sm border border-amber-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-slate-900">Next Expected Review</h3>
                                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                        Week {nextExpectedReview.nextWeek}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 mt-1">
                                    {nextExpectedReview.message}
                                </p>
                                <div className="flex items-center gap-3 text-sm text-slate-500 mt-2">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Expected: {formatDate(nextExpectedReview.expectedDate)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500">Last review</p>
                            <p className="text-sm font-medium text-slate-700">
                                {formatDate(nextExpectedReview.lastReviewDate)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Upcoming Reviews */}
            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Reviews</h2>
                <div className="space-y-4">
                    {upcomingLoading ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : upcomingReviews.length > 0 ? (
                        upcomingReviews.map((review) => (
                            <div
                                key={review._id}
                                className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center text-lg font-bold">
                                        {getInitials(review.reviewer?.name)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-slate-900">
                                                Review with {review.reviewer?.name || "Unknown Reviewer"}
                                            </h3>
                                            {review.type === "scheduled" && (
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                                                    Scheduled
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            Advisor: {review.advisor?.name || "N/A"}
                                        </p>
                                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {formatDate(review.scheduledAt)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {formatTime(review.scheduledAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleJoinSession(review)}
                                        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${isJoinable(review)
                                            ? "bg-orange-500 text-white hover:bg-orange-600"
                                            : "bg-orange-500 text-white opacity-90 hover:bg-orange-600"
                                            }`}
                                    >
                                        Join Session
                                    </button>
                                    <button
                                        onClick={() => navigate(`/student/reviews/${review._id}`)}
                                        className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        Details
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
                            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-slate-500">No upcoming reviews scheduled</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Review History */}
            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Review History</h2>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Reviewer</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Score</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {historyLoading ? (
                                <>
                                    <SkeletonRow />
                                    <SkeletonRow />
                                    <SkeletonRow />
                                </>
                            ) : reviewHistory.length > 0 ? (
                                reviewHistory.map((review) => (
                                    <tr key={review._id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${["bg-purple-500", "bg-blue-500", "bg-orange-500"][Math.floor(Math.random() * 3)]
                                                    }`}>
                                                    {getInitials(review.reviewer?.name)}
                                                </div>
                                                <span className="font-medium text-slate-900">
                                                    {review.reviewer?.name || "Unknown"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {formatDate(review.completedAt || review.scheduledAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {review.score !== null ? (
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${getScoreColor(review.score)}`}>
                                                    {review.score}%
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                Completed
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleViewReport(review._id)}
                                                className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                View Report
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        No completed reviews yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Report Modal */}
            {showReportModal && (
                <ReportModal
                    report={selectedReport}
                    onClose={handleCloseModal}
                    loading={reportLoading}
                />
            )}
        </div>
    );
};

export default Reviews;
