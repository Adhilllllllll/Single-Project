import React, { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { updateUser } from "../../features/auth/authSlice";
import api from "../../api/axios";
import { getAvatarUrl } from "../../utils/getAvatarUrl";
import {
    getMyReviewerProfile,
    updateMyReviewerProfile,
    getPerformanceAnalytics,
} from "../../features/reviewer/reviewerApi";

const Profile = () => {
    const dispatch = useDispatch();
    const fileInputRef = useRef(null);

    // Profile state
    const [profile, setProfile] = useState({
        name: "",
        email: "",
        domain: "",
        phone: "",
        about: "",
        avatar: "",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");

    // Password state
    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [passwordError, setPasswordError] = useState("");

    // Review statistics
    const [stats, setStats] = useState({
        totalReviews: 0,
        reviewsThisMonth: 0,
        avgRating: 0,
    });

    // Fetch profile and stats on mount
    useEffect(() => {
        fetchProfile();
        fetchStats();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await getMyReviewerProfile();
            const reviewer = res.data.reviewer;
            setProfile({
                name: reviewer.name || "",
                email: reviewer.email || "",
                domain: reviewer.domain || "",
                phone: reviewer.phone || "",
                about: reviewer.about || "",
                avatar: reviewer.avatar || "",
            });
            if (reviewer.avatar) {
                setAvatarPreview(getAvatarUrl(reviewer.avatar));
            }
        } catch (err) {
            setErrorMsg("Failed to load profile");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await getPerformanceAnalytics();
            setStats({
                totalReviews: res.data.totalReviews || 0,
                reviewsThisMonth: res.data.reviewsThisMonth || 0,
                avgRating: res.data.avgRating || 0,
            });
        } catch (err) {
            console.error("Failed to fetch stats:", err);
        }
    };

    // Clear messages
    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(() => setSuccessMsg(""), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    useEffect(() => {
        if (passwordSuccess) {
            const timer = setTimeout(() => setPasswordSuccess(""), 3000);
            return () => clearTimeout(timer);
        }
    }, [passwordSuccess]);

    // Handle profile field change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile((prev) => ({ ...prev, [name]: value }));
    };

    // Handle avatar change
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setErrorMsg("Image size must be less than 2MB");
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    // Save profile
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        if (!profile.name.trim()) {
            setErrorMsg("Name is required");
            return;
        }

        try {
            setSaving(true);
            const formData = new FormData();
            formData.append("name", profile.name);
            formData.append("phone", profile.phone);
            formData.append("about", profile.about);
            formData.append("domain", profile.domain);
            if (avatarFile) {
                formData.append("avatar", avatarFile);
            }

            const res = await updateMyReviewerProfile(formData);

            // Update avatar preview with permanent URL from backend
            if (res.data.reviewer?.avatar) {
                if (avatarPreview && avatarPreview.startsWith("blob:")) {
                    URL.revokeObjectURL(avatarPreview);
                }
                // Set permanent URL from backend
                setAvatarPreview(getAvatarUrl(res.data.reviewer.avatar));
                setProfile((prev) => ({ ...prev, avatar: res.data.reviewer.avatar }));
            }

            setSuccessMsg("Profile updated successfully!");
            setAvatarFile(null);

            // Update Redux state so header name updates dynamically
            dispatch(updateUser({ name: profile.name }));
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    // Handle password field change
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswords((prev) => ({ ...prev, [name]: value }));
    };

    // Change password
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError("");

        if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
            setPasswordError("All fields are required");
            return;
        }

        if (passwords.newPassword.length < 8) {
            setPasswordError("Password must be at least 8 characters");
            return;
        }

        if (passwords.newPassword !== passwords.confirmPassword) {
            setPasswordError("Passwords do not match");
            return;
        }

        try {
            setPasswordSaving(true);
            await api.post("/auth/change-password", {
                email: profile.email,
                oldPassword: passwords.currentPassword,
                newPassword: passwords.newPassword,
            });

            setPasswordSuccess("Password changed successfully!");
            setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            setPasswordError(err.response?.data?.message || "Failed to change password");
        } finally {
            setPasswordSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Profile</h2>
                <p className="text-slate-500">Manage your profile and preferences</p>
            </div>

            {/* Profile Picture Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Profile Picture</h3>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-purple-600 text-white flex items-center justify-center text-2xl font-bold overflow-hidden">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                profile.name?.split(" ").map((n) => n.charAt(0)).join("").toUpperCase().slice(0, 2) || "R"
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-1 -right-1 bg-purple-600 text-white p-1.5 rounded-full shadow hover:bg-purple-700 transition-colors"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>
                    <div>
                        <p className="text-sm text-slate-600">Upload a new profile picture</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-1 px-4 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                            Change Picture
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif"
                            onChange={handleAvatarChange}
                            className="hidden"
                        />
                    </div>
                </div>
            </div>

            {/* Basic Information */}
            <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Basic Information</h3>

                {/* Success/Error Messages */}
                {successMsg && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
                        {successMsg}
                    </div>
                )}
                {errorMsg && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                        {errorMsg}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={profile.name}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Email (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </span>
                            <input
                                type="email"
                                value={profile.email}
                                readOnly
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                    </div>

                    {/* Domain */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Domain</label>
                        <input
                            type="text"
                            name="domain"
                            value={profile.domain}
                            onChange={handleChange}
                            placeholder="e.g., Full Stack Development"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                        <input
                            type="tel"
                            name="phone"
                            value={profile.phone}
                            onChange={handleChange}
                            placeholder="+1 (555) 123-4567"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                        <textarea
                            name="about"
                            value={profile.about}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Experienced Python developer and technical reviewer..."
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        />
                    </div>

                    {/* Save Button */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        Save Changes
                    </button>
                </div>
            </form>

            {/* Change Password */}
            <form onSubmit={handleChangePassword} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Change Password</h3>

                {/* Success/Error Messages */}
                {passwordSuccess && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
                        {passwordSuccess}
                    </div>
                )}
                {passwordError && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                        {passwordError}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Current Password */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                        <div className="relative">
                            <input
                                type={showPasswords.current ? "text" : "password"}
                                name="currentPassword"
                                value={passwords.currentPassword}
                                onChange={handlePasswordChange}
                                placeholder="Enter current password"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {showPasswords.current ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                        <div className="relative">
                            <input
                                type={showPasswords.new ? "text" : "password"}
                                name="newPassword"
                                value={passwords.newPassword}
                                onChange={handlePasswordChange}
                                placeholder="Enter new password"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {showPasswords.new ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    )}
                                </svg>
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Password must be at least 8 characters</p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                        <div className="relative">
                            <input
                                type={showPasswords.confirm ? "text" : "password"}
                                name="confirmPassword"
                                value={passwords.confirmPassword}
                                onChange={handlePasswordChange}
                                placeholder="Confirm new password"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {showPasswords.confirm ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Update Password Button */}
                    <button
                        type="submit"
                        disabled={passwordSaving}
                        className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {passwordSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        Update Password
                    </button>
                </div>
            </form>

            {/* Review Statistics */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Review Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase font-medium">Total Reviews</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalReviews}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase font-medium">This Month</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.reviewsThisMonth}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase font-medium">Average Rating</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.avgRating.toFixed(1)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
