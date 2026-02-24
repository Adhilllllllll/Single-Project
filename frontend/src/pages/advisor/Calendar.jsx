import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdvisorReviews } from "../../features/advisor/advisorSlice";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const Calendar = () => {
    const dispatch = useDispatch();
    const { reviews, loading } = useSelector((state) => state.advisor);

    // Calendar state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date()); // Selected day
    const today = useMemo(() => new Date(), []);

    useEffect(() => {
        dispatch(fetchAdvisorReviews());
    }, [dispatch]);

    // Get current month/year
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Calculate calendar days (always 6 weeks = 42 cells for consistent layout)
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const startingDayOfWeek = firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();

        const days = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push({ day: null, date: null });
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push({
                day,
                date: new Date(currentYear, currentMonth, day),
            });
        }

        // Fill remaining cells to complete 6 weeks (42 cells)
        while (days.length < 42) {
            days.push({ day: null, date: null });
        }

        return days;
    }, [currentMonth, currentYear]);

    // Map reviews to dates
    const reviewsByDate = useMemo(() => {
        const map = {};
        reviews.forEach(review => {
            if (review.scheduledAt) {
                const date = new Date(review.scheduledAt);
                const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                if (!map[key]) map[key] = [];
                map[key].push(review);
            }
        });
        return map;
    }, [reviews]);

    // Get events for a specific date
    const getEventsForDate = useCallback((date) => {
        if (!date) return [];
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        return reviewsByDate[key] || [];
    }, [reviewsByDate]);

    // Check if date is today
    const isToday = useCallback((date) => {
        if (!date) return false;
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    }, [today]);

    // Check if date is selected
    const isSelected = useCallback((date) => {
        if (!date || !selectedDate) return false;
        return date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
    }, [selectedDate]);

    // Selected date events
    const selectedDateEvents = useMemo(() => {
        return getEventsForDate(selectedDate);
    }, [getEventsForDate, selectedDate]);

    // Upcoming reviews (next 5)
    const upcomingReviews = useMemo(() => {
        const now = new Date();
        return reviews
            .filter(r => new Date(r.scheduledAt) > now)
            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
            .slice(0, 5);
    }, [reviews]);

    // Navigation handlers
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const goToToday = () => {
        const now = new Date();
        setCurrentDate(now);
        setSelectedDate(now);
    };

    // Handle day click
    const handleDayClick = (date) => {
        if (date) {
            setSelectedDate(date);
        }
    };

    // Format time
    const formatTime = (dateString) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    // Format date for display
    const formatSelectedDate = (date) => {
        if (!date) return "";
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    };

    // Format short date for upcoming
    const formatShortDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
    };

    return (
        <div className="flex gap-6">
            {/* Left: Calendar */}
            <div className="flex-1">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900">
                        {MONTHS[currentMonth]} {currentYear}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={goToPreviousMonth}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={goToToday}
                            className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                            Today
                        </button>
                        <button
                            onClick={goToNextMonth}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                        {DAYS.map(day => (
                            <div key={day} className="py-3 text-center text-sm font-medium text-slate-500">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Date Cells */}
                    {loading.reviews ? (
                        <div className="h-96 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-7">
                            {calendarDays.map((cell, idx) => {
                                const events = getEventsForDate(cell.date);
                                const isTodayCell = isToday(cell.date);
                                const isSelectedCell = isSelected(cell.date);

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleDayClick(cell.date)}
                                        className={`min-h-24 p-2 border-b border-r border-slate-100 cursor-pointer transition-colors
                                            ${cell.day ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 cursor-default'}
                                            ${isTodayCell ? 'ring-2 ring-inset ring-green-500' : ''}
                                            ${isSelectedCell && !isTodayCell ? 'bg-blue-50' : ''}
                                        `}
                                    >
                                        {cell.day && (
                                            <>
                                                <div className={`text-sm mb-1 ${isTodayCell
                                                        ? 'font-bold text-green-600'
                                                        : isSelectedCell
                                                            ? 'font-bold text-blue-600'
                                                            : 'text-slate-700'
                                                    }`}>
                                                    {cell.day}
                                                </div>
                                                <div className="space-y-1">
                                                    {events.slice(0, 2).map((event, i) => (
                                                        <div
                                                            key={i}
                                                            className={`text-xs px-1.5 py-0.5 rounded truncate ${event.type === 'meeting'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-green-100 text-green-700'
                                                                }`}
                                                            title={event.student || event.title}
                                                        >
                                                            {event.student || event.title}
                                                        </div>
                                                    ))}
                                                    {events.length > 2 && (
                                                        <div className="text-xs text-slate-400 px-1">
                                                            +{events.length - 2} more
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-72 space-y-4">
                {/* Selected Day's Schedule */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <h3 className="font-semibold text-slate-900 mb-1">
                        {isToday(selectedDate) ? "Today's Schedule" : "Selected Day"}
                    </h3>
                    <p className="text-xs text-slate-400 mb-3">{formatSelectedDate(selectedDate)}</p>

                    {selectedDateEvents.length === 0 ? (
                        <p className="text-sm text-slate-400">No events scheduled for this day</p>
                    ) : (
                        <div className="space-y-3">
                            {selectedDateEvents.map((event, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg">
                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-slate-900 text-sm truncate">{event.student}</div>
                                        <div className="text-xs text-slate-500">{event.reviewer}</div>
                                        <div className="text-xs text-green-600 font-medium mt-1">{formatTime(event.scheduledAt)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Upcoming Reviews */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Upcoming Reviews</h3>
                    {upcomingReviews.length === 0 ? (
                        <p className="text-sm text-slate-400">No upcoming reviews</p>
                    ) : (
                        <div className="space-y-3">
                            {upcomingReviews.map((review, idx) => (
                                <div key={idx} className="flex items-start justify-between">
                                    <div>
                                        <div className="font-medium text-slate-900 text-sm">{review.student}</div>
                                        <div className="text-xs text-slate-500">{review.reviewer}</div>
                                        <div className="text-xs text-slate-400">{formatShortDate(review.scheduledAt)}</div>
                                    </div>
                                    <span className="text-xs font-medium text-green-600">
                                        {formatTime(review.scheduledAt)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Legend</h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                            <span className="text-slate-600">Review Sessions</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
                            <span className="text-slate-600">Meetings</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded border-2 border-green-500"></div>
                            <span className="text-slate-600">Today</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Calendar;
