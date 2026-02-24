import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../../api/axios";

const Settings = () => {
    // Profile state
    const { user } = useSelector((state) => state.auth);
    const [profile, setProfile] = useState({
        firstName: "",
        lastName: "",
        email: "",
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState("");

    // Notification preferences state
    const [notifications, setNotifications] = useState({
        emailNotifications: true,
        newUserRegistrations: true,
        mentorApplications: true,
        paymentAlerts: true,
    });
    const [notifLoading, setNotifLoading] = useState(false);

    // Security state
    const [security, setSecurity] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [securityLoading, setSecurityLoading] = useState(false);
    const [securityError, setSecurityError] = useState("");
    const [securitySuccess, setSecuritySuccess] = useState("");

    // Platform status (mock data - would come from backend health check)
    const [platformStatus] = useState({
        serverStatus: "Online",
        database: "Connected",
        apiStatus: "Operational",
        lastBackup: "Today, 3:00 AM",
    });

    // Quick actions loading states
    const [actionLoading, setActionLoading] = useState("");

    // Load profile on mount
    useEffect(() => {
        if (user) {
            const nameParts = user.name?.split(" ") || ["", ""];
            setProfile({
                firstName: nameParts[0] || "",
                lastName: nameParts.slice(1).join(" ") || "",
                email: user.email || "",
            });
        }
    }, [user]);

    // Handle profile update
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileSuccess("");
        try {
            // This would call a profile update API
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulated delay
            setProfileSuccess("Profile updated successfully");
        } catch (err) {
            console.error("Profile update failed:", err);
        } finally {
            setProfileLoading(false);
        }
    };

    // Handle notification toggle
    const handleNotificationToggle = (key) => {
        setNotifications(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
        // Auto-save notification preferences
        // In production, this would call an API
    };

    // Handle password update
    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setSecurityError("");
        setSecuritySuccess("");

        if (security.newPassword.length < 8) {
            setSecurityError("Password must be at least 8 characters");
            return;
        }

        if (security.newPassword !== security.confirmPassword) {
            setSecurityError("Passwords do not match");
            return;
        }

        setSecurityLoading(true);
        try {
            await api.post("/auth/change-password", {
                currentPassword: security.currentPassword,
                newPassword: security.newPassword,
            });
            setSecuritySuccess("Password updated successfully");
            setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            setSecurityError(err.response?.data?.message || "Failed to update password");
        } finally {
            setSecurityLoading(false);
        }
    };

    // Quick action handlers
    const handleQuickAction = async (action) => {
        setActionLoading(action);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated action
            alert(`${action} completed successfully`);
        } catch (err) {
            console.error(`${action} failed:`, err);
        } finally {
            setActionLoading("");
        }
    };

    // Toggle Switch Component
    const Toggle = ({ enabled, onChange }) => (
        <button
            type="button"
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-blue-600" : "bg-gray-300"
                }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"
                    }`}
            />
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your account and system preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Left Side */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Profile Settings */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <h2 className="text-lg font-semibold text-slate-900">Profile Settings</h2>
                        </div>

                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={profile.firstName}
                                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50"
                                        placeholder="Admin"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={profile.lastName}
                                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50"
                                        placeholder="User"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={profile.email}
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50"
                                    placeholder="admin@devmentor.com"
                                />
                            </div>
                            {profileSuccess && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                                    {profileSuccess}
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={profileLoading}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {profileLoading ? "Updating..." : "Update Profile"}
                            </button>
                        </form>
                    </div>

                    {/* Notification Preferences */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <h2 className="text-lg font-semibold text-slate-900">Notification Preferences</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <div>
                                    <div className="font-medium text-slate-900 text-sm">Email Notifications</div>
                                    <div className="text-xs text-slate-500">Receive email updates about platform activity</div>
                                </div>
                                <Toggle
                                    enabled={notifications.emailNotifications}
                                    onChange={() => handleNotificationToggle("emailNotifications")}
                                />
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <div>
                                    <div className="font-medium text-slate-900 text-sm">New User Registrations</div>
                                    <div className="text-xs text-slate-500">Get notified when new users join</div>
                                </div>
                                <Toggle
                                    enabled={notifications.newUserRegistrations}
                                    onChange={() => handleNotificationToggle("newUserRegistrations")}
                                />
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <div>
                                    <div className="font-medium text-slate-900 text-sm">Mentor Applications</div>
                                    <div className="text-xs text-slate-500">Alert when mentors apply for approval</div>
                                </div>
                                <Toggle
                                    enabled={notifications.mentorApplications}
                                    onChange={() => handleNotificationToggle("mentorApplications")}
                                />
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <div className="font-medium text-slate-900 text-sm">Payment Alerts</div>
                                    <div className="text-xs text-slate-500">Notifications for payment activities</div>
                                </div>
                                <Toggle
                                    enabled={notifications.paymentAlerts}
                                    onChange={() => handleNotificationToggle("paymentAlerts")}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Security Settings */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <h2 className="text-lg font-semibold text-slate-900">Security Settings</h2>
                        </div>

                        <form onSubmit={handlePasswordUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    value={security.currentPassword}
                                    onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={security.newPassword}
                                    onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={security.confirmPassword}
                                    onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                            {securityError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {securityError}
                                </div>
                            )}
                            {securitySuccess && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                                    {securitySuccess}
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={securityLoading}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {securityLoading ? "Updating..." : "Update Password"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Sidebar - Right Side */}
                <div className="space-y-6">
                    {/* Platform Status */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <h3 className="font-semibold text-slate-900">Platform Status</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Server Status</span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    <span className="text-green-600 font-medium">{platformStatus.serverStatus}</span>
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Database</span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    <span className="text-green-600 font-medium">{platformStatus.database}</span>
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">API Status</span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    <span className="text-green-600 font-medium">{platformStatus.apiStatus}</span>
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
                                <span className="text-slate-600">Last Backup</span>
                                <span className="text-slate-900">{platformStatus.lastBackup}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <h3 className="font-semibold text-slate-900">Quick Actions</h3>
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleQuickAction("Clear Cache")}
                                disabled={actionLoading === "Clear Cache"}
                                className="w-full px-4 py-2.5 text-sm text-left text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading === "Clear Cache" ? "Clearing..." : "Clear Cache"}
                            </button>
                            <button
                                onClick={() => handleQuickAction("Export Data")}
                                disabled={actionLoading === "Export Data"}
                                className="w-full px-4 py-2.5 text-sm text-left text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading === "Export Data" ? "Exporting..." : "Export Data"}
                            </button>
                            <button
                                onClick={() => handleQuickAction("System Backup")}
                                disabled={actionLoading === "System Backup"}
                                className="w-full px-4 py-2.5 text-sm text-left text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading === "System Backup" ? "Backing up..." : "System Backup"}
                            </button>
                            <button
                                onClick={() => handleQuickAction("Maintenance Mode")}
                                disabled={actionLoading === "Maintenance Mode"}
                                className="w-full px-4 py-2.5 text-sm text-left text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading === "Maintenance Mode" ? "Enabling..." : "Maintenance Mode"}
                            </button>
                        </div>
                    </div>

                    {/* Need Help */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-sm p-6 text-white">
                        <h3 className="font-semibold mb-2">Need Help?</h3>
                        <p className="text-sm text-blue-100 mb-4">
                            Contact our support team for assistance with your dashboard.
                        </p>
                        <button className="w-full px-4 py-2.5 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                            Contact Support
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
