import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import { getPerformanceAnalytics } from "../../features/reviewer/reviewerApi";

/* ===========================================
   MEMOIZED CHART COMPONENTS
=========================================== */

// Horizontal Bar Chart Row
const BarChartRow = memo(({ month, count, maxCount }) => {
    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
    return (
        <div className="flex items-center gap-4">
            <span className="w-10 text-sm text-slate-600">{month}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="w-20 text-sm text-slate-600 text-right">{count} reviews</span>
        </div>
    );
});

// Donut Chart Component
const DonutChart = memo(({ percentage, label, color = "#a855f7" }) => {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-36 h-36 mx-auto">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="#e2e8f0"
                    strokeWidth="10"
                    fill="none"
                />
                <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke={color}
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{percentage}%</span>
                <span className="text-xs text-slate-500">{label}</span>
            </div>
        </div>
    );
});

// Progress Bar for Rating Breakdown
const RatingBar = memo(({ stars, count, total }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="flex items-center gap-2">
            <span className="w-6 text-sm text-slate-600">{stars} ★</span>
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="w-8 text-sm text-slate-600 text-right">{count}</span>
        </div>
    );
});

// Skeleton Loader
const SkeletonCard = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-24 mb-3"></div>
        <div className="h-8 bg-slate-200 rounded w-16"></div>
    </div>
);

/* ===========================================
   MAIN COMPONENT
=========================================== */

const Performance = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch performance data
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getPerformanceAnalytics();
            setData(res.data);
            setError(null);
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to load performance data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Memoized max count for bar chart scaling
    const maxMonthlyCount = useMemo(() => {
        if (!data?.monthlyReviews) return 0;
        return Math.max(...data.monthlyReviews.map(m => m.count), 1);
    }, [data?.monthlyReviews]);

    // Memoized total ratings
    const totalRatings = useMemo(() => {
        if (!data?.studentSatisfaction?.ratingBreakdown) return 0;
        return Object.values(data.studentSatisfaction.ratingBreakdown).reduce((a, b) => a + b, 0);
    }, [data?.studentSatisfaction?.ratingBreakdown]);

    // Loading state
    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Performance Analytics</h2>
                    <p className="text-slate-500">Track your review performance and metrics</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border animate-pulse h-80"></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border animate-pulse h-80"></div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900">Performance Analytics</h2>
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                    {error}
                </div>
            </div>
        );
    }

    // Empty state
    if (!data || data.totalReviews === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Performance Analytics</h2>
                    <p className="text-slate-500">Track your review performance and metrics</p>
                </div>
                <div className="bg-white p-12 rounded-xl shadow-sm border text-center">
                    <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Reviews Yet</h3>
                    <p className="text-slate-500">Complete some reviews to see your performance analytics</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Performance Analytics</h2>
                <p className="text-slate-500">Track your review performance and metrics</p>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Reviews */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-900">{data.totalReviews}</div>
                            <div className="text-sm text-slate-500">Total Reviews</div>
                        </div>
                    </div>
                </div>

                {/* On-Time Feedback */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-green-600">{data.onTimePercentage}%</div>
                            <div className="text-sm text-slate-500">On-Time Feedback</div>
                        </div>
                    </div>
                </div>

                {/* Avg Rating */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-900">{data.avgRating.toFixed(1)}</div>
                            <div className="text-sm text-slate-500">Avg Rating</div>
                        </div>
                    </div>
                </div>

                {/* This Month */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-900">{data.reviewsThisMonth}</div>
                            <div className="text-sm text-slate-500">This Month</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 1: Monthly Reviews + Feedback Timeliness */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Reviews Bar Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-4">Monthly Reviews</h3>
                    <div className="space-y-3">
                        {data.monthlyReviews.map((item, index) => (
                            <BarChartRow
                                key={index}
                                month={item.month}
                                count={item.count}
                                maxCount={maxMonthlyCount}
                            />
                        ))}
                    </div>
                </div>

                {/* Feedback Timeliness Donut */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-4">Feedback Timeliness</h3>
                    <DonutChart
                        percentage={data.feedbackTimeliness.onTimePercent}
                        label="On Time"
                        color="#a855f7"
                    />
                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Within 24 hours</span>
                            <span className="text-sm font-semibold text-slate-900">{data.feedbackTimeliness.within24Hours} reviews</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">24-48 hours</span>
                            <span className="text-sm font-semibold text-slate-900">{data.feedbackTimeliness.within48Hours} reviews</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 2: Workload + Student Satisfaction */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Workload Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-4">Workload Distribution</h3>
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-600">Current Load</span>
                            <span className="text-sm font-semibold text-slate-900">{data.workload.currentLoadPercentage}%</span>
                        </div>
                        <div className="text-xs text-slate-400 mb-2">{data.workload.activeReviews} active reviews</div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div
                                className="h-full bg-purple-600 rounded-full transition-all duration-500"
                                style={{ width: `${data.workload.currentLoadPercentage}%` }}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-purple-50 p-4 rounded-xl text-center">
                            <div className="text-2xl font-bold text-purple-600">{data.workload.maxCapacity}</div>
                            <div className="text-xs text-purple-600">Max Capacity</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-xl text-center">
                            <div className="text-2xl font-bold text-green-600">{data.workload.availableSlots}</div>
                            <div className="text-xs text-green-600">Available Slots</div>
                        </div>
                    </div>
                </div>

                {/* Student Satisfaction */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-4">Student Satisfaction</h3>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                                <svg key={i} className={`w-5 h-5 ${i < Math.round(data.studentSatisfaction.avgRating) ? "text-yellow-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </div>
                        <span className="text-lg font-bold text-slate-900">{data.studentSatisfaction.avgRating.toFixed(1)}/5.0</span>
                    </div>
                    <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((stars) => (
                            <RatingBar
                                key={stars}
                                stars={stars}
                                count={data.studentSatisfaction.ratingBreakdown[stars] || 0}
                                total={totalRatings}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Performance;
