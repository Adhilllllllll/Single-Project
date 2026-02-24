import React, { useState, useEffect } from "react";
import api from "../../api/axios";

// Status card component
const StatCard = ({ value, label, color, trend }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start gap-3">
            <div className={`w-3 h-3 rounded-full mt-2 ${color}`}></div>
            <div className="flex-1">
                <div className="text-3xl font-bold text-slate-900">{value}</div>
                <div className="text-sm text-slate-500">{label}</div>
            </div>
            {trend !== undefined && (
                <div className={`flex items-center gap-1 text-sm font-medium ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d={trend >= 0 ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
                    </svg>
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
    </div>
);

// Pie chart SVG component
const PieChart = ({ distribution }) => {
    const { completed, inProgress, scheduled, cancelled } = distribution;
    const total = completed + inProgress + scheduled + cancelled;

    if (total === 0) {
        return (
            <div className="w-48 h-48 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                No data
            </div>
        );
    }

    // Calculate pie slices
    const slices = [
        { value: completed, color: "#22c55e", label: "Completed" },
        { value: inProgress, color: "#f97316", label: "In progress" },
        { value: scheduled, color: "#3b82f6", label: "Scheduled" },
        { value: cancelled, color: "#ef4444", label: "Cancelled" },
    ].filter(s => s.value > 0);

    let currentAngle = 0;
    const paths = slices.map((slice, index) => {
        const percentage = slice.value / 100;
        const angle = percentage * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;

        const startRad = (startAngle - 90) * (Math.PI / 180);
        const endRad = (endAngle - 90) * (Math.PI / 180);
        const largeArc = angle > 180 ? 1 : 0;

        const x1 = 100 + 80 * Math.cos(startRad);
        const y1 = 100 + 80 * Math.sin(startRad);
        const x2 = 100 + 80 * Math.cos(endRad);
        const y2 = 100 + 80 * Math.sin(endRad);

        return (
            <path
                key={index}
                d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={slice.color}
            />
        );
    });

    return (
        <div className="relative">
            <svg width="200" height="200" viewBox="0 0 200 200">
                {paths}
                <circle cx="100" cy="100" r="50" fill="white" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg font-bold text-slate-900">{completed}%</div>
                    <div className="text-xs text-slate-500">Completed</div>
                </div>
            </div>
        </div>
    );
};

// Bar chart SVG component
const BarChart = ({ data }) => {
    const maxValue = Math.max(...data.flatMap(d => [d.completed, d.inProgress, d.scheduled]), 1);
    const barWidth = 30;
    const groupWidth = 100;
    const chartHeight = 160;

    return (
        <div className="overflow-x-auto">
            <svg width={data.length * groupWidth + 60} height={chartHeight + 50} className="min-w-full">
                {/* Y-axis labels */}
                {[0, 7, 14, 21, 28].map((val, i) => (
                    <g key={i}>
                        <text x="25" y={chartHeight - (val / maxValue) * chartHeight + 5}
                            className="text-xs fill-slate-400" textAnchor="end">
                            {val}
                        </text>
                        <line
                            x1="35"
                            y1={chartHeight - (val / maxValue) * chartHeight}
                            x2={data.length * groupWidth + 50}
                            y2={chartHeight - (val / maxValue) * chartHeight}
                            stroke="#e2e8f0"
                            strokeDasharray="4"
                        />
                    </g>
                ))}

                {/* Bars */}
                {data.map((d, i) => {
                    const x = 50 + i * groupWidth;
                    return (
                        <g key={i}>
                            {/* Completed bars (green) */}
                            <rect
                                x={x}
                                y={chartHeight - (d.completed / maxValue) * chartHeight}
                                width={barWidth - 2}
                                height={(d.completed / maxValue) * chartHeight}
                                fill="#22c55e"
                                rx="2"
                            />
                            {/* In Progress bars (orange) */}
                            <rect
                                x={x + barWidth}
                                y={chartHeight - (d.inProgress / maxValue) * chartHeight}
                                width={barWidth - 2}
                                height={(d.inProgress / maxValue) * chartHeight}
                                fill="#f97316"
                                rx="2"
                            />
                            {/* Scheduled bars (blue) */}
                            <rect
                                x={x + barWidth * 2}
                                y={chartHeight - (d.scheduled / maxValue) * chartHeight}
                                width={barWidth - 2}
                                height={(d.scheduled / maxValue) * chartHeight}
                                fill="#3b82f6"
                                rx="2"
                            />
                            {/* Month label */}
                            <text
                                x={x + barWidth * 1.5}
                                y={chartHeight + 20}
                                className="text-xs fill-slate-500"
                                textAnchor="middle"
                            >
                                {d.month}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const ReviewStatus = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const res = await api.get("/admin/review-stats");
                setStats(res.data.stats);
            } catch (err) {
                console.error("Failed to fetch review stats:", err);
                setError("Failed to load review statistics");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Review Status Summary</h2>
                    <p className="text-slate-500">Monitor and track all review statuses across the system</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filter
                    </button>
                    <button className="px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export Report
                    </button>
                </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard value={stats?.scheduled || 0} label="Scheduled" color="bg-blue-500" />
                <StatCard value={stats?.inProgress || 0} label="In-progress" color="bg-orange-500" />
                <StatCard
                    value={stats?.completed || 0}
                    label="Completed"
                    color="bg-green-500"
                    trend={stats?.completionTrend}
                />
                <StatCard value={stats?.cancelled || 0} label="Cancelled" color="bg-red-500" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution Pie Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Status Distribution</h3>
                    <div className="flex flex-col items-center">
                        <PieChart distribution={stats?.statusDistribution || {}} />

                        {/* Legend */}
                        <div className="mt-4 flex flex-wrap justify-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                <span className="text-sm text-slate-600">Completed {stats?.statusDistribution?.completed || 0}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                <span className="text-sm text-slate-600">In progress {stats?.statusDistribution?.inProgress || 0}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                <span className="text-sm text-slate-600">Scheduled</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                <span className="text-sm text-slate-600">Cancelled</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Monthly Trend Bar Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Trend</h3>
                    <BarChart data={stats?.monthlyTrend || []} />

                    {/* Legend */}
                    <div className="mt-4 flex justify-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-green-500"></span>
                            <span className="text-sm text-slate-600">Completed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-orange-500"></span>
                            <span className="text-sm text-slate-600">In Progress</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-blue-500"></span>
                            <span className="text-sm text-slate-600">Scheduled</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reviews by Department Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">Reviews by Department</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Reviews</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Completion Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {stats?.reviewsByDomain?.length > 0 ? (
                                stats.reviewsByDomain.map((dept, index) => (
                                    <tr key={index} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{dept.department}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{dept.totalReviews}</td>
                                        <td className="px-6 py-4 text-sm text-blue-600 font-medium">{dept.completed}</td>
                                        <td className="px-6 py-4 text-sm text-red-600 font-medium">{dept.pending}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                                                    <div
                                                        className="h-full bg-green-500 rounded-full"
                                                        style={{ width: `${dept.completionRate}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">{dept.completionRate}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                        No department data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReviewStatus;
