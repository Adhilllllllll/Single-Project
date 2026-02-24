import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { DASHBOARD_TITLES } from "../../constants/appConfig";

/* ============================================
   CONSTANTS
============================================ */
const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

/* ============================================
   Stat Card Component (Memoized)
============================================ */
const StatCard = memo(({ title, value, change, changeType = "positive", icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500">{title}</span>
            {icon && (
                <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    {icon}
                </div>
            )}
        </div>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        {change !== undefined && (
            <div className={`text-sm mt-1 ${changeType === "positive" ? "text-teal-600" : "text-red-600"}`}>
                {changeType === "positive" ? "+" : ""}{change}%
            </div>
        )}
    </div>
));

/* ============================================
   Simple Line Chart Component (Memoized)
============================================ */
const LineChart = memo(({ data, labels }) => {
    const maxValue = Math.max(...data, 1);
    const points = useMemo(() =>
        data.map((value, index) => ({
            x: (index / (data.length - 1 || 1)) * 100,
            y: 100 - (value / maxValue) * 80,
        })), [data, maxValue]);

    const pathD = useMemo(() =>
        points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" "),
        [points]);

    return (
        <div className="relative h-48">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((y) => (
                    <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
                ))}
                {/* Line */}
                <path d={pathD} fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* Area */}
                <path d={`${pathD} L 100 100 L 0 100 Z`} fill="url(#tealGradient)" opacity="0.1" />
                <defs>
                    <linearGradient id="tealGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#0f766e" />
                        <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Points */}
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="2" fill="#0f766e" />
                ))}
            </svg>
            {/* Labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-400 pt-2">
                {labels.map((label, i) => (
                    <span key={i}>{label}</span>
                ))}
            </div>
        </div>
    );
});

/* ============================================
   Simple Bar Chart Component (Memoized)
============================================ */
const BarChart = memo(({ data, labels }) => {
    const maxValue = Math.max(...data, 1);

    return (
        <div className="h-48 flex items-end justify-between gap-2">
            {data.map((value, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                        className="w-full bg-gradient-to-t from-teal-600 to-teal-500 rounded-t-md transition-all duration-500"
                        style={{ height: `${(value / maxValue) * 100}%`, minHeight: value > 0 ? "8px" : "2px" }}
                    />
                    <span className="text-xs text-slate-400">{labels[i]}</span>
                </div>
            ))}
        </div>
    );
});

/* ============================================
   Quick Action Button (Memoized)
============================================ */
const QuickActionButton = memo(({ icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg hover:bg-teal-50 hover:border-teal-200 transition-all"
    >
        <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600">
            {icon}
        </div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
    </button>
));

/* ============================================
   Skeleton Loader (Memoized)
============================================ */
const DashboardSkeleton = memo(() => (
    <div className="space-y-6">
        <div>
            <div className="h-8 bg-slate-200 rounded w-48 animate-pulse mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-64 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-24 mb-4"></div>
                    <div className="h-8 bg-slate-200 rounded w-16 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-12"></div>
                </div>
            ))}
        </div>
    </div>
));


/* ============================================
   Main Admin Dashboard Component
============================================ */
const AdminDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalAdvisors: 0,
        totalReviewers: 0,
        totalStudents: 0,
        totalReviews: 0,
        reviewsToday: 0,
        pendingApprovals: 0,
    });
    const [reviewProgress, setReviewProgress] = useState([]);
    const [userGrowth, setUserGrowth] = useState([]);
    const [periodFilter, setPeriodFilter] = useState("weekly");

    // Memoized fetch function
    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const countsRes = await api.get("/admin/dashboard-counts");
            const counts = countsRes.data;

            setStats({
                totalAdvisors: counts.advisors || 0,
                totalReviewers: counts.reviewers || 0,
                totalStudents: counts.students || 0,
                totalReviews: counts.totalReviews || 0,
                reviewsToday: counts.reviewsToday || 0,
                pendingApprovals: counts.pendingReviews || 0,
            });

            // Sample chart data
            const weeklyData = [20, 35, 45, 30, 55, 42, 60];
            const monthlyData = [40, 55, 35, 70, 50, 65, 45, 80];
            setReviewProgress(periodFilter === "weekly" ? weeklyData : monthlyData);
            setUserGrowth([40, 55, 35, 60, 50, 65, 45, 70]);
        } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
        } finally {
            setLoading(false);
        }
    }, [periodFilter]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Memoized icons
    const icons = useMemo(() => ({
        user: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
        review: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
        clock: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        addUser: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
        list: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    }), []);

    // Early return for loading
    if (loading) return <DashboardSkeleton />;


    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{DASHBOARD_TITLES.admin}</h1>
                <p className="text-slate-500">Welcome to your admin dashboard</p>
            </div>

            {/* Stats Row 1 - Users */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Advisors"
                    value={stats.totalAdvisors}
                    change={2}
                    icon={icons.user}
                />
                <StatCard
                    title="Total Reviewers"
                    value={stats.totalReviewers}
                    change={5}
                    icon={icons.user}
                />
                <StatCard
                    title="Total Students"
                    value={stats.totalStudents}
                    change={10}
                    icon={icons.user}
                />
            </div>

            {/* Stats Row 2 - Reviews */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Reviews"
                    value={stats.totalReviews}
                    change={8}
                    icon={icons.review}
                />
                <StatCard
                    title="Reviews Today"
                    value={stats.reviewsToday}
                    icon={icons.clock}
                />
                <StatCard
                    title="Pending Approvals"
                    value={stats.pendingApprovals}
                    icon={icons.review}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Review Progress Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-slate-900">Review Progress</h3>
                        <select
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="weekly">Weekly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                    <LineChart
                        data={reviewProgress}
                        labels={periodFilter === "weekly" ? WEEK_LABELS : MONTH_LABELS}
                    />
                </div>

                {/* User Growth Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-slate-900">User Growth</h3>
                    </div>
                    <BarChart
                        data={userGrowth}
                        labels={MONTH_LABELS}
                    />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <QuickActionButton
                        icon={icons.addUser}
                        label="Add Advisor"
                        onClick={() => navigate("/admin/manage-users")}
                    />
                    <QuickActionButton
                        icon={icons.addUser}
                        label="Add Reviewer"
                        onClick={() => navigate("/admin/manage-users")}
                    />
                    <QuickActionButton
                        icon={icons.addUser}
                        label="Add Student"
                        onClick={() => navigate("/admin/manage-users")}
                    />
                    <QuickActionButton
                        icon={icons.list}
                        label="View All Reviews"
                        onClick={() => navigate("/admin/review-status")}
                    />
                    <QuickActionButton
                        icon={icons.list}
                        label="View Logs"
                        onClick={() => navigate("/admin/recent-activity")}
                    />
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
