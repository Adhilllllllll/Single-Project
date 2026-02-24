import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { updateUser } from "../../features/auth/authSlice";
import {
    getStudentProfile,
    changeStudentPassword,
    uploadStudentAvatar,
    getStudentProgressSummary,
    getStudentDocuments,
    uploadStudentDocument,
} from "../../features/student/studentApi";
import {
    ProfileAvatar,
    ReadOnlyField,
    StatsCard,
    PasswordInput,
    FileUploadBox,
} from "../../components/profile/ProfileComponents";

/* ============================================
   SKELETON LOADERS
============================================ */
const ProfileSkeleton = () => (
    <div className="animate-pulse space-y-6">
        <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-200"></div>
            <div>
                <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-20"></div>
            </div>
        </div>
        <div className="h-10 bg-slate-200 rounded w-full"></div>
        <div className="h-10 bg-slate-200 rounded w-full"></div>
    </div>
);

/* ============================================
   MAIN PROFILE COMPONENT
============================================ */
const Profile = () => {
    const dispatch = useDispatch();
    // State
    const [profile, setProfile] = useState(null);
    const [progressSummary, setProgressSummary] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Password form state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Avatar state
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const avatarInputRef = useRef(null);

    // Document upload state
    const [documentUploading, setDocumentUploading] = useState(false);

    // Fetch data on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [profileRes, progressRes, docsRes] = await Promise.all([
                    getStudentProfile(),
                    getStudentProgressSummary(),
                    getStudentDocuments(),
                ]);
                setProfile(profileRes.data.profile);
                setProgressSummary(progressRes.data.summary);
                setDocuments(docsRes.data.documents || []);
            } catch (err) {
                setError(err?.response?.data?.message || "Failed to load profile");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Handle password change
    const handlePasswordChange = useCallback((e) => {
        const { name, value } = e.target;
        setPasswordForm((prev) => ({ ...prev, [name]: value }));
        setPasswordError("");
        setPasswordSuccess("");
    }, []);

    const handlePasswordSubmit = useCallback(async (e) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess("");

        // Validation
        if (passwordForm.newPassword.length < 8) {
            setPasswordError("Password must be at least 8 characters");
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError("New passwords do not match");
            return;
        }

        try {
            setPasswordLoading(true);
            await changeStudentPassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
                confirmPassword: passwordForm.confirmPassword,
            });
            setPasswordSuccess("Password updated successfully");
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            setPasswordError(err?.response?.data?.message || "Failed to update password");
        } finally {
            setPasswordLoading(false);
        }
    }, [passwordForm]);

    // Handle avatar change
    const handleAvatarClick = useCallback(() => {
        avatarInputRef.current?.click();
    }, []);

    const handleAvatarChange = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onload = (e) => setAvatarPreview(e.target.result);
        reader.readAsDataURL(file);

        // Upload
        const formData = new FormData();
        formData.append("avatar", file);

        try {
            setAvatarUploading(true);
            const res = await uploadStudentAvatar(formData);
            const newAvatarUrl = res.data.avatar;
            setProfile((prev) => ({ ...prev, avatar: newAvatarUrl }));

            // Sync to Redux for global access (Layout header, etc.)
            dispatch(updateUser({ avatar: newAvatarUrl }));
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to upload avatar");
        } finally {
            setAvatarUploading(false);
            setAvatarPreview(null);
        }
    }, [dispatch]);

    // Handle document upload
    const handleDocumentUpload = useCallback(async (file) => {
        const formData = new FormData();
        formData.append("document", file);

        try {
            setDocumentUploading(true);
            const res = await uploadStudentDocument(formData);
            setDocuments((prev) => [...prev, res.data.document]);
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to upload document");
        } finally {
            setDocumentUploading(false);
        }
    }, []);

    // Email icon
    const emailIcon = useMemo(() => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    ), []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-slate-200 rounded w-32 animate-pulse"></div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <ProfileSkeleton />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
                <p className="text-slate-500">Manage your profile and account settings</p>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Profile Picture Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Profile Picture</h3>
                <div className="flex items-center gap-6">
                    <ProfileAvatar
                        name={profile?.name}
                        avatar={avatarPreview || profile?.avatar}
                        size="xl"
                    />
                    <div>
                        <p className="text-slate-600 mb-2">Upload a new profile picture</p>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                        />
                        <button
                            onClick={handleAvatarClick}
                            disabled={avatarUploading}
                            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            {avatarUploading ? "Uploading..." : "Change Picture"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Basic Information Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-6">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ReadOnlyField
                        label="Full Name"
                        value={profile?.name}
                        helper="Name is managed by Admin"
                    />
                    <ReadOnlyField
                        label="Email Address"
                        value={profile?.email}
                        helper="Email cannot be changed"
                        icon={emailIcon}
                    />
                    <ReadOnlyField
                        label="Domain"
                        value={profile?.domain || profile?.course || "Not assigned"}
                        helper="Domain is assigned by Admin"
                    />
                </div>
            </div>

            {/* Change Password Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-6">Change Password</h3>
                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                    <PasswordInput
                        label="Current Password"
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter current password"
                    />
                    <PasswordInput
                        label="New Password"
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter new password"
                        helper="Password must be at least 8 characters"
                    />
                    <PasswordInput
                        label="Confirm New Password"
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirm new password"
                    />

                    {passwordError && (
                        <p className="text-sm text-red-600">{passwordError}</p>
                    )}
                    {passwordSuccess && (
                        <p className="text-sm text-green-600">{passwordSuccess}</p>
                    )}

                    <button
                        type="submit"
                        disabled={passwordLoading}
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                        {passwordLoading ? "Updating..." : "Update Password"}
                    </button>
                </form>
            </div>

            {/* Academic Progress Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-6">Academic Progress</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatsCard
                        title="Total Reviews"
                        value={progressSummary?.totalReviews ?? 0}
                        color="blue"
                    />
                    <StatsCard
                        title="Overall Progress"
                        value={`${progressSummary?.overallProgress ?? 0}%`}
                        color="green"
                    />
                    <StatsCard
                        title="Average Score"
                        value={progressSummary?.avgScore ?? 0}
                        color="orange"
                    />
                </div>
            </div>

            {/* Upload Documents Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-2">Upload Documents</h3>
                <p className="text-sm text-slate-500 mb-6">Upload resume, reports, or other relevant documents</p>
                <FileUploadBox
                    onFileDrop={handleDocumentUpload}
                    uploading={documentUploading}
                />

                {/* Uploaded Documents List */}
                {documents.length > 0 && (
                    <div className="mt-6 space-y-3">
                        <h4 className="text-sm font-medium text-slate-700">Uploaded Documents</h4>
                        {documents.map((doc, index) => (
                            <div
                                key={doc._id || index}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{doc.filename}</p>
                                        <p className="text-xs text-slate-500">
                                            {doc.size ? `${(doc.size / 1024 / 1024).toFixed(2)} MB` : ""}
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={doc.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                                >
                                    View
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
