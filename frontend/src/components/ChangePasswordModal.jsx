import React, { useState } from "react";
import api from "../api/axios";

const ChangePasswordModal = ({ isOpen, onClose, userEmail, onSuccess }) => {
    const [formData, setFormData] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        if (error) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Validate passwords match
        if (formData.newPassword !== formData.confirmPassword) {
            setError("New passwords do not match");
            setLoading(false);
            return;
        }

        // Validate password length
        if (formData.newPassword.length < 8) {
            setError("Password must be at least 8 characters long");
            setLoading(false);
            return;
        }

        try {
            await api.post("/auth/change-password", {
                email: userEmail,
                oldPassword: formData.oldPassword,
                newPassword: formData.newPassword,
            });

            // Clear form and notify success
            setFormData({
                oldPassword: "",
                newPassword: "",
                confirmPassword: "",
            });

            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            const message =
                err.response?.data?.message || "Failed to change password. Please try again.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop - Nice gradient */}
            <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/70 to-slate-900/80 backdrop-blur-sm" />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all border border-slate-200">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <svg
                                    className="w-6 h-6 text-amber-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                    Change Your Password
                                </h3>
                                <p className="text-sm text-slate-500">
                                    You must change your temporary password before continuing
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Current Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Current Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                name="oldPassword"
                                value={formData.oldPassword}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Enter your temporary password"
                            />
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                New Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                required
                                minLength={8}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Enter new password (min 8 characters)"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Confirm New Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                minLength={8}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Confirm your new password"
                            />
                        </div>

                        {/* Password requirements */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                            <p className="font-medium mb-1">Password Requirements:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                                <li>At least 8 characters long</li>
                                <li>Must match confirmation</li>
                            </ul>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-sm font-semibold text-white hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Updating Password...
                                </span>
                            ) : (
                                "Update Password"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
