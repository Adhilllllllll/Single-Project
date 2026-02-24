import React, { useState, useEffect } from "react";
import { createUser, fetchAdvisors } from "../features/admin/adminApi";

const CreateUserModal = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        role: "reviewer",
        domain: "",
        advisorId: "",
    });
    const [advisors, setAdvisors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Fetch advisors when modal opens and role is student
    useEffect(() => {
        if (isOpen && formData.role === "student") {
            loadAdvisors();
        }
    }, [isOpen, formData.role]);

    const loadAdvisors = async () => {
        try {
            const response = await fetchAdvisors();
            setAdvisors(response.data || []);
        } catch (err) {
            console.error("Failed to fetch advisors:", err);
            setAdvisors([]);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Clear error when user starts typing
        if (error) setError("");
        if (success) setSuccess("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
            };

            // Add domain if provided
            if (formData.domain.trim()) {
                payload.domain = formData.domain.trim();
            }

            // Add advisorId for students
            if (formData.role === "student") {
                if (!formData.advisorId) {
                    setError("Please select an advisor for the student");
                    setLoading(false);
                    return;
                }
                payload.advisorId = formData.advisorId;
            }

            const response = await createUser(payload);
            setSuccess(response.data.message || "User created successfully!");

            // Reset form
            setFormData({
                name: "",
                email: "",
                role: "reviewer",
                domain: "",
                advisorId: "",
            });

            // Notify parent component
            if (onSuccess) {
                setTimeout(() => {
                    onSuccess(response.data);
                    onClose();
                }, 1500);
            }
        } catch (err) {
            const message =
                err.response?.data?.message || "Failed to create user. Please try again.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: "",
            email: "",
            role: "reviewer",
            domain: "",
            advisorId: "",
        });
        setError("");
        setSuccess("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop - Nice gradient instead of black */}
            <div
                className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/70 to-slate-900/80 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all border border-slate-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900">
                            Add New User
                        </h3>
                        <button
                            onClick={handleClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                                {success}
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                                placeholder="Enter full name"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                                placeholder="Enter email address"
                            />
                        </div>

                        {/* Role */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Role <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                            >
                                <option value="reviewer">Reviewer</option>
                                <option value="advisor">Advisor</option>
                                <option value="student">Student</option>
                            </select>
                        </div>

                        {/* Domain (optional) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Domain <span className="text-slate-400">(optional)</span>
                            </label>
                            <input
                                type="text"
                                name="domain"
                                value={formData.domain}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                                placeholder="e.g., Full Stack, Backend, Python"
                            />
                        </div>

                        {/* Advisor Selection (only for students) */}
                        {formData.role === "student" && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Assign Advisor <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="advisorId"
                                    value={formData.advisorId}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                                >
                                    <option value="">Select an advisor</option>
                                    {advisors.map((advisor) => (
                                        <option key={advisor._id} value={advisor._id}>
                                            {advisor.name} ({advisor.email})
                                        </option>
                                    ))}
                                </select>
                                {advisors.length === 0 && (
                                    <p className="mt-1 text-xs text-amber-600">
                                        No advisors available. Please create an advisor first.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Info box */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                            <strong>Note:</strong> A temporary password will be generated and
                            sent to the user's email. They will be required to change it on
                            first login.
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Creating..." : "Create User"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateUserModal;
