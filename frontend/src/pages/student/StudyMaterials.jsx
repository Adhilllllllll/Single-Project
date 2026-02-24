import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    fetchSyllabus,
    fetchChecklist,
    toggleChecklistItemThunk,
    uploadChecklistFile,
    uploadAdditionalDocument,
} from "../../features/student/studentSlice";
import { SYLLABUS_WEEKS } from "../../features/student/mockData";
import { TabSwitcher } from "../../components/common/TableComponents";

/* ============================================
   Tab Configuration
============================================ */
const TABS = [
    { id: "syllabus", label: "Syllabus & Resources" },
    { id: "checklist", label: "Pre-Review Checklist" },
];

/* ============================================
   Resource Type Icons
============================================ */
const ResourceIcon = React.memo(({ type }) => {
    switch (type) {
        case "pdf":
            return (
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h2v2H10v-2zm0 3h4v2h-4v-2zm-2-3h2v2H8v-2z" />
                    </svg>
                </div>
            );
        case "video":
            return (
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </div>
            );
        case "link":
            return (
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                </div>
            );
        default:
            return (
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
            );
    }
});

ResourceIcon.displayName = "ResourceIcon";

/* ============================================
   Resource Item Component
============================================ */
const ResourceItem = React.memo(({ resource, onDownload }) => (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-4">
            <ResourceIcon type={resource.type} />
            <div>
                <div className="font-medium text-slate-900">{resource.title}</div>
                <div className="text-xs text-slate-500">
                    {resource.size || resource.duration || "External link"}
                </div>
            </div>
        </div>
        <button
            onClick={() => onDownload(resource)}
            className="text-slate-400 hover:text-orange-500 transition-colors"
        >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
        </button>
    </div>
));

ResourceItem.displayName = "ResourceItem";

/* ============================================
   Week Accordion Component
============================================ */
const WeekAccordion = React.memo(({ week, isExpanded, onToggle, onDownload }) => (
    <div className="border-b border-slate-100 last:border-0">
        <button
            onClick={onToggle}
            className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
        >
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            </div>
            <div className="flex-1 text-left">
                <div className="font-semibold text-slate-900">Week {week.week}</div>
                <div className="text-sm text-slate-500">{week.title}</div>
            </div>
            <svg
                className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </button>
        {isExpanded && (
            <div className="bg-slate-50 border-t border-slate-100">
                {week.resources.map((resource) => (
                    <ResourceItem key={resource.id} resource={resource} onDownload={onDownload} />
                ))}
            </div>
        )}
    </div>
));

WeekAccordion.displayName = "WeekAccordion";

/* ============================================
   Skeleton Components
============================================ */
const SkeletonChecklist = () => (
    <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 bg-slate-100 rounded-lg">
                <div className="w-6 h-6 bg-slate-200 rounded-full"></div>
                <div className="h-4 bg-slate-200 rounded w-48"></div>
            </div>
        ))}
    </div>
);

/* ============================================
   Checklist Item Component
============================================ */
const ChecklistItem = React.memo(({ item, onToggle, onUpload, uploading }) => {
    const fileInputRef = useRef(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append("attachment", file);
            onUpload(item.id, formData);
        }
    };

    return (
        <div
            className={`flex items-center justify-between p-4 rounded-lg transition-colors ${item.completed ? "bg-green-50" : "bg-white border border-slate-200"
                }`}
        >
            <div className="flex items-center gap-4">
                <button
                    onClick={() => onToggle(item.id)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${item.completed
                            ? "bg-green-500 text-white"
                            : "border-2 border-slate-300 hover:border-orange-400"
                        }`}
                >
                    {item.completed && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </button>
                <span
                    className={`font-medium ${item.completed ? "text-green-700 line-through" : "text-slate-900"
                        }`}
                >
                    {item.title}
                </span>
            </div>
            {item.requiresUpload && !item.completed && (
                <>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.jpg,.jpeg,.png"
                    />
                    <button
                        onClick={handleUploadClick}
                        disabled={uploading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploading
                                ? "bg-orange-300 text-white cursor-wait"
                                : "bg-orange-500 text-white hover:bg-orange-600"
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {uploading ? "Uploading..." : "Upload"}
                    </button>
                </>
            )}
        </div>
    );
});

ChecklistItem.displayName = "ChecklistItem";

/* ============================================
   Progress Bar Component
============================================ */
const ProgressBar = React.memo(({ completed, total }) => {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Completion Progress</span>
                <span className="text-sm text-slate-500">{completed} / {total}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
});

ProgressBar.displayName = "ProgressBar";

/* ============================================
   Upload Dropzone Component
============================================ */
const UploadDropzone = React.memo(({ onFileDrop, uploading }) => {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            onFileDrop(files);
        }
    }, [onFileDrop]);

    const handleClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback((e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            onFileDrop(files);
        }
    }, [onFileDrop]);

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isDragging
                    ? "border-orange-400 bg-orange-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
        >
            <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.jpg,.jpeg,.png"
            />
            <svg className="w-10 h-10 mx-auto text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="font-medium text-slate-700 mb-1">Upload Additional Documents</p>
            <p className="text-sm text-slate-500 mb-4">PDF, PPT, DOC, Images, ZIP, or GitHub link</p>
            <button
                onClick={handleClick}
                disabled={uploading}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${uploading
                        ? "bg-orange-300 text-white cursor-wait"
                        : "bg-orange-500 text-white hover:bg-orange-600"
                    }`}
            >
                {uploading ? "Uploading..." : "Choose Files"}
            </button>
        </div>
    );
});

