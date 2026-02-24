import React, { useEffect, useState, useCallback } from "react";
import { getStudentProfile } from "../features/advisor/advisorApi";

/**
 * StudentProfileModal - Reusable modal for displaying student profile
 * Used in Advisor → Students page
 */
const StudentProfileModal = ({ isOpen, onClose, studentId }) => {
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchProfile = useCallback(async () => {
        if (!studentId) return;

        setLoading(true);
        setError(null);

        try {
            const res = await getStudentProfile(studentId);
            setStudent(res.data?.student || null);
        } catch (err) {
            console.error("Fetch student profile error:", err);
            setError(err?.response?.data?.message || "Failed to load student profile");
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        if (isOpen && studentId) {
            fetchProfile();
        }
        // Clear state when modal closes
        if (!isOpen) {
            setStudent(null);
            setError(null);
        }
    }, [isOpen, studentId, fetchProfile]);

    if (!isOpen) return null;

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getPerformanceColor = (performance) => {
        switch (performance?.toLowerCase()) {
            case "good":
            case "excellent":
                return "bg-green-100 text-green-700";
            case "average":
                return "bg-amber-100 text-amber-700";
            case "needs improvement":
            case "poor":
                return "bg-red-100 text-red-700";
            default:
                return "bg-slate-100 text-slate-700";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-green-600 to-green-700">
                    <h3 className="text-lg font-bold text-white">Student Profile</h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-3 text-slate-500">Loading profile...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-center">
                            {error}
                        </div>
                    ) : student ? (
                        <div className="space-y-6">
                            {/* Student Basic Info */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-2xl">
                                    {student.name?.charAt(0) || "S"}
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-slate-900">{student.name}</h4>
                                    <p className="text-slate-500">{student.email}</p>
                                    <p className="text-sm text-slate-400">Advisor: {student.advisor?.name}</p>
                                </div>
                            </div>

                            {/* Academic & Review Status */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Academic & Review Status
                                </h5>
                                <table className="w-full text-sm">
                                    <tbody>
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-500">Current Week</td>
                                            <td className="py-2 font-medium text-slate-900 text-right">{student.currentWeek || "N/A"}</td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-500">Course / Project</td>
                                            <td className="py-2 font-medium text-slate-900 text-right">{student.course || "N/A"}</td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-500">Batch</td>
                                            <td className="py-2 font-medium text-slate-900 text-right">{student.batch || "N/A"}</td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-500">Last Review Date</td>
                                            <td className="py-2 font-medium text-slate-900 text-right">{formatDate(student.lastReviewDate)}</td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-500">Last Review Status</td>
                                            <td className="py-2 text-right">
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    {student.lastReviewStatus || "N/A"}
                                                </span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 text-slate-500">Last Week Performance</td>
                                            <td className="py-2 text-right">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPerformanceColor(student.lastWeekPerformance)}`}>
                                                    {student.lastWeekPerformance || "N/A"}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Progress Summary */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Progress Summary
                                </h5>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">{student.reviewsCompleted || 0}</div>
                                        <div className="text-xs text-slate-500">Completed</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-amber-500">{student.pendingReviews || 0}</div>
                                        <div className="text-xs text-slate-500">Pending</div>
                                    </div>
                                    <div className="text-center">
                                        <div className={`text-2xl font-bold ${(student.overallScore || 0) >= 80 ? "text-green-600" :
                                                (student.overallScore || 0) >= 60 ? "text-yellow-600" :
                                                    "text-red-600"
                                            }`}>{student.overallScore || 0}%</div>
                                        <div className="text-xs text-slate-500">Overall Score</div>
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Account Status</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${student.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    }`}>
                                    {student.status === "active" ? "Active" : "Inactive"}
                                </span>
                            </div>

                            {/* Joined Date */}
                            <div className="text-xs text-slate-400 text-center">
                                Joined on {formatDate(student.joinedAt)}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-400 py-8">
                            No student data available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentProfileModal;
