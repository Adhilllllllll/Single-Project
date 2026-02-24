import React from "react";

/**
 * ScoreSlider - Reusable dynamic scoring component
 * Supports 0.5 step increments with dropdown or slider interface
 * 
 * @param {string} label - Label for the score field
 * @param {number} value - Current score value
 * @param {function} onChange - Callback when value changes
 * @param {number} min - Minimum value (default 0)
 * @param {number} max - Maximum value (default 10)
 * @param {number} step - Step increment (default 0.5)
 * @param {boolean} disabled - Whether input is disabled
 * @param {string} error - Error message to display
 * @param {boolean} compact - Use compact layout
 */
const ScoreSlider = ({
    label,
    value = 5,
    onChange,
    min = 0,
    max = 10,
    step = 0.5,
    disabled = false,
    error = null,
    compact = false,
}) => {
    // Generate options for dropdown (0, 0.5, 1, 1.5, ... 10)
    const generateOptions = () => {
        const options = [];
        for (let i = min; i <= max; i += step) {
            options.push(i);
        }
        return options;
    };

    const options = generateOptions();

    // Handle value change
    const handleChange = (newValue) => {
        if (disabled) return;
        const numValue = parseFloat(newValue);
        if (!isNaN(numValue) && numValue >= min && numValue <= max) {
            onChange(numValue);
        }
    };

    // Get color based on score
    const getScoreColor = () => {
        if (value >= 8) return "text-green-600";
        if (value >= 6) return "text-teal-600";
        if (value >= 4) return "text-amber-600";
        return "text-red-600";
    };

    // Calculate percentage for slider visual
    const percentage = ((value - min) / (max - min)) * 100;

    if (compact) {
        return (
            <div className="flex items-center gap-4">
                <label className="text-sm text-slate-600 w-48 flex-shrink-0">{label}</label>
                <select
                    value={value}
                    onChange={(e) => handleChange(e.target.value)}
                    disabled={disabled}
                    className={`flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white border-slate-200"
                        } ${error ? "border-red-300" : ""}`}
                >
                    {options.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
                <span className={`text-sm font-bold w-12 text-right ${getScoreColor()}`}>
                    {value}/{max}
                </span>
                {error && <span className="text-red-500 text-xs">{error}</span>}
            </div>
        );
    }

    return (
        <div className={`bg-slate-50 p-4 rounded-xl ${error ? "ring-1 ring-red-300" : ""}`}>
            <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-700">{label}</label>
                <div className="flex items-center gap-2">
                    {/* Dropdown for precise selection */}
                    <select
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        disabled={disabled}
                        className={`px-3 py-1 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${disabled ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-white border-slate-200"
                            } ${getScoreColor()}`}
                    >
                        {options.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                    <span className={`text-lg font-bold ${getScoreColor()}`}>
                        /{max}
                    </span>
                </div>
            </div>

            {/* Visual slider bar */}
            <div className="relative">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-200"
                        style={{ width: `${percentage}%` }}
                    />
                </div>

                {/* Slider input */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => handleChange(e.target.value)}
                    disabled={disabled}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
            </div>

            {/* Scale markers */}
            <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                <span>{min}</span>
                <span>{max / 4}</span>
                <span>{max / 2}</span>
                <span>{(max * 3) / 4}</span>
                <span>{max}</span>
            </div>

            {error && (
                <p className="text-red-500 text-xs mt-2">{error}</p>
            )}
        </div>
    );
};

/**
 * Score configuration constants
 * Use these for consistent scoring across the application
 */
export const SCORE_CONFIG = {
    min: 0,
    max: 10,
    step: 0.5,
    default: 5,
};

/**
 * Reviewer evaluation score fields (task-focused, no overall)
 */
export const REVIEWER_SCORE_FIELDS = [
    { key: "technicalUnderstanding", label: "Technical Understanding" },
    { key: "taskCompletion", label: "Task Completion" },
    { key: "communication", label: "Communication Skills" },
    { key: "problemSolving", label: "Problem Solving" },
];

/**
 * Advisor evaluation score fields (includes attendance & discipline)
 */
export const ADVISOR_SCORE_FIELDS = [
    { key: "attendance", label: "Attendance" },
    { key: "discipline", label: "Discipline" },
];

/**
 * Helper to validate a score value
 */
export const validateScore = (value, min = 0, max = 10, step = 0.5) => {
    if (typeof value !== "number") return false;
    if (value < min || value > max) return false;
    // Check if value is a valid step increment
    const remainder = ((value - min) * 10) % (step * 10);
    return remainder === 0;
};

/**
 * Helper to calculate average from scores object
 */
export const calculateAverageScore = (scores, fields) => {
    const values = fields.map((f) => scores[f.key] || 0);
    const sum = values.reduce((a, b) => a + b, 0);
    return fields.length > 0 ? parseFloat((sum / fields.length).toFixed(2)) : 0;
};

export default ScoreSlider;
