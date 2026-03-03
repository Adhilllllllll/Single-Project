import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    fetchDashboardStats,
    fetchAssignedStudents,
    fetchAdvisorReviews,
    approveScore,
} from "../../features/advisor/advisorSlice";
import { DASHBOARD_TITLES } from "../../constants/appConfig";

const AdvisorDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { stats, students, reviews, loading } = useSelector((state) => state.advisor);

    useEffect(() => {
        dispatch(fetchDashboardStats());
        dispatch(fetchAssignedStudents());
        dispatch(fetchAdvisorReviews());
    }, [dispatch]);

    const pendingReviews = reviews.filter(r => r.status === "Pending");
    const upcomingReviews = reviews.filter(r => r.status === "Upcoming" || r.status === "Scheduled");

    const handleApprove = (reviewId) => {
        dispatch(approveScore(reviewId));
    };

    // Get avatar color based on first letter - using teal shades for consistency
    const getAvatarColor = () => "bg-teal-600";

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* HEADER */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{DASHBOARD_TITLES.advisor}</h1>
                <p className="text-slate-500">Welcome back, {user?.name?.split(' ')[0]}!</p>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium uppercase tracking-wide">Total Students</div>
                    <div className="mt-2 text-3xl font-bold text-slate-900">
                        {loading.stats ? (
                            <div className="h-9 w-12 bg-slate-200 animate-pulse rounded"></div>
                        ) : stats.totalStudents}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium uppercase tracking-wide">Reviews This Week</div>
                    <div className="mt-2 text-3xl font-bold text-teal-600">
                        {loading.stats ? (
                            <div className="h-9 w-8 bg-slate-200 animate-pulse rounded"></div>
                        ) : stats.reviewsThisWeek}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium uppercase tracking-wide">Pending Scores</div>
                    <div className="mt-2 text-3xl font-bold text-teal-600">
                        {loading.stats ? (
                            <div className="h-9 w-8 bg-slate-200 animate-pulse rounded"></div>
                        ) : stats.pendingScores}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium uppercase tracking-wide">Avg Progress</div>
                    <div className={`mt-2 text-3xl font-bold ${(stats.avgProgress || 0) >= 80 ? "text-green-600" :
                            (stats.avgProgress || 0) >= 60 ? "text-yellow-600" :
                                "text-red-600"
                        }`}>
                        {loading.stats ? (
                            <div className="h-9 w-16 bg-slate-200 animate-pulse rounded"></div>
                        ) : `${stats.avgProgress}%`}
                    </div>
                </div>
            </div>

            {/* UPCOMING REVIEWS & PENDING SCORES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* UPCOMING REVIEWS */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900">Upcoming Reviews</h3>
                        <button
                            onClick={() => navigate("/advisor/reviews")}
                            className="text-sm text-teal-600 font-medium hover:underline"
                        >
                            View All
                        </button>
                    </div>
                    <div className="p-4">
                        {loading.reviews ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-slate-100 h-20 rounded-lg animate-pulse"></div>
                                ))}
                            </div>
                        ) : upcomingReviews.length === 0 ? (
                            <div className="text-center text-slate-400 py-8">No upcoming reviews</div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingReviews.slice(0, 4).map(r => (
                                    <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full ${getAvatarColor(r.student)} text-white flex items-center justify-center font-bold text-sm`}>
                                                {r.student?.charAt(0) || "S"}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{r.student}</div>
                                                <div className="text-xs text-slate-500">Reviewer: {r.reviewer || "Dr. Smith"}</div>
                                                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {r.date} at {r.time}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-medium">
                                            Scheduled
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* PENDING SCORES */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900">Pending Scores</h3>
                        <button
                            onClick={() => navigate("/advisor/reviews")}
                            className="text-sm text-teal-600 font-medium hover:underline"
                        >
                            View All
                        </button>
                    </div>
                    <div className="p-4">
                        {loading.reviews ? (
                            <div className="space-y-3">
                                {[1, 2].map(i => (
                                    <div key={i} className="bg-slate-100 h-20 rounded-lg animate-pulse"></div>
                                ))}
                            </div>
                        ) : pendingReviews.length === 0 ? (
                            <div className="text-center text-slate-400 py-8">No pending scores to approve</div>
                        ) : (
                            <div className="space-y-3">
                                {pendingReviews.slice(0, 4).map(r => (
                                    <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full ${getAvatarColor(r.student)} text-white flex items-center justify-center font-bold text-sm`}>
                                                {r.student?.charAt(0) || "S"}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{r.student}</div>
                                                <div className="text-xs text-slate-500">Reviewer: {r.reviewer || "Dr. Smith"}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    Reviewed on {r.date}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleApprove(r.id)}
                                            className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* QUICK ACTIONS - Bottom Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                    onClick={() => navigate("/advisor/reviews")}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800 transition-colors shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Assign Review
                </button>
                <button
                    onClick={() => navigate("/advisor/students")}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    View Students
                </button>
                <button
                    onClick={() => navigate("/advisor/availability")}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Availability
                </button>
                <button
                    onClick={() => navigate("/advisor/analytics")}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Reports
                </button>
            </div>
        </div>
    );
};

export default AdvisorDashboard;
