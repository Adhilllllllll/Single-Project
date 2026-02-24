import React, { useState } from "react";
import ScoreSlider, { REVIEWER_SCORE_FIELDS, SCORE_CONFIG, calculateAverageScore } from "./ScoreSlider";

/**
 * ReviewerEvaluationModal
 * Modal for reviewers to submit task-wise evaluation when marking review as completed
 * Uses dynamic ScoreSlider component with 0.5 step increments
 * NO overallPerformance - that's advisor-only
 */
const ReviewerEvaluationModal = ({ isOpen, onClose, onSubmit, review, loading }) => {
    // Initialize scores from config (4 task-wise scores only)
    const [scores, setScores] = useState(() => {
        const initial = {};
        REVIEWER_SCORE_FIELDS.forEach(f => {
            initial[f.key] = SCORE_CONFIG.default;
        });
        return initial;
    });
    const [feedback, setFeedback] = useState("");
    const [remarks, setRemarks] = useState("");
    const [errors, setErrors] = useState({});

    const handleScoreChange = (key, value) => {
        setScores((prev) => ({
            ...prev,
            [key]: value,
        }));
        if (errors[key]) {
            setErrors((prev) => ({ ...prev, [key]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Validate feedback
        if (!feedback.trim()) {
            newErrors.feedback = "Feedback is required";
        } else if (feedback.trim().length < 10) {
            newErrors.feedback = "Feedback must be at least 10 characters";
        }

        // Validate scores (0-10, 0.5 step)
        REVIEWER_SCORE_FIELDS.forEach(({ key, label }) => {
            const value = scores[key];
            if (value < SCORE_CONFIG.min || value > SCORE_CONFIG.max) {
                newErrors[key] = `${label} must be between ${SCORE_CONFIG.min} and ${SCORE_CONFIG.max}`;
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        onSubmit({
            scores,
            feedback: feedback.trim(),
            remarks: remarks.trim(),
        });
    };

    const averageScore = calculateAverageScore(scores, REVIEWER_SCORE_FIELDS);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-600 to-teal-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                Complete Review & Submit Evaluation
                            </h2>
                            <p className="text-teal-100 text-sm mt-1">
                                Student: {review?.student?.name || "Unknown"}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    {/* Scoring Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Task-wise Evaluation
                            <span className="text-xs text-slate-400 font-normal">(0.5 increments)</span>
                        </h3>

                        <div className="space-y-4">
                            {REVIEWER_SCORE_FIELDS.map(({ key, label }) => (
                                <ScoreSlider
                                    key={key}
                                    label={label}
                                    value={scores[key]}
                                    onChange={(val) => handleScoreChange(key, val)}
                                    min={SCORE_CONFIG.min}
                                    max={SCORE_CONFIG.max}
                                    step={SCORE_CONFIG.step}
                                    error={errors[key]}
                                />
                            ))}
                        </div>

                        {/* Average Score Display */}
                        <div className="mt-4 p-4 bg-teal-50 rounded-xl border border-teal-100">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-teal-700">
                                    Average Score
                                </span>
                                <span className="text-2xl font-bold text-teal-600">
                                    {averageScore}/{SCORE_CONFIG.max}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Feedback Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Feedback
                        </h3>
                        <textarea
                            value={feedback}
                            onChange={(e) => {
                                setFeedback(e.target.value);
                                if (errors.feedback) setErrors((prev) => ({ ...prev, feedback: null }));
                            }}
                            placeholder="Provide detailed feedback about the student's performance..."
                            className={`w-full h-32 px-4 py-3 border rounded-xl text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${errors.feedback ? "border-red-300 bg-red-50" : "border-slate-200"
                                }`}
                            required
                        />
                        {errors.feedback && (
                            <p className="text-red-500 text-sm mt-1">{errors.feedback}</p>
                        )}
                    </div>

                    {/* Remarks Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Additional Remarks
                            <span className="text-xs font-normal text-slate-400">(Optional)</span>
                        </h3>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Any additional notes or observations..."
                            className="w-full h-20 px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Complete Review & Submit
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewerEvaluationModal;
