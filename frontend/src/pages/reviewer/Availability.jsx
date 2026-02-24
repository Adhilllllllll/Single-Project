import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    fetchAllAvailability,
    fetchMyStatus,
    updateMyStatus,
    addAvailability,
    addBreak,
    removeAvailability,
} from "../../features/availability/availabilitySlice";

// Day configuration
const DAYS = [

    { value: 1, label: "Monday", short: "Mon" },
    { value: 2, label: "Tuesday", short: "Tue" },
    { value: 3, label: "Wednesday", short: "Wed" },
    { value: 4, label: "Thursday", short: "Thu" },
    { value: 5, label: "Friday", short: "Fri" },
    { value: 6, label: "Saturday", short: "Sat" },
];

// Weekdays for grid (Mon-Sat)
const WEEKDAYS = DAYS.filter(d => d.value >= 1 && d.value <= 6);

// Get today's date in YYYY-MM-DD format (local timezone)
const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Get current time in HH:mm format
const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

// Format time from 24h to 12h
const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

// Format time range for grid display (using 12h AM/PM)
const formatTimeRange = (start, end) => {
    return `${formatTime(start)} - ${formatTime(end)}`;
};

const Availability = () => {
    const dispatch = useDispatch();
    const { list, breaks, status, loading, error } = useSelector((state) => state.availability);

    // Tab state: "recurring" or "specific"
    const [activeTab, setActiveTab] = useState("recurring");

    // Conflict/error toast state
    const [conflictError, setConflictError] = useState(null);

    // Form states - Recurring
    const [slotForm, setSlotForm] = useState({
        availabilityType: "recurring",
        dayOfWeek: "",
        startTime: "",
        endTime: "",
        isRecurring: true,
    });

    // Form states - Specific Date
    const [specificForm, setSpecificForm] = useState({
        availabilityType: "specific",
        specificDate: "",
        startTime: "",
        endTime: "",
    });

    const [breakForm, setBreakForm] = useState({
        dayOfWeek: "",
        startTime: "",
        endTime: "",
        label: "",
    });

    // Fetch data on mount
    useEffect(() => {
        dispatch(fetchAllAvailability());
        dispatch(fetchMyStatus());
    }, [dispatch]);

    // Watch for Redux errors and display conflict toast
    useEffect(() => {
        if (error) {
            setConflictError(error);
            // Auto-dismiss after 5 seconds
            const timer = setTimeout(() => setConflictError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // Handle status change
    const handleStatusChange = (newStatus) => {
        dispatch(updateMyStatus(newStatus));
    };

    // Handle slot form changes
    const handleSlotChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSlotForm({
            ...slotForm,
            [name]: type === "checkbox" ? checked : (name === "dayOfWeek" ? Number(value) : value)
        });
    };

    // Handle specific date form changes
    const handleSpecificChange = (e) => {
        const { name, value } = e.target;
        setSpecificForm({
            ...specificForm,
            [name]: value
        });
    };

    // Handle break form changes
    const handleBreakChange = (e) => {
        const { name, value } = e.target;
        setBreakForm({
            ...breakForm,
            [name]: name === "dayOfWeek" ? Number(value) : value
        });
    };

    // Check for overlap with existing slots (client-side validation)
    const checkForOverlap = (newStart, newEnd, dayOrDate, isRecurring) => {
        // Check against existing slots
        for (const slot of list) {
            // For recurring slots, check same day of week
            if (isRecurring && slot.dayOfWeek === dayOrDate) {
                // Check time overlap
                if (newStart < slot.endTime && newEnd > slot.startTime) {
                    return `Time overlaps with existing slot (${formatTime(slot.startTime)} - ${formatTime(slot.endTime)})`;
                }
            }
            // For specific dates, we rely on backend validation
        }
        return null; // No overlap
    };

    // Submit recurring slot
    const handleAddSlot = (e) => {
        e.preventDefault();
        // Check if dayOfWeek is selected (can be 0 for Sunday, so check for empty string)
        const dayValue = slotForm.dayOfWeek;
        if (dayValue === "" || dayValue === null || dayValue === undefined) {
            setConflictError("Please select a day of the week");
            return;
        }
        if (!slotForm.startTime || !slotForm.endTime) {
            setConflictError("Please select both start and end time");
            return;
        }
        if (slotForm.startTime >= slotForm.endTime) {
            setConflictError("Start time must be before end time");
            return;
        }

        // Client-side overlap check
        const overlapError = checkForOverlap(slotForm.startTime, slotForm.endTime, Number(dayValue), true);
        if (overlapError) {
            setConflictError(overlapError);
            return;
        }

        // Build payload with explicit dayOfWeek as number
        const payload = {
            availabilityType: "recurring",
            dayOfWeek: Number(dayValue),
            startTime: slotForm.startTime,
            endTime: slotForm.endTime,
            isRecurring: true,
        };
        console.log("📤 Submitting recurring slot:", payload);
        dispatch(addAvailability(payload));
        setSlotForm({ ...slotForm, startTime: "", endTime: "" });
    };

    // Submit specific date slot
    const handleAddSpecificSlot = (e) => {
        e.preventDefault();

        // Debug log the form state
        console.log("📋 Specific Form State:", specificForm);

        const dateValue = specificForm.specificDate;
        const startValue = specificForm.startTime;
        const endValue = specificForm.endTime;

        console.log("📋 Time comparison:", { startValue, endValue, isStartBeforeEnd: startValue < endValue });

        if (!dateValue) {
            setConflictError("Please select a date");
            return;
        }
        if (!startValue || !endValue) {
            setConflictError("Please select both start and end time");
            return;
        }
        if (startValue >= endValue) {
            setConflictError("Start time must be before end time");
            return;
        }

        // Clear any previous errors before submitting
        setConflictError(null);

        // Build payload with the "date" field that backend expects
        const payload = {
            date: dateValue,
            startTime: startValue,
            endTime: endValue,
        };
        console.log("📤 Submitting specific date slot:", payload);
        dispatch(addAvailability(payload));
        setSpecificForm({ ...specificForm, specificDate: "", startTime: "", endTime: "" });
    };

    // Submit break
    const handleAddBreak = (e) => {
        e.preventDefault();
        if (breakForm.dayOfWeek === "" || !breakForm.startTime || !breakForm.endTime) return;
        dispatch(addBreak(breakForm));
        setBreakForm({ dayOfWeek: "", startTime: "", endTime: "", label: "" });
    };

    // Delete slot or break
    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this?")) {
            dispatch(removeAvailability(id));
        }
    };

    // Build weekly grid data (includes both recurring and specific date slots)
    const weeklyGrid = useMemo(() => {
        const grid = {};
        WEEKDAYS.forEach(day => {
            grid[day.value] = { slots: [], breaks: [], specificSlots: [] };
        });

        // Add recurring slots
        list.forEach(slot => {
            if (slot.availabilityType === "recurring" && grid[slot.dayOfWeek]) {
                grid[slot.dayOfWeek].slots.push(slot);
            } else if (slot.availabilityType === "specific" && slot.specificDate) {
                // For specific date slots, calculate the day of week from the date
                const slotDate = new Date(slot.specificDate);
                const dayOfWeek = slotDate.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
                if (grid[dayOfWeek]) {
                    grid[dayOfWeek].specificSlots.push({
                        ...slot,
                        formattedDate: slotDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    });
                }
            }
        });

        // Add breaks
        breaks.forEach(breakItem => {
            if (grid[breakItem.dayOfWeek]) {
                grid[breakItem.dayOfWeek].breaks.push(breakItem);
            }
        });

        return grid;
    }, [list, breaks]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Availability & Status</h2>
                <p className="text-slate-500">Manage your availability and review schedule</p>
            </div>

            {/* Conflict/Error Toast */}
            {conflictError && (
                <div className="fixed top-4 right-4 z-50 max-w-md animate-pulse">
                    <div className="bg-amber-50 border border-amber-300 rounded-xl shadow-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-amber-800">Time Slot Conflict</h4>
                                <p className="text-sm text-amber-700 mt-1">{conflictError}</p>
                            </div>
                            <button
                                onClick={() => setConflictError(null)}
                                className="flex-shrink-0 text-amber-500 hover:text-amber-700"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Current Status Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Current Status</h3>
                <div className="grid grid-cols-3 gap-4">
                    {/* Available */}
                    <button
                        onClick={() => handleStatusChange("available")}
                        className={`p-4 rounded-lg border-2 transition-all ${status === "available"
                            ? "border-green-500 bg-green-50"
                            : "border-slate-200 hover:border-green-300"
                            }`}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className={`font-medium ${status === "available" ? "text-green-700" : "text-slate-600"}`}>
                                Available
                            </span>
                        </div>
                    </button>

                    {/* Busy */}
                    <button
                        onClick={() => handleStatusChange("busy")}
                        className={`p-4 rounded-lg border-2 transition-all ${status === "busy"
                            ? "border-yellow-500 bg-yellow-50"
                            : "border-slate-200 hover:border-yellow-300"
                            }`}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className={`font-medium ${status === "busy" ? "text-yellow-700" : "text-slate-600"}`}>
                                Busy
                            </span>
                        </div>
                    </button>

                    {/* Do Not Disturb */}
                    <button
                        onClick={() => handleStatusChange("dnd")}
                        className={`p-4 rounded-lg border-2 transition-all ${status === "dnd"
                            ? "border-red-500 bg-red-50"
                            : "border-slate-200 hover:border-red-300"
                            }`}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className={`font-medium ${status === "dnd" ? "text-red-700" : "text-slate-600"}`}>
                                Do Not Disturb
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Add Availability Slot Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Add Availability Slot</h3>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setActiveTab("recurring")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "recurring"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                    >
                        Recurring (Weekly)
                    </button>
                    <button
                        onClick={() => setActiveTab("specific")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "specific"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                    >
                        Specific Date
                    </button>
                </div>

                {/* Recurring Slot Form */}
                {activeTab === "recurring" && (
                    <>
                        <form onSubmit={handleAddSlot} className="flex flex-wrap items-end gap-4">
                            <div className="flex-1 min-w-[140px]">
                                <label className="block text-xs text-slate-500 mb-1">Day of Week</label>
                                <select
                                    name="dayOfWeek"
                                    value={slotForm.dayOfWeek}
                                    onChange={handleSlotChange}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                >
                                    <option value="">Select Day</option>
                                    {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                </select>
                            </div>
                            <div className="w-32">
                                <label className="block text-xs text-slate-500 mb-1">Start Time</label>
                                <input
                                    type="time"
                                    name="startTime"
                                    value={slotForm.startTime}
                                    onChange={handleSlotChange}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div className="w-32">
                                <label className="block text-xs text-slate-500 mb-1">End Time</label>
                                <input
                                    type="time"
                                    name="endTime"
                                    value={slotForm.endTime}
                                    onChange={handleSlotChange}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                            >
                                <span>+</span> Add Recurring
                            </button>
                        </form>
                        <p className="text-xs text-slate-500 mt-2">This slot will repeat every week on the selected day.</p>
                    </>
                )}

                {/* Specific Date Form */}
                {activeTab === "specific" && (
                    <>
                        <form onSubmit={handleAddSpecificSlot} className="flex flex-wrap items-end gap-4">
                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-xs text-slate-500 mb-1">Date</label>
                                <input
                                    type="date"
                                    name="specificDate"
                                    value={specificForm.specificDate}
                                    onChange={handleSpecificChange}
                                    min={getTodayDate()}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div className="w-32">
                                <label className="block text-xs text-slate-500 mb-1">Start Time</label>
                                <input
                                    type="time"
                                    name="startTime"
                                    value={specificForm.startTime}
                                    onChange={handleSpecificChange}
                                    min={specificForm.specificDate === getTodayDate() ? getCurrentTime() : undefined}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div className="w-32">
                                <label className="block text-xs text-slate-500 mb-1">End Time</label>
                                <input
                                    type="time"
                                    name="endTime"
                                    value={specificForm.endTime}
                                    onChange={handleSpecificChange}
                                    min={specificForm.startTime || undefined}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                            >
                                <span>+</span> Add Date Slot
                            </button>
                        </form>
                        <p className="text-xs text-slate-500 mt-2">This slot is for a specific date only (one-time).</p>
                    </>
                )}
            </div>

            {/* Available Time Slots */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Available Time Slots</h3>
                {loading && list.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : list.length === 0 ? (
                    <p className="text-slate-400 text-sm">No availability slots created yet.</p>
                ) : (
                    <div className="space-y-3">
                        {list.map((slot) => {
                            const isSpecific = slot.availabilityType === "specific";
                            const bgColor = isSpecific ? "bg-blue-50 border-blue-100" : "bg-purple-50 border-purple-100";
                            const iconBg = isSpecific ? "bg-blue-100" : "bg-purple-100";
                            const iconColor = isSpecific ? "text-blue-600" : "text-purple-600";
                            const labelColor = isSpecific ? "text-blue-600" : "text-purple-600";

                            return (
                                <div key={slot._id} className={`flex items-center justify-between p-3 border rounded-lg ${bgColor}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBg}`}>
                                            <svg className={`w-4 h-4 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                {isSpecific ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                )}
                                            </svg>
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-900">
                                                {isSpecific
                                                    ? `${new Date(slot.specificDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: `
                                                    : `${DAYS.find(d => d.value === slot.dayOfWeek)?.label}: `
                                                }
                                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                            </span>
                                            <span className={`ml-2 text-xs ${labelColor}`}>
                                                {isSpecific ? "One-time" : "Recurring weekly"}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(slot._id)}
                                        className="text-red-500 hover:text-red-700 p-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Break Time Blocks Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Break Time Blocks</h3>
                <form onSubmit={handleAddBreak} className="flex flex-wrap items-end gap-4 mb-4">
                    <div className="flex-1 min-w-[140px]">
                        <select
                            name="dayOfWeek"
                            value={breakForm.dayOfWeek}
                            onChange={handleBreakChange}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                        >
                            <option value="">Select Day</option>
                            {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                    </div>
                    <div className="w-32">
                        <input
                            type="time"
                            name="startTime"
                            value={breakForm.startTime}
                            onChange={handleBreakChange}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div className="w-32">
                        <input
                            type="time"
                            name="endTime"
                            value={breakForm.endTime}
                            onChange={handleBreakChange}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                    >
                        <span>+</span> Add Break
                    </button>
                </form>

                {/* Break List */}
                {breaks.length === 0 ? (
                    <p className="text-slate-400 text-sm">No break blocks created yet.</p>
                ) : (
                    <div className="space-y-3">
                        {breaks.map((breakItem) => (
                            <div key={breakItem._id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-900">
                                            {DAYS.find(d => d.value === breakItem.dayOfWeek)?.label}: {formatTime(breakItem.startTime)} - {formatTime(breakItem.endTime)}
                                        </span>
                                        {breakItem.label && (
                                            <span className="ml-2 text-xs text-yellow-700">{breakItem.label}</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(breakItem._id)}
                                    className="text-red-500 hover:text-red-700 p-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Weekly Availability Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Weekly Availability Grid</h3>
                <div className="grid grid-cols-6 gap-4">
                    {WEEKDAYS.map((day) => (
                        <div key={day.value}>
                            <div className="text-sm font-semibold text-slate-600 mb-2">{day.label}</div>
                            <div className="space-y-2 min-h-[80px]">
                                {/* Recurring Slots (Green) */}
                                {weeklyGrid[day.value]?.slots.map((slot) => (
                                    <div
                                        key={slot._id}
                                        className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium"
                                    >
                                        {formatTimeRange(slot.startTime, slot.endTime)}
                                    </div>
                                ))}
                                {/* Specific Date Slots (Blue) */}
                                {weeklyGrid[day.value]?.specificSlots.map((slot) => (
                                    <div
                                        key={slot._id}
                                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium"
                                        title={`Specific: ${slot.formattedDate}`}
                                    >
                                        <div className="text-[10px] text-blue-600">{slot.formattedDate}</div>
                                        {formatTimeRange(slot.startTime, slot.endTime)}
                                    </div>
                                ))}
                                {/* Break Blocks (Yellow) */}
                                {weeklyGrid[day.value]?.breaks.map((breakItem) => (
                                    <div
                                        key={breakItem._id}
                                        className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded font-medium"
                                    >
                                        {formatTimeRange(breakItem.startTime, breakItem.endTime)}
                                    </div>
                                ))}
                                {/* Empty state */}
                                {weeklyGrid[day.value]?.slots.length === 0 &&
                                    weeklyGrid[day.value]?.specificSlots.length === 0 &&
                                    weeklyGrid[day.value]?.breaks.length === 0 && (
                                        <div className="text-xs text-slate-300">-</div>
                                    )}
                            </div>
                        </div>
                    ))}
                </div>
                {/* Legend */}
                <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-100 rounded"></div>
                        <span className="text-slate-500">Recurring Weekly</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-100 rounded"></div>
                        <span className="text-slate-500">Specific Date</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-100 rounded"></div>
                        <span className="text-slate-500">Break</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Availability;
