import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    fetchStudentTasks,
    fetchStudentWorkshops,
    uploadTaskFile,
    joinWorkshop,
} from "../../features/student/studentSlice";
import {
    TabSwitcher,
    StatusBadge,
    PriorityBadge,
    AttendanceBadge,
    DataTable,
} from "../../components/common/TableComponents";

/* ============================================
   Tab Configuration
============================================ */
const TABS = [
    { id: "tasks", label: "Tasks" },
    { id: "workshops", label: "Workshops & Sessions" },
];

/* ============================================
   Column Configurations
============================================ */
const TASK_COLUMNS = [
    { key: "task", label: "Task" },
    { key: "deadline", label: "Deadline" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
    { key: "action", label: "Action" },
];

const WORKSHOP_COLUMNS = [
    { key: "workshop", label: "Workshop" },
    { key: "dateTime", label: "Date & Time" },
    { key: "status", label: "Status" },
    { key: "attendance", label: "Attendance" },
    { key: "action", label: "Action" },
];

/* ============================================
   Skeleton Row Components
============================================ */
const SkeletonTaskRow = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-40"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
        <td className="px-6 py-4"><div className="h-6 bg-slate-200 rounded-full w-16"></div></td>
        <td className="px-6 py-4"><div className="h-6 bg-slate-200 rounded-full w-20"></div></td>
        <td className="px-6 py-4"><div className="h-8 bg-slate-200 rounded w-20"></div></td>
    </tr>
);

