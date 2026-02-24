import React, { useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStudentProgress } from "../../features/student/studentSlice";

/* ============================================
   Reusable Stat Card Component
============================================ */
const StatCard = React.memo(({ icon, value, label, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
            {icon}
        </div>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
));

/* ============================================
   Skeleton Loader Components
============================================ */
const SkeletonCard = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-pulse">
        <div className="w-10 h-10 bg-slate-200 rounded-lg mb-3"></div>
        <div className="h-8 bg-slate-200 rounded w-16 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-24"></div>
    </div>
);

const SkeletonMilestone = () => (
    <div className="flex items-center gap-4 animate-pulse">
        <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
        <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-24"></div>
        </div>
    </div>
);

/* ============================================
   Progress Chart Component with Severity Colors
============================================ */
const ProgressChart = React.memo(({ data }) => {
    const maxScore = 100;
    const chartHeight = 200;

    // Get bar color based on severity
    const getBarColor = (item) => {
        if (item.severity === "green") return "from-green-500 to-green-400";
        if (item.severity === "yellow") return "from-yellow-500 to-yellow-400";
        return "from-red-500 to-red-400";
    };

    if (!data || data.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center text-slate-400">
                No progress data yet
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Legend */}
            <div className="flex justify-end gap-4 mb-4 text-xs">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-green-500"></span> Excellent (≥80%)
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-yellow-500"></span> Average (60-79%)
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-red-500"></span> Needs Improvement (&lt;60%)
                </span>
            </div>
            {/* Chart Area */}
            <div className="flex items-end justify-between gap-4 h-48 pt-4">
                {data.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center group">
                        {/* Score Label on Hover */}
                        <div className="text-xs font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.score}%
                        </div>
                        {/* Bar */}
                        <div className="w-full flex justify-center mb-2">
                            <div
                                className={`w-10 bg-gradient-to-t ${getBarColor(item)} rounded-t-lg transition-all duration-500 hover:scale-105`}
                                style={{
                                    height: `${(item.score / maxScore) * chartHeight}px`,
                                    minHeight: "8px",
                                }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
            {/* X-axis Labels */}
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
                {data.map((item, index) => (
                    <div key={index} className="flex-1 text-center text-xs text-slate-500">
                        Week {item.week}
                    </div>
                ))}
            </div>
        </div>
    );
});

/* ============================================
   Milestone Item Component with Severity Colors
============================================ */
const MilestoneItem = React.memo(({ milestone }) => {
    const isCompleted = milestone.status === "completed" || milestone.status === "scored";
    const hasScore = milestone.score !== null && milestone.score !== undefined;

    // Get score badge color based on score (0-100 scale)
    const getScoreColor = (score) => {
        if (score >= 80) return "bg-green-100 text-green-700";
        if (score >= 60) return "bg-yellow-100 text-yellow-700";
        return "bg-red-100 text-red-700";
    };

    const formatDate = useCallback((dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }, []);

    return (
        <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted ? "bg-orange-100" : "bg-slate-100"
                }`}>
                <svg
                    className={`w-4 h-4 ${isCompleted ? "text-orange-500" : "text-slate-400"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    {isCompleted ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                </svg>
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className={`font-medium ${isCompleted ? "text-slate-900" : "text-slate-500"}`}>
                        {milestone.title}
                    </span>
                    {hasScore && (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreColor(milestone.score)}`}>
                            {milestone.score}%
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(milestone.date)}
                    {milestone.reviewer && (
                        <span className="text-slate-500">• {milestone.reviewer}</span>
                    )}
                    {isCompleted && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                            {milestone.status === "scored" ? "Scored" : "Completed"}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
});

/* ============================================
   Main Progress Component
============================================ */
const Progress = () => {
    const dispatch = useDispatch();
    const { progress, progressLoading, error } = useSelector((state) => state.student);

    // Fetch progress data on mount
    useEffect(() => {
        dispatch(fetchStudentProgress());
    }, [dispatch]);

    // Memoized data
    const stats = useMemo(() => progress?.stats || {
        overallProgress: 0,
        milestonesCompleted: 0,
        totalMilestones: 0,
        avgScore: 0,
    }, [progress]);

    const weeklyProgress = useMemo(() => progress?.weeklyProgress || [], [progress]);
    const milestones = useMemo(() => progress?.milestones || [], [progress]);
    const improvementAreas = useMemo(() => progress?.improvementAreas || [], [progress]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Progress Tracking</h1>
                <p className="text-slate-500">Monitor your learning journey and achievements</p>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {progressLoading ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </>
                ) : (
                    <>
                        <StatCard
                            icon={
                                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            }
                            value={`${stats.overallProgress}%`}
                            label="Overall Progress"
                            color="bg-orange-100"
                        />
                        <StatCard
                            icon={
                                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                            value={`${stats.milestonesCompleted}/${stats.totalMilestones}`}
                            label="Milestones Completed"
                            color="bg-green-100"
                        />
                        <StatCard
                            icon={
                                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                            }
                            value={stats.avgScore}
                            label="Average Score"
                            color="bg-orange-100"
                        />
                    </>
                )}
            </div>

            {/* Progress Over Time Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-6">Progress Over Time</h3>
                {progressLoading ? (
                    <div className="h-48 animate-pulse bg-slate-100 rounded-lg"></div>
                ) : (
                    <ProgressChart data={weeklyProgress} />
                )}
            </div>

            {/* Learning Milestones */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-6">Learning Milestones</h3>
                <div className="space-y-6">
                    {progressLoading ? (
                        <>
                            <SkeletonMilestone />
                            <SkeletonMilestone />
                            <SkeletonMilestone />
                        </>
                    ) : milestones.length > 0 ? (
                        milestones.map((milestone) => (
                            <MilestoneItem key={milestone._id} milestone={milestone} />
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p>No milestones yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Areas for Improvement */}
            {improvementAreas.length > 0 && (
                <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                    <h3 className="font-bold text-slate-900 mb-4">Areas for Improvement</h3>
                    <ul className="space-y-3">
                        {improvementAreas.map((area, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <span className="w-2 h-2 rounded-full bg-red-400 mt-2 flex-shrink-0"></span>
                                <span className="text-slate-700">{area}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default Progress;
