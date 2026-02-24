import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../api/axios";

/**
 * RescheduleReviewModal - Modal for rescheduling a review
 * Supports changing reviewer and slot-based time selection
 */
const RescheduleReviewModal = ({ isOpen, onClose, review, onSubmit, isLoading }) => {
    const { reviewers } = useSelector((state) => state.advisor);

    const [newReviewerId, setNewReviewerId] = useState("");
    const [newDate, setNewDate] = useState("");
    const [selectedSlotId, setSelectedSlotId] = useState("");
    const [newTime, setNewTime] = useState("");
    const [notify, setNotify] = useState(true);
    const [error, setError] = useState("");

    // Slot fetching state
    const [availableSlots, setAvailableSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    // Initialize form with existing review data
    useEffect(() => {
        if (isOpen && review) {
            setNewReviewerId(review.reviewerId || "");
            if (review.scheduledAt) {
                const date = new Date(review.scheduledAt);
                setNewDate(date.toISOString().split('T')[0]);
                setNewTime(date.toTimeString().slice(0, 5));
            }
        }
        if (!isOpen) {
            setError("");
            setAvailableSlots([]);
            setSelectedSlotId("");
        }
    }, [isOpen, review]);

    // Fetch available slots when reviewer and date change
    useEffect(() => {
        if (!newReviewerId || !newDate) {
            setAvailableSlots([]);
            return;
        }

        const fetchSlots = async () => {
            setSlotsLoading(true);
            try {
                const res = await api.get(`/reviewer/availability/by-date?date=${newDate}&reviewerId=${newReviewerId}`);
                setAvailableSlots(res.data || []);
            } catch (err) {
                console.error("Failed to fetch slots:", err);
                setAvailableSlots([]);
            } finally {
                setSlotsLoading(false);
            }
        };
        fetchSlots();
    }, [newReviewerId, newDate]);

    if (!isOpen || !review) return null;

    const handleReviewerChange = (e) => {
        setNewReviewerId(e.target.value);
        setSelectedSlotId("");
        setNewTime("");
    };

    const handleDateChange = (e) => {
        setNewDate(e.target.value);
        setSelectedSlotId("");
        setNewTime("");
    };

    const handleSlotChange = (e) => {
        const slotId = e.target.value;
        setSelectedSlotId(slotId);
        const selectedSlot = availableSlots.find(s => s._id === slotId);
        setNewTime(selectedSlot?.startTime || "");
    };

    const formatTime = (time) => {
        if (!time) return "";
        const [h, m] = time.split(":");
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        return `${hour % 12 || 12}:${m} ${ampm}`;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");

        if (!newDate || !newTime) {
            setError("Please select date and time slot");
            return;
        }

        const scheduledAt = new Date(`${newDate}T${newTime}`);
        if (scheduledAt <= new Date()) {
            setError("Please select a future date and time");
            return;
        }

        onSubmit({
            reviewerId: newReviewerId,
            scheduledAt: scheduledAt.toISOString(),
            notifyParticipants: notify,
        });
    };

    // Get selected reviewer name for display
    const selectedReviewerName = reviewers.find(r => r.id === newReviewerId)?.name || review.reviewer;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">Reschedule Review</h3>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Review Info */}
                    <p className="text-sm text-slate-600">
                        Reschedule review for <span className="font-semibold text-slate-900">{review.student}</span>
                    </p>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Reviewer Select */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Reviewer
                        </label>
                        <select
                            value={newReviewerId}
                            onChange={handleReviewerChange}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading}
                        >
                            <option value="">Select a reviewer</option>
                            {reviewers.filter(r => r.status === "Available").map(reviewer => (
                                <option key={reviewer.id} value={reviewer.id}>
                                    {reviewer.name} ({reviewer.title})
                                </option>
                            ))}
                        </select>
                        {newReviewerId !== review.reviewerId && newReviewerId && (
                            <p className="text-xs text-blue-600 mt-1">
                                Changing from {review.reviewer} to {selectedReviewerName}
                            </p>
                        )}
                    </div>

                    {/* Date Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            New Date
                        </label>
                        <input
                            type="date"
                            value={newDate}
                            onChange={handleDateChange}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Time Slot Select */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Time Slot
                        </label>
                        {slotsLoading ? (
                            <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-400 text-sm">
                                Loading slots...
                            </div>
                        ) : !newReviewerId || !newDate ? (
                            <div className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-400 text-sm">
                                Select reviewer & date first
                            </div>
                        ) : availableSlots.length === 0 ? (
                            <div className="w-full px-4 py-2.5 border border-amber-200 rounded-lg bg-amber-50 text-amber-600 text-sm">
                                No slots available for this date
                            </div>
                        ) : (
                            <select
                                value={selectedSlotId}
                                onChange={handleSlotChange}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isLoading}
                            >
                                <option value="">Select time slot</option>
                                {availableSlots.map(slot => (
                                    <option key={slot._id} value={slot._id}>
                                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Notify Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={notify}
                            onChange={(e) => setNotify(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                        <span className="text-sm text-slate-700">Notify student and reviewer</span>
                    </label>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || (!selectedSlotId && !newTime)}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Rescheduling...
                                </>
                            ) : (
                                "Reschedule"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RescheduleReviewModal;
