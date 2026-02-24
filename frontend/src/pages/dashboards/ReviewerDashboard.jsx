import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchDashboardData } from "../../features/reviewer/reviewerSlice";
import { fetchAllAvailability, fetchMyStatus } from "../../features/availability/availabilitySlice";
import { DASHBOARD_TITLES } from "../../constants/appConfig";

/* ============================================
   Skeleton Loader Component
============================================ */
const SkeletonCard = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
    </div>
);

const SkeletonListItem = () => (
    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl animate-pulse">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
            <div>
                <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-32"></div>
            </div>
        </div>
        <div className="h-8 bg-slate-200 rounded w-16"></div>
    </div>
);

/* ============================================
   Stat Card Component
============================================ */
const StatCard = React.memo(({ icon, value, label }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
            {icon}
        </div>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
));

/* ============================================
   Main Dashboard Component
============================================ */
const ReviewerDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { dashboard, dashboardLoading, dashboardError } = useSelector((state) => state.reviewer);
    const { list: availabilityList, status: reviewerStatus, loading: availabilityLoading } = useSelector((state) => state.availability);

    // Fetch dashboard data and availability on mount
    useEffect(() => {
        dispatch(fetchDashboardData());
        dispatch(fetchAllAvailability());
        dispatch(fetchMyStatus());
    }, [dispatch]);

    // Memoized stats
    const stats = useMemo(() => dashboard?.stats || {
        reviewsThisWeek: 0,
        pendingFeedback: 0,
        totalCompleted: 0,
        avgRating: 0,
    }, [dashboard]);

    // Memoized lists
    const upcomingReviews = useMemo(() => dashboard?.upcomingReviews || [], [dashboard]);
    const pendingFeedbackList = useMemo(() => dashboard?.pendingFeedbackList || [], [dashboard]);

    // Process availability data
    const availabilitySummary = useMemo(() => {
        const recurring = availabilityList.filter(s => s.availabilityType === "recurring");
        const specific = availabilityList.filter(s => s.availabilityType === "specific" && new Date(s.specificDate) >= new Date());

        // Get unique days with recurring slots
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const recurringDays = [...new Set(recurring.map(s => dayNames[s.dayOfWeek]))];

        // Get next 3 specific dates
        const upcomingSpecific = specific
            .sort((a, b) => new Date(a.specificDate) - new Date(b.specificDate))
            .slice(0, 3)
            .map(s => ({
                ...s,
                formattedDate: new Date(s.specificDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }));

        return {
            totalSlots: availabilityList.length,
            recurringCount: recurring.length,
            specificCount: specific.length,
            recurringDays,
            upcomingSpecific,
        };
    }, [availabilityList]);

    // Format date helper
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const isToday = date.toDateString() === now.toDateString();
        const isTomorrow = date.toDateString() === tomorrow.toDateString();

        const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

        if (isToday) return `Today at ${timeStr}`;
        if (isTomorrow) return `Tomorrow at ${timeStr}`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ` at ${timeStr}`;
    };

    // Format reviewed date
    const formatReviewedDate = (dateString) => {
        const date = new Date(dateString);
        return `Reviewed on ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    };

    // Get initials from name
    const getInitials = (name) => {
        if (!name) return "?";
        return name.split(" ").map(n => n.charAt(0)).join("").toUpperCase().slice(0, 2);
    };

    // Handle join review session
    // For online reviews, navigates to /review-room/{reviewId} (video call)
    // For offline or fallback, navigates to session page
    const handleJoin = (review) => {
        if (review.mode === "online" && review.meetingLink) {
            // Use meetingLink route (format: /review-room/{reviewId})
            navigate(review.meetingLink);
        } else {
            // Offline mode or fallback - go to session page
            navigate(`/reviewer/session?id=${review._id}`);
        }
    };

    // Handle submit feedback
    const handleSubmitFeedback = (reviewId) => {
        navigate(`/reviewer/session?id=${reviewId}&feedback=true`);
    };

    if (dashboardError) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center">
                    <p className="font-medium">Failed to load dashboard</p>
                    <p className="text-sm mt-1">{dashboardError}</p>
                    <button
                        onClick={() => dispatch(fetchDashboardData())}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{DASHBOARD_TITLES.reviewer}</h1>
                <p className="text-slate-500">Welcome back! Here's your review overview</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardLoading ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </>
                ) : (
                    <>
                        <StatCard
                            icon={<svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                            value={stats.reviewsThisWeek}
                            label="Reviews This Week"
                        />
                        <StatCard
                            icon={<svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            value={stats.pendingFeedback}
                            label="Pending Feedback"
                        />
                        <StatCard
                            icon={<svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            value={stats.totalCompleted}
                            label="Total Completed"
                        />
                        <StatCard
                            icon={<svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                            value={stats.avgRating.toFixed ? stats.avgRating.toFixed(1) : stats.avgRating}
                            label="Average Rating"
                        />
                    </>
                )}
            </div>

            {/* Your Availability Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-900">Your Availability</h3>
                    <button
                        onClick={() => navigate("/reviewer/availability")}
                        className="text-sm text-teal-600 font-medium hover:text-teal-700"
                    >
                        Manage
                    </button>
                </div>

                {availabilityLoading ? (
                    <div className="animate-pulse flex gap-4">
                        <div className="h-16 bg-slate-100 rounded-lg flex-1"></div>
                        <div className="h-16 bg-slate-100 rounded-lg flex-1"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Status Badge */}
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-600">Status:</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${reviewerStatus === 'available' ? 'bg-green-100 text-green-700' :
                                reviewerStatus === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                                    reviewerStatus === 'dnd' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                {reviewerStatus === 'available' ? '🟢 Available' :
                                    reviewerStatus === 'busy' ? '🟡 Busy' :
                                        reviewerStatus === 'dnd' ? '🔴 Do Not Disturb' : reviewerStatus || 'Not Set'}
                            </span>
                        </div>

                        {/* Availability Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Recurring Days */}
                            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                                <div className="text-xs text-green-600 font-medium mb-2">WEEKLY RECURRING</div>
                                {availabilitySummary.recurringDays.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {availabilitySummary.recurringDays.map(day => (
                                            <span key={day} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
                                                {day}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-green-600">No recurring slots set</p>
                                )}
                                <p className="text-xs text-green-500 mt-2">{availabilitySummary.recurringCount} slot(s)</p>
                            </div>

                            {/* Specific Dates */}
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                <div className="text-xs text-blue-600 font-medium mb-2">UPCOMING SPECIFIC DATES</div>
                                {availabilitySummary.upcomingSpecific.length > 0 ? (
                                    <div className="space-y-1">
                                        {availabilitySummary.upcomingSpecific.map(slot => (
                                            <div key={slot._id} className="text-sm text-blue-700">
                                                <span className="font-medium">{slot.formattedDate}</span>
                                                <span className="text-blue-500 ml-1">
                                                    ({slot.startTime}-{slot.endTime})
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-blue-600">No specific dates set</p>
                                )}
                                <p className="text-xs text-blue-500 mt-2">{availabilitySummary.specificCount} upcoming</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upcoming Reviews */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-900">Upcoming Reviews</h3>
                        <button
                            onClick={() => navigate("/reviewer/requests")}
                            className="text-sm text-teal-600 font-medium hover:text-teal-700"
                        >
                            View All
                        </button>
                    </div>
                    <div className="space-y-3">
                        {dashboardLoading ? (
                            <>
                                <SkeletonListItem />
                                <SkeletonListItem />
                            </>
                        ) : upcomingReviews.length > 0 ? (
                            upcomingReviews.map((review) => (
                                <div key={review._id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
                                            {getInitials(review.student?.name)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">{review.student?.name || "Unknown Student"}</div>
                                            <div className="text-xs text-slate-500">
                                                Advisor: {review.advisor?.name || "N/A"}
                                            </div>
                                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {formatDate(review.scheduledAt)}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleJoin(review)}
                                        className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                                    >
                                        Join
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <p className="text-sm">No upcoming reviews</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Feedback */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-900">Pending Feedback</h3>
                        <button
                            onClick={() => navigate("/reviewer/history")}
                            className="text-sm text-teal-600 font-medium hover:text-teal-700"
                        >
                            View All
                        </button>
                    </div>
                    <div className="space-y-3">
                        {dashboardLoading ? (
                            <>
                                <SkeletonListItem />
                                <SkeletonListItem />
                            </>
                        ) : pendingFeedbackList.length > 0 ? (
                            pendingFeedbackList.map((review) => (
                                <div key={review._id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-sm font-bold">
                                            {getInitials(review.student?.name)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">{review.student?.name || "Unknown Student"}</div>
                                            <div className="text-xs text-slate-500">
                                                {formatReviewedDate(review.updatedAt || review.scheduledAt)}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleSubmitFeedback(review._id)}
                                        className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                                    >
                                        Submit
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-sm">All feedback submitted</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                    onClick={() => navigate("/reviewer/availability")}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-teal-700 text-white rounded-xl font-medium hover:bg-teal-800 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Set Availability
                </button>
                <button
                    onClick={() => navigate("/reviewer/requests")}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    View Requests
                </button>
                <button
                    onClick={() => navigate("/reviewer/history")}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Review History
                </button>
            </div>
        </div>
    );
};

export default ReviewerDashboard;
