import React, { useState, useEffect } from "react";

/**
 * CancelReviewModal - Modal for cancelling a review with reason
 * Matches Figma design
 */
const CancelReviewModal = ({ isOpen, onClose, review, onSubmit, isLoading }) => {
    const [reason, setReason] = useState("");
    const [notify, setNotify] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isOpen) {
            setReason("");
            setError("");
            setNotify(true);
        }
    }, [isOpen]);

    if (!isOpen || !review) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");

        if (!reason.trim()) {
            setError("Please provide a reason for cancellation");
            return;
        }

        onSubmit({
            reason: reason.trim(),
            notifyParticipants: notify,
        });
    };

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
                    <h3 className="text-lg font-semibold text-slate-900">Cancel Review</h3>
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
                    {/* Warning */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="text-sm text-red-700">
                                    Are you sure you want to cancel this review?
                                </p>
                                <p className="text-sm text-red-600 mt-1">
                                    Review for <span className="font-semibold">{review.student}</span> with <span className="font-semibold">{review.reviewer}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Reason Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Reason for cancellation <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Please provide a reason..."
                            rows={3}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Notify Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={notify}
                            onChange={(e) => setNotify(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
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
                            Keep Review
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Cancelling...
                                </>
                            ) : (
                                "Cancel Review"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CancelReviewModal;