/* ============================================
   Task Row Component (Memoized)
============================================ */
const TaskRow = React.memo(({ task, onUpload, uploading }) => {
    const isCompleted = task.status === "Completed";
    const fileInputRef = useRef(null);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append("attachment", file);
            onUpload(task.id, formData);
        }
    };

    return (
        <tr className="hover:bg-slate-50">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                        <span className="font-medium text-slate-900">{task.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                            {task.category && (
                                <span className={`px-2 py-0.5 text-xs rounded-full ${task.category === "Coding" ? "bg-blue-100 text-blue-700" :
                                        task.category === "Documentation" ? "bg-purple-100 text-purple-700" :
                                            task.category === "Communication" ? "bg-orange-100 text-orange-700" :
                                                task.category === "Research" ? "bg-cyan-100 text-cyan-700" :
                                                    task.category === "Project" ? "bg-green-100 text-green-700" :
                                                        "bg-slate-100 text-slate-700"
                                    }`}>
                                    {task.category}
                                </span>
                            )}
                            {task.assignedBy && (
                                <span className="text-xs text-slate-400">by {task.assignedBy}</span>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2 text-slate-600">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(task.deadline)}
                </div>
            </td>
            <td className="px-6 py-4">
                <PriorityBadge priority={task.priority} />
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                    <StatusBadge status={task.status} />
                    {task.hasFeedback && (
                        <span className="text-xs text-green-600 flex items-center gap-1" title={task.feedback?.comment}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Feedback
                        </span>
                    )}
                </div>
            </td>
            <td className="px-6 py-4">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                />
                <button
                    onClick={handleUploadClick}
                    disabled={isCompleted || uploading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isCompleted
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : uploading
                            ? "bg-orange-300 text-white cursor-wait"
                            : "bg-orange-500 text-white hover:bg-orange-600"
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {uploading ? "Uploading..." : "Upload"}
                </button>
            </td>
        </tr>
    );
});

TaskRow.displayName = "TaskRow";

/* ============================================
   Workshop Row Component (Memoized)
============================================ */
const WorkshopRow = React.memo(({ workshop, onJoin, onViewMaterials, joining }) => {
    const isUpcoming = workshop.status === "Upcoming";
    const isAttended = workshop.attendance === "Attended";

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <tr className="hover:bg-slate-50">
            <td className="px-6 py-4">
                <span className="font-medium text-slate-900">{workshop.title}</span>
            </td>
            <td className="px-6 py-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-600">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(workshop.date)}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {workshop.time}
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <StatusBadge status={workshop.status} />
            </td>
            <td className="px-6 py-4">
                <AttendanceBadge attended={isAttended} />
            </td>
            <td className="px-6 py-4">
                {isUpcoming ? (
                    <button
                        onClick={() => onJoin(workshop.id)}
                        disabled={joining}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${joining
                            ? "bg-orange-300 text-white cursor-wait"
                            : "bg-orange-500 text-white hover:bg-orange-600"
                            }`}
                    >
                        {joining ? "Joining..." : "Join"}
                    </button>
                ) : (
                    <button
                        onClick={() => onViewMaterials(workshop.id)}
                        className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        View Materials
                    </button>
                )}
            </td>
        </tr>
    );
});

WorkshopRow.displayName = "WorkshopRow";

/* ============================================
   Main Tasks Page Component
============================================ */
const Tasks = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState("tasks");

    const {
        tasks,
        workshops,
        tasksLoading,
        workshopsLoading,
        uploadLoading,
        loading,
        error,
    } = useSelector((state) => state.student);

    // Fetch data on mount
    useEffect(() => {
        dispatch(fetchStudentTasks());
        dispatch(fetchStudentWorkshops());
    }, [dispatch]);

    // Handler functions
    const handleUpload = useCallback((taskId, formData) => {
        dispatch(uploadTaskFile({ taskId, formData }));
    }, [dispatch]);

    const handleJoin = useCallback((workshopId) => {
        dispatch(joinWorkshop(workshopId));
        // Also open meeting link if available
        const workshop = workshops.find(w => w.id === workshopId);
        if (workshop?.meetingLink) {
            window.open(workshop.meetingLink, "_blank");
        }
    }, [dispatch, workshops]);

    const handleViewMaterials = useCallback((workshopId) => {
        // Navigate to materials or show modal
        console.log("View materials for:", workshopId);
        // TODO: Implement materials modal
    }, []);

    const handleTabChange = useCallback((tabId) => {
        setActiveTab(tabId);
    }, []);

    // Render task row
    const renderTaskRow = useCallback((task, index) => (
        <TaskRow key={task.id} task={task} onUpload={handleUpload} uploading={uploadLoading} />
    ), [handleUpload, uploadLoading]);

    // Render workshop row
    const renderWorkshopRow = useCallback((workshop, index) => (
        <WorkshopRow
            key={workshop.id}
            workshop={workshop}
            onJoin={handleJoin}
            onViewMaterials={handleViewMaterials}
            joining={loading}
        />
    ), [handleJoin, handleViewMaterials, loading]);

    // Render skeleton rows
    const renderSkeletonRows = useCallback(() => (
        <>
            <SkeletonTaskRow />
            <SkeletonTaskRow />
            <SkeletonTaskRow />
        </>
    ), []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Tasks & Activities</h1>
                <p className="text-slate-500">Manage your assignments and track workshop attendance</p>
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
            <div className="mt-6">
                {activeTab === "tasks" ? (
                    tasksLoading ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-xs">
                                    <tr>
                                        {TASK_COLUMNS.map((col) => (
                                            <th key={col.key} className="px-6 py-4">{col.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {renderSkeletonRows()}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <DataTable
                            columns={TASK_COLUMNS}
                            data={tasks}
                            renderRow={renderTaskRow}
                            emptyMessage="No tasks assigned yet"
                        />
                    )
                ) : (
                    workshopsLoading ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-xs">
                                    <tr>
                                        {WORKSHOP_COLUMNS.map((col) => (
                                            <th key={col.key} className="px-6 py-4">{col.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {renderSkeletonRows()}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <DataTable
                            columns={WORKSHOP_COLUMNS}
                            data={workshops}
                            renderRow={renderWorkshopRow}
                            emptyMessage="No workshops available"
                        />
                    )
                )}
            </div>
        </div>
    );
};

export default Tasks;
