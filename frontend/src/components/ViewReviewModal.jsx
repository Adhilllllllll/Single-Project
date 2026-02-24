import React, { useState, useEffect } from "react";

/**
 * ViewReviewModal - Display review details with optional edit mode for advisors
 * Supports editing: scheduledAt, mode, meetingLink, location
 * Editing blocked for scored/cancelled reviews
 */
const ViewReviewModal = ({ isOpen, onClose, review, onUpdate, userRole = "advisor" }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Initialize edit data from review
    useEffect(() => {
        if (review) {
            setEditData({
                scheduledAt: review.scheduledAt
                    ? new Date(review.scheduledAt).toISOString().slice(0, 16)
                    : "",
                mode: review.mode || "online",
                meetingLink: review.meetingLink || "",
                location: review.location || "",
            });
        }
    }, [review]);

    if (!isOpen || !review) return null;

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case "scheduled":
                return "bg-blue-100 text-blue-700";
            case "completed":
                return "bg-amber-100 text-amber-700";
            case "scored":
                return "bg-green-100 text-green-700";
            case "pending":
                return "bg-slate-100 text-slate-700";
            case "accepted":
                return "bg-teal-100 text-teal-700";
            case "cancelled":
                return "bg-red-100 text-red-700";
            default:
                return "bg-slate-100 text-slate-700";
        }
    };

    // Check if editing is allowed
    const canEdit = userRole === "advisor" &&
        review.status?.toLowerCase() !== "scored" &&
        review.status?.toLowerCase() !== "cancelled";

    const handleSave = async () => {
        if (!onUpdate) return;

        setSaving(true);
        setError("");

        try {
            await onUpdate(review.id, {
                scheduledAt: editData.scheduledAt,
                mode: editData.mode,
                meetingLink: editData.meetingLink,
                location: editData.location,
            });
            setIsEditing(false);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update review");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset to original data
        setEditData({
            scheduledAt: review.scheduledAt
                ? new Date(review.scheduledAt).toISOString().slice(0, 16)
                : "",
            mode: review.mode || "online",
            meetingLink: review.meetingLink || "",
            location: review.location || "",
        });
        setIsEditing(false);
        setError("");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700">
                    <h3 className="text-lg font-bold text-white">
                        {isEditing ? "Edit Review Details" : "Review Details"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Student & Reviewer (read-only) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Student</div>
                            <div className="font-semibold text-slate-900">{review.student}</div>
                            <div className="text-xs text-slate-500">{review.studentEmail}</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Reviewer</div>
                            <div className="font-semibold text-slate-900">{review.reviewer}</div>
                            <div className="text-xs text-slate-500">{review.reviewerEmail}</div>
                        </div>
                    </div>

                    {/* Editable Fields */}
                    {isEditing ? (
                        <div className="space-y-4">
                            {/* Date & Time */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editData.scheduledAt}
                                    onChange={(e) => setEditData({ ...editData, scheduledAt: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>

                            {/* Mode */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Mode
                                </label>
                                <select
                                    value={editData.mode}
                                    onChange={(e) => setEditData({ ...editData, mode: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                >
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                </select>
                            </div>

                            {/* Meeting Link (for online) */}
                            {editData.mode === "online" && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Meeting Link
                                    </label>
                                    <input
                                        type="url"
                                        value={editData.meetingLink}
                                        onChange={(e) => setEditData({ ...editData, meetingLink: e.target.value })}
                                        placeholder="https://meet.google.com/..."
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {/* Location (for offline) */}
                            {editData.mode === "offline" && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        value={editData.location}
                                        onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                                        placeholder="Room 101, Building A"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Read-only Details Table */
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100">
                                    <td className="py-3 text-slate-500">Date</td>
                                    <td className="py-3 text-right font-medium text-slate-900">
                                        {formatDate(review.scheduledAt)}
                                    </td>
                                </tr>
                                <tr className="border-b border-slate-100">
                                    <td className="py-3 text-slate-500">Time</td>
                                    <td className="py-3 text-right font-medium text-slate-900">
                                        {formatTime(review.scheduledAt)}
                                    </td>
                                </tr>
                                <tr className="border-b border-slate-100">
                                    <td className="py-3 text-slate-500">Domain</td>
                                    <td className="py-3 text-right font-medium text-slate-900">
                                        {review.domain || "General"}
                                    </td>
                                </tr>
                                <tr className="border-b border-slate-100">
                                    <td className="py-3 text-slate-500">Week</td>
                                    <td className="py-3 text-right font-medium text-slate-900">
                                        Week {review.week}
                                    </td>
                                </tr>
                                <tr className="border-b border-slate-100">
                                    <td className="py-3 text-slate-500">Mode</td>
                                    <td className="py-3 text-right font-medium text-slate-900 capitalize">
                                        {review.mode}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-3 text-slate-500">Status</td>
                                    <td className="py-3 text-right">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                                            {review.status}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    )}

                    {/* Meeting Link / Location (read-only view) */}
                    {!isEditing && review.meetingLink && (
                        <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-xs text-blue-600 font-medium mb-1">Meeting Link</div>
                            <a href={review.meetingLink} target="_blank" rel="noopener noreferrer"
                                className="text-blue-700 hover:underline text-sm break-all">
                                {review.meetingLink}
                            </a>
                        </div>
                    )}

                    {!isEditing && review.location && (
                        <div className="bg-green-50 rounded-lg p-3">
                            <div className="text-xs text-green-600 font-medium mb-1">Location</div>
                            <div className="text-green-700 text-sm">{review.location}</div>
                        </div>
                    )}

                    {/* Scores (if scored) */}
                    {review.status?.toLowerCase() === "scored" && (
                        <div className="bg-green-50 rounded-lg p-4 space-y-3">
                            <h4 className="text-sm font-semibold text-green-800">Final Scores</h4>
                            <div className="grid grid-cols-3 gap-3">
                                {review.marks !== undefined && (
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-700">{review.marks}</div>
                                        <div className="text-xs text-green-600">Final Score</div>
                                    </div>
                                )}
                                {review.attendance !== undefined && (
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-700">{review.attendance}</div>
                                        <div className="text-xs text-green-600">Attendance</div>
                                    </div>
                                )}
                                {review.discipline !== undefined && (
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-700">{review.discipline}</div>
                                        <div className="text-xs text-green-600">Discipline</div>
                                    </div>
                                )}
                            </div>
                            {review.feedback && (
                                <div className="pt-2 border-t border-green-200">
                                    <div className="text-xs text-green-700 font-medium mb-1">Feedback</div>
                                    <div className="text-green-800 text-sm">{review.feedback}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Completed but not scored */}
                    {review.status?.toLowerCase() === "completed" && (
                        <div className="bg-amber-50 rounded-lg p-4 space-y-2">
                            <div className="text-amber-700 font-medium text-sm">
                                Review completed - awaiting final scoring
                            </div>
                            {review.feedback && (
                                <div>
                                    <div className="text-amber-700 font-medium text-xs mb-1">Feedback</div>
                                    <div className="text-amber-900 text-sm">{review.feedback}</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="flex-1 py-2.5 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            {canEdit && onUpdate && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Details
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className={`${canEdit && onUpdate ? "flex-1" : "w-full"} py-2.5 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors`}
                            >
                                Close
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewReviewModal;