UploadDropzone.displayName = "UploadDropzone";

/* ============================================
   Main Study Materials Component
============================================ */
const StudyMaterials = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState("syllabus");
    const [expandedWeeks, setExpandedWeeks] = useState([1]); // Week 1 expanded by default

    const {
        syllabus,
        checklist,
        syllabusLoading,
        checklistLoading,
        uploadLoading,
        error,
    } = useSelector((state) => state.student);

    // Fetch data on mount
    useEffect(() => {
        dispatch(fetchSyllabus());
        dispatch(fetchChecklist());
    }, [dispatch]);

    // Use Redux syllabus or fallback to mock data
    const syllabusData = useMemo(() => {
        return syllabus.length > 0 ? syllabus : SYLLABUS_WEEKS;
    }, [syllabus]);

    // Calculate progress
    const progress = useMemo(() => {
        const completed = checklist.filter(item => item.completed).length;
        return { completed, total: checklist.length };
    }, [checklist]);

    // Handlers
    const handleTabChange = useCallback((tabId) => {
        setActiveTab(tabId);
    }, []);

    const handleWeekToggle = useCallback((weekId) => {
        setExpandedWeeks(prev =>
            prev.includes(weekId)
                ? prev.filter(id => id !== weekId)
                : [...prev, weekId]
        );
    }, []);

    const handleDownload = useCallback((resource) => {
        console.log("Download:", resource.title);
        if (resource.url && resource.url !== "#") {
            window.open(resource.url, "_blank");
        }
    }, []);

    const handleChecklistToggle = useCallback((itemId) => {
        dispatch(toggleChecklistItemThunk(itemId));
    }, [dispatch]);

    const handleUpload = useCallback((itemId, formData) => {
        dispatch(uploadChecklistFile({ itemId, formData }));
    }, [dispatch]);

    const handleFileDrop = useCallback((files) => {
        const formData = new FormData();
        formData.append("document", files[0]);
        dispatch(uploadAdditionalDocument(formData));
    }, [dispatch]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Study Materials</h1>
                <p className="text-slate-500">Access learning resources and track your preparation</p>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Tabs */}
            <TabSwitcher
                tabs={TABS}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* Content */}
            {activeTab === "syllabus" ? (
                /* Syllabus & Resources Tab */
                syllabusLoading ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                                        <div className="h-3 bg-slate-200 rounded w-48"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {syllabusData.map((week) => (
                            <WeekAccordion
                                key={week.id}
                                week={week}
                                isExpanded={expandedWeeks.includes(week.id)}
                                onToggle={() => handleWeekToggle(week.id)}
                                onDownload={handleDownload}
                            />
                        ))}
                    </div>
                )
            ) : (
                /* Pre-Review Checklist Tab */
                <div className="space-y-6">
                    {/* Checklist Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-semibold text-slate-900 mb-2">Pre-Review Preparation</h3>
                        <p className="text-sm text-slate-500 mb-6">Complete all items before your review session</p>
                        {checklistLoading ? (
                            <SkeletonChecklist />
                        ) : checklist.length > 0 ? (
                            <div className="space-y-4">
                                {checklist.map((item) => (
                                    <ChecklistItem
                                        key={item.id}
                                        item={item}
                                        onToggle={handleChecklistToggle}
                                        onUpload={handleUpload}
                                        uploading={uploadLoading}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <p>No checklist items yet</p>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {checklist.length > 0 && (
                        <ProgressBar completed={progress.completed} total={progress.total} />
                    )}

                    {/* Upload Dropzone */}
                    <UploadDropzone onFileDrop={handleFileDrop} uploading={uploadLoading} />
                </div>
            )}
        </div>
    );
};

export default StudyMaterials;
