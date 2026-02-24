import React, { useEffect, useState, useMemo, useCallback } from "react";
import api from "../../api/axios";

// Debounce hook for search optimization
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

// Format date for display
const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const History = () => {
    // State
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("date_desc");

    // Modal
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);

    // Debounced search
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Fetch history from API
    const fetchHistory = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.get("/reviews/reviewer/history", {
                params: { page, limit: pagination.limit, sortBy },
            });
            setHistory(res.data.history || []);
            setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
        } catch (err) {
            setError(err.response?.data?.message || "Failed to fetch review history");
        } finally {
            setLoading(false);
        }
    }, [sortBy, pagination.limit]);

    // Fetch on mount and when sortBy changes
    useEffect(() => {
        fetchHistory(1);
    }, [sortBy]);

    // Filter by search (client-side for current page)
    const filteredHistory = useMemo(() => {
        if (!debouncedSearch.trim()) return history;
        const query = debouncedSearch.toLowerCase();
        return history.filter(r =>
            r.student?.name?.toLowerCase().includes(query)
        );
    }, [history, debouncedSearch]);

    // Handle view review
    const handleView = useCallback((review) => {
        setSelectedReview(review);
        setViewModalOpen(true);
    }, []);

    // Close view modal
    const closeViewModal = useCallback(() => {
        setViewModalOpen(false);
        setSelectedReview(null);
    }, []);

    // Handle page change
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchHistory(newPage);
        }
    };

    // Score display helper
    const getScoreLabel = (key) => {
        const labels = {
            technicalUnderstanding: "Technical",
            taskCompletion: "Task Completion",
            communication: "Communication",
            problemSolving: "Problem Solving",
        };
        return labels[key] || key;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Review History</h2>
                    <p className="text-slate-500">Your completed reviews with submitted scores</p>
                </div>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                    {pagination.total} Completed
                </span>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Search by student name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                </div>

                {/* Sort */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                </select>

                {/* Clear Filters */}
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                    >
                        Clear Search
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading && history.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-1">No completed reviews</h3>
                        <p className="text-slate-500 text-sm">
                            {searchQuery ? "Try adjusting your search" : "Completed reviews will appear here"}
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Student</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Domain</th>
                                <th className="px-6 py-3">Avg Score</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredHistory.map((review) => (
                                <tr key={review.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                                                {review.student?.name?.charAt(0) || "S"}
                                            </div>
                                            <span className="font-medium text-slate-900">
                                                {review.student?.name || "Unknown"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {formatDate(review.scheduledAt)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {review.advisor?.domain || "General"}
                                    </td>
                                    <td className="px-6 py-4">
                                        {review.averageScore !== null ? (
                                            <span className={`font-bold ${review.averageScore >= 7 ? "text-green-600" : review.averageScore >= 5 ? "text-amber-600" : "text-red-600"}`}>
                                                {review.averageScore.toFixed(1)}/10
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${review.status === "scored" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                            {review.status === "scored" ? "Scored" : "Completed"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleView(review)}
                                            className="p-1.5 text-slate-500 hover:text-purple-600 transition-colors"
                                            title="View Details"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* View Review Modal */}
            {viewModalOpen && selectedReview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-purple-600">
                            <h3 className="text-lg font-bold text-white">Review Details</h3>
                            <button onClick={closeViewModal} className="text-white/80 hover:text-white">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase">Student</label>
                                    <p className="font-medium text-slate-900">{selectedReview.student?.name}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase">Advisor</label>
                                    <p className="font-medium text-slate-900">{selectedReview.advisor?.name}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase">Domain</label>
                                    <p className="font-medium text-slate-900">{selectedReview.advisor?.domain || "General"}</p>
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
                                    <label className="text-xs text-slate-500 uppercase">Status</label>
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${selectedReview.status === "scored" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                        {selectedReview.status === "scored" ? "Scored" : "Completed"}
                                    </span>
                                </div>
                            </div>

                            {/* Submitted Scores */}
                            {selectedReview.scores && (
                                <div className="bg-purple-50 rounded-xl p-4">
                                    <h4 className="text-sm font-semibold text-purple-800 mb-3">Your Submitted Scores</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.entries(selectedReview.scores).map(([key, value]) => (
                                            <div key={key} className="bg-white rounded-lg p-3">
                                                <div className="text-xs text-slate-500">{getScoreLabel(key)}</div>
                                                <div className={`text-xl font-bold ${value >= 7 ? "text-green-600" : value >= 5 ? "text-amber-600" : "text-red-600"}`}>
                                                    {value}/10
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-purple-200 flex justify-between items-center">
                                        <span className="text-sm text-purple-700">Average Score</span>
                                        <span className="text-2xl font-bold text-purple-600">
                                            {selectedReview.averageScore?.toFixed(1)}/10
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Feedback */}
                            {selectedReview.feedback && (
                                <div>
                                    <label className="text-xs text-slate-500 uppercase">Feedback</label>
                                    <p className="text-slate-700 text-sm mt-1 bg-slate-50 p-3 rounded-lg">
                                        {selectedReview.feedback}
                                    </p>
                                </div>
                            )}

                            {/* Remarks */}
                            {selectedReview.remarks && (
                                <div>
                                    <label className="text-xs text-slate-500 uppercase">Remarks</label>
                                    <p className="text-slate-700 text-sm mt-1 bg-slate-50 p-3 rounded-lg">
                                        {selectedReview.remarks}
                                    </p>
                                </div>
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
        </div>
    );
};

export default History;
