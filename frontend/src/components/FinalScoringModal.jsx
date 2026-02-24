import React, { useState, useEffect } from "react";
import ScoreSlider, { REVIEWER_SCORE_FIELDS, ADVISOR_SCORE_FIELDS, SCORE_CONFIG } from "./ScoreSlider";

/**
 * FinalScoringModal
 * Modal for advisors to review reviewer's evaluation and submit final score
 * Includes advisor-specific fields: Attendance, Discipline
 * Uses dynamic ScoreSlider component with 0.5 step increments
 */
const FinalScoringModal = ({ isOpen, onClose, onSubmit, review, reviewerEvaluation, loading }) => {
    const [finalScore, setFinalScore] = useState(5);
    const [attendance, setAttendance] = useState(7);
    const [discipline, setDiscipline] = useState(7);
    const [adjustedScores, setAdjustedScores] = useState({});
    const [useAdjusted, setUseAdjusted] = useState(false);
    const [finalRemarks, setFinalRemarks] = useState("");
    const [errors, setErrors] = useState({});

    // Initialize adjusted scores from reviewer evaluation
    useEffect(() => {
        if (reviewerEvaluation?.scores) {
            setAdjustedScores(reviewerEvaluation.scores);
            // Set initial final score to reviewer's average
            if (reviewerEvaluation.averageScore) {
                setFinalScore(Math.round(reviewerEvaluation.averageScore * 2) / 2); // Round to 0.5
            }
        }
    }, [reviewerEvaluation]);

    const handleAdjustedScoreChange = (key, value) => {
        setAdjustedScores((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const calculateAdjustedAverage = () => {
        const total = REVIEWER_SCORE_FIELDS.reduce((sum, f) => sum + (adjustedScores[f.key] || 0), 0);
        return (total / REVIEWER_SCORE_FIELDS.length).toFixed(1);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Calculate final score as average of (reviewer avg + attendance + discipline)
        const reviewerAvg = useAdjusted
            ? parseFloat(calculateAdjustedAverage())
            : (reviewerEvaluation?.averageScore || 0);
        const calculatedFinalScore = parseFloat(((reviewerAvg + attendance + discipline) / 3).toFixed(1));

        onSubmit({
            finalScore: calculatedFinalScore,
            attendance,
            discipline,
            adjustedScores: useAdjusted ? adjustedScores : null,
            finalRemarks: finalRemarks.trim(),
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-600 to-teal-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                Review Evaluation & Submit Final Score
                            </h2>
                            <p className="text-teal-100 text-sm mt-1">
                                Student: {review?.student?.name || "Unknown"} •
                                Reviewer: {review?.reviewer?.name || "Unknown"}
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
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Reviewer's Evaluation Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Reviewer's Evaluation
                        </h3>

                        {reviewerEvaluation ? (
                            <div className="bg-slate-50 rounded-xl p-5">
                                {/* Scores Grid (4 task-wise scores only) */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                    {REVIEWER_SCORE_FIELDS.map(({ key, label }) => (
                                        <div key={key} className="bg-white p-3 rounded-lg border border-slate-200">
                                            <div className="text-xs text-slate-500 mb-1">{label}</div>
                                            <div className="text-xl font-bold text-slate-900">
                                                {reviewerEvaluation.scores?.[key] || 0}/10
                                            </div>
                                        </div>
                                    ))}
                                    <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                                        <div className="text-xs text-teal-600 mb-1">Average Score</div>
                                        <div className="text-xl font-bold text-teal-700">
                                            {reviewerEvaluation.averageScore || 0}/10
                                        </div>
                                    </div>
                                </div>

                                {/* Feedback */}
                                <div className="mb-3">
                                    <div className="text-sm font-medium text-slate-700 mb-1">Feedback</div>
                                    <div className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                                        {reviewerEvaluation.feedback || "No feedback provided"}
                                    </div>
                                </div>

                                {/* Remarks */}
                                {reviewerEvaluation.remarks && (
                                    <div>
                                        <div className="text-sm font-medium text-slate-700 mb-1">Remarks</div>
                                        <div className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                                            {reviewerEvaluation.remarks}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-yellow-50 text-yellow-700 p-4 rounded-xl">
                                <p>Reviewer evaluation not available yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Adjust Scores Option */}
                    <div className="mb-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useAdjusted}
                                onChange={(e) => setUseAdjusted(e.target.checked)}
                                className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                            />
                            <span className="text-sm font-medium text-slate-700">
                                Adjust task scores (optional)
                            </span>
                        </label>

                        {useAdjusted && (
                            <div className="mt-4 bg-slate-50 p-4 rounded-xl">
                                <div className="space-y-3">
                                    {REVIEWER_SCORE_FIELDS.map(({ key, label }) => (
                                        <ScoreSlider
                                            key={key}
                                            label={label}
                                            value={adjustedScores[key] || 0}
                                            onChange={(val) => handleAdjustedScoreChange(key, val)}
                                            min={SCORE_CONFIG.min}
                                            max={SCORE_CONFIG.max}
                                            step={SCORE_CONFIG.step}
                                            compact
                                        />
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600">Adjusted Average</span>
                                        <span className="text-lg font-bold text-teal-600">
                                            {calculateAdjustedAverage()}/10
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Advisor Evaluation Section (Attendance & Discipline) */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            Advisor Evaluation
                            <span className="text-xs text-slate-400 font-normal">(0.5 increments)</span>
                        </h3>

                        <div className="space-y-4">
                            <ScoreSlider
                                label="Attendance"
                                value={attendance}
                                onChange={setAttendance}
                                min={SCORE_CONFIG.min}
                                max={SCORE_CONFIG.max}
                                step={SCORE_CONFIG.step}
                            />
                            <ScoreSlider
                                label="Discipline"
                                value={discipline}
                                onChange={setDiscipline}
                                min={SCORE_CONFIG.min}
                                max={SCORE_CONFIG.max}
                                step={SCORE_CONFIG.step}
                            />
                        </div>
                    </div>

                    {/* Final Score Section - Auto-Calculated Average */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            Final Score
                            <span className="text-xs font-normal text-slate-400">(Auto-calculated average)</span>
                        </h3>

                        <div className="bg-teal-50 p-5 rounded-xl border border-teal-100">
                            {/* Calculate the average: (reviewer avg + attendance + discipline) / 3 */}
                            {(() => {
                                const reviewerAvg = useAdjusted
                                    ? parseFloat(calculateAdjustedAverage())
                                    : (reviewerEvaluation?.averageScore || 0);
                                const calculatedFinal = ((reviewerAvg + attendance + discipline) / 3).toFixed(1);

                                // Update finalScore state via effect instead of directly here
                                return (
                                    <div className="text-center">
                                        <div className="text-sm text-teal-600 mb-2">
                                            Average of: Reviewer Score ({reviewerAvg.toFixed ? reviewerAvg.toFixed(1) : reviewerAvg}) + Attendance ({attendance}) + Discipline ({discipline})
                                        </div>
                                        <div className={`text-5xl font-bold ${calculatedFinal >= 8 ? "text-green-600" :
                                            calculatedFinal >= 6 ? "text-yellow-600" :
                                                "text-red-600"
                                            }`}>
                                            {calculatedFinal}
                                            <span className="text-2xl text-slate-500">/10</span>
                                        </div>
                                        <div className={`mt-2 text-sm font-medium ${calculatedFinal >= 8 ? "text-green-600" :
                                            calculatedFinal >= 6 ? "text-yellow-600" :
                                                "text-red-600"
                                            }`}>
                                            {calculatedFinal >= 8 ? "Excellent" :
                                                calculatedFinal >= 6 ? "Average" : "Needs Improvement"}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Final Remarks */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Final Remarks
                            <span className="text-xs font-normal text-slate-400">(Optional)</span>
                        </h3>
                        <textarea
                            value={finalRemarks}
                            onChange={(e) => setFinalRemarks(e.target.value)}
                            placeholder="Add any final remarks or observations for the student..."
                            className="w-full h-24 px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        />
                    </div>
                </div>

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
                        disabled={loading || !reviewerEvaluation}
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
                                Submit Final Score
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FinalScoringModal;
