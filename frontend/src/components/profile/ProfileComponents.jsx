import React from "react";
import { getAvatarUrl } from "../../utils/getAvatarUrl";

/* ============================================
   PROFILE AVATAR
   - Shows avatar image or initials fallback
   - Supports different sizes
============================================ */
export const ProfileAvatar = React.memo(({ name, avatar, size = "lg", className = "" }) => {
    const getInitials = (name) => {
        if (!name) return "?";
        const parts = name.trim().split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0].substring(0, 2).toUpperCase();
    };

    const sizeClasses = {
        sm: "w-8 h-8 text-xs",
        md: "w-12 h-12 text-sm",
        lg: "w-16 h-16 text-xl",
        xl: "w-20 h-20 text-2xl",
    };

    // Use shared utility for URL construction
    const avatarUrl = getAvatarUrl(avatar, name);
    const initials = getInitials(name);

    // State to track if image failed to load
    const [imgError, setImgError] = React.useState(false);

    // Check if we have a valid URL (not just a placeholder for display)
    if (avatar && !imgError) {
        return (
            <img
                src={avatarUrl}
                alt={name || "Profile"}
                className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
                onError={() => setImgError(true)}
            />
        );
    }

    return (
        <div
            className={`rounded-full bg-orange-500 text-white flex items-center justify-center font-semibold ${sizeClasses[size]} ${className}`}
        >
            {initials}
        </div>
    );
});

ProfileAvatar.displayName = "ProfileAvatar";

/* ============================================
   READ ONLY FIELD
   - Displays label, value, and helper text
   - Supports optional icon
============================================ */
export const ReadOnlyField = React.memo(({ label, value, helper, icon }) => (
    <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
            {icon && <span className="text-slate-400">{icon}</span>}
            <span className="text-slate-900">{value || "—"}</span>
        </div>
        {helper && <p className="text-xs text-slate-500">{helper}</p>}
    </div>
));

ReadOnlyField.displayName = "ReadOnlyField";

/* ============================================
   STATS CARD
   - Displays a statistic with title and value
   - Supports different accent colors
============================================ */
export const StatsCard = React.memo(({ title, value, color = "blue", icon }) => {
    const colorClasses = {
        blue: "border-l-blue-500",
        green: "border-l-green-500",
        orange: "border-l-orange-500",
        purple: "border-l-purple-500",
    };

    return (
        <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${colorClasses[color]} p-4`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">{title}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
                </div>
                {icon && <div className="text-slate-300">{icon}</div>}
            </div>
        </div>
    );
});

StatsCard.displayName = "StatsCard";

/* ============================================
   PASSWORD INPUT
   - Input with visibility toggle
============================================ */
export const PasswordInput = React.memo(({
    label,
    value,
    onChange,
    placeholder,
    error,
    helper,
    name,
}) => {
    const [visible, setVisible] = React.useState(false);

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <div className="relative">
                <input
                    type={visible ? "text" : "password"}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${error ? "border-red-300" : "border-slate-200"
                        }`}
                />
                <button
                    type="button"
                    onClick={() => setVisible(!visible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                    {visible ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    )}
                </button>
            </div>
            {helper && <p className="text-xs text-slate-500">{helper}</p>}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
});

PasswordInput.displayName = "PasswordInput";

/* ============================================
   FILE UPLOAD BOX
   - Drag and drop file upload area
============================================ */
export const FileUploadBox = React.memo(({
    onFileDrop,
    accept = ".pdf,.doc,.docx,.ppt,.pptx,.zip",
    uploading = false,
    supportedFormats = "PDF, DOC, DOCX, PPT, PPTX, ZIP",
}) => {
    const fileInputRef = React.useRef(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const handleDragOver = React.useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = React.useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = React.useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            onFileDrop(files[0]);
        }
    }, [onFileDrop]);

    const handleClick = React.useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = React.useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            onFileDrop(file);
        }
    }, [onFileDrop]);

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${isDragging
                ? "border-orange-400 bg-orange-50"
                : "border-slate-200 hover:border-slate-300"
                }`}
            onClick={handleClick}
        >
            <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept={accept}
            />
            <svg className="w-10 h-10 mx-auto text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-medium text-slate-700">
                Drag and drop files here or{" "}
                <span className="text-orange-600">browse</span>
            </p>
            <p className="text-sm text-slate-500 mt-1">
                Supported formats: {supportedFormats}
            </p>
            {uploading && (
                <div className="mt-4">
                    <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">Uploading...</p>
                </div>
            )}
        </div>
    );
});

FileUploadBox.displayName = "FileUploadBox";
