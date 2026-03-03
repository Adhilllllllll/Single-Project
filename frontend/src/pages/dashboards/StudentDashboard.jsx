import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { DASHBOARD_TITLES } from "../../constants/appConfig";

/* ======================================================
   MEMOIZED REUSABLE COMPONENTS
====================================================== */

// Memoized Stat Card - prevents re-renders when other stats change
const StatCard = memo(({ icon, value, label, bgColor = "bg-teal-50", iconColor = "text-teal-600" }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center mb-4`}>
            {icon}
        </div>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
    </div>
));

// Memoized Review Card
const ReviewCard = memo(({ review, formatDateTime }) => (
    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        </div>
        <div className="flex-1">
            <div className="font-medium text-slate-900">Review with {review.reviewerName}</div>
            <div className="text-xs text-slate-500">Advisor: {review.advisorName}</div>
            <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDateTime(review.date, review.time)}
            </div>
        </div>
        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
            {review.status}
        </span>
    </div>
));

// Memoized Feedback Card
const FeedbackCard = memo(({ feedback, formatDate }) => (
    <div className="p-3 border border-slate-100 rounded-lg">
        <div className="flex justify-between items-start mb-2">
            <div>
                <div className="font-medium text-slate-900">{feedback.reviewerName}</div>
                <div className="text-xs text-slate-400">{formatDate(feedback.date)}</div>
            </div>
            <span className={`text-sm font-bold ${feedback.score >= 80 ? 'text-teal-600' : feedback.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {feedback.score}%
            </span>
        </div>
        <p className="text-sm text-slate-600 line-clamp-2">{feedback.feedback}</p>
    </div>
));

// Skeleton loader component
const SkeletonCard = memo(() => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-pulse">
        <div className="h-10 w-10 bg-slate-200 rounded-lg mb-4"></div>
        <div className="h-8 bg-slate-200 rounded w-12 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-24"></div>
    </div>
));

/* ======================================================
   MAIN COMPONENT
====================================================== */

const StudentDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        upcomingReviews: 0,
        pendingTasks: 0,
        overallProgress: 0,
        avgScore: 0,
        completedReviews: 0,
    });
    const [upcomingReviews, setUpcomingReviews] = useState([]);
    const [completedReviews, setCompletedReviews] = useState([]);
    const [recentFeedback, setRecentFeedback] = useState([]);

    // Memoized fetch function
    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get("/students/dashboard");
            setStats(res.data.stats || {});
            setUpcomingReviews(res.data.upcomingReviews || []);
            setCompletedReviews(res.data.completedReviews || []);
            setRecentFeedback(res.data.recentFeedback || []);
        } catch (err) {
            console.error("Failed to fetch dashboard:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    // Memoized date formatters
    const formatDate = useCallback((dateStr) => {
        if (!dateStr) return "TBD";
        return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }, []);

    const formatDateTime = useCallback((dateStr, time) => {
        if (!dateStr) return "TBD";
        const formattedDate = new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `${formattedDate} at ${time || "TBD"}`;
    }, []);

    // Memoized stat cards config
    const statCards = useMemo(() => [
        { icon: <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, value: stats.upcomingReviews, label: "Upcoming Reviews", bgColor: "bg-orange-100" },
        { icon: <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, value: stats.pendingTasks, label: "Pending Tasks" },
        { icon: <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>, value: `${stats.overallProgress}%`, label: "Overall Progress" },
        { icon: <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, value: stats.avgScore, label: "Average Score" },
        { icon: <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, value: stats.completedReviews, label: "Completed Reviews", bgColor: "bg-green-50", iconColor: "text-green-600" },
    ], [stats]);

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* HEADER */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{DASHBOARD_TITLES.student}</h1>
                <p className="text-slate-500">Welcome back! Track your progress and reviews</p>
            </div>

            {/* STATS CARDS */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-pulse">
                            <div className="h-10 w-10 bg-slate-200 rounded-lg mb-4"></div>
                            <div className="h-8 bg-slate-200 rounded w-12 mb-2"></div>
                            <div className="h-4 bg-slate-200 rounded w-24"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {/* Upcoming Reviews */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{stats.upcomingReviews}</div>
                        <div className="text-sm text-slate-500">Upcoming Reviews</div>
                    </div>

                    {/* Pending Tasks */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{stats.pendingTasks}</div>
                        <div className="text-sm text-slate-500">Pending Tasks</div>
                    </div>

                    {/* Overall Progress */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{stats.overallProgress}%</div>
                        <div className="text-sm text-slate-500">Overall Progress</div>
                    </div>

                    {/* Average Score */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{stats.avgScore}</div>
                        <div className="text-sm text-slate-500">Average Score</div>
                    </div>

                    {/* Completed Reviews */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{stats.completedReviews}</div>
                        <div className="text-sm text-slate-500">Completed Reviews</div>
                    </div>
                </div>
            )}

            {/* CONTENT SECTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Reviews */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-900">Upcoming Reviews</h3>
                        <button onClick={() => navigate("/student/reviews")} className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                            View All
                        </button>
                    </div>
                    <div className="p-4 space-y-4">
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="animate-pulse flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : upcomingReviews.length === 0 ? (
                            <div className="text-center py-6 text-slate-400">No upcoming reviews scheduled</div>
                        ) : (
                            upcomingReviews.map((review) => (
                                <div key={review.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-slate-900">Review with {review.reviewerName}</div>
                                        <div className="text-xs text-slate-500">Advisor: {review.advisorName}</div>
                                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {formatDateTime(review.date, review.time)}
                                        </div>
                                    </div>
                                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                                        {review.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Feedback */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-900">Recent Feedback</h3>
                        <button onClick={() => navigate("/student/reviews")} className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                            View All
                        </button>
                    </div>
                    <div className="p-4 space-y-4">
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="animate-pulse">
                                        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                                        <div className="h-3 bg-slate-200 rounded w-full"></div>
                                    </div>
                                ))}
                            </div>
                        ) : recentFeedback.length === 0 ? (
                            <div className="text-center py-6 text-slate-400">No feedback yet</div>
                        ) : (
                            recentFeedback.map((fb) => (
                                <div key={fb.id} className="p-3 border border-slate-100 rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-medium text-slate-900">{fb.reviewerName}</div>
                                            <div className="text-xs text-slate-400">{formatDate(fb.date)}</div>
                                        </div>
                                        <span className={`text-sm font-bold ${fb.score >= 80 ? 'text-teal-600' : fb.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                            {fb.score}%
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 line-clamp-2">{fb.feedback}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => navigate("/student/reviews")}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-teal-700 text-white font-medium rounded-lg hover:bg-teal-800 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Join Review
                </button>
                <button
                    onClick={() => navigate("/student/tasks")}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-teal-50 hover:border-teal-200 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Tasks
                </button>
                <button
                    onClick={() => navigate("/student/progress")}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-teal-50 hover:border-teal-200 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    View Progress
                </button>
            </div>
        </div>
    );
};

export default StudentDashboard;
