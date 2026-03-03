import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "../../api/axios";

/* ============================================
   Category Badge Component
============================================ */
const CategoryBadge = ({ category }) => {
    const colors = {
        Coding: "bg-blue-100 text-blue-700",
        Documentation: "bg-purple-100 text-purple-700",
        Communication: "bg-orange-100 text-orange-700",
        Research: "bg-cyan-100 text-cyan-700",
        Project: "bg-green-100 text-green-700",
        Other: "bg-slate-100 text-slate-700",
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[category] || colors.Other}`}>
            {category}
        </span>
    );
};

/* ============================================
   Priority Badge Component
============================================ */
const PriorityBadge = ({ priority }) => {
    const colors = {
        High: "bg-red-100 text-red-700",
        Medium: "bg-yellow-100 text-yellow-700",
        Low: "bg-green-100 text-green-700",
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority] || colors.Medium}`}>
            {priority}
        </span>
    );
};

/* ============================================
   Status Badge Component
============================================ */
const StatusBadge = ({ status }) => {
    const colors = {
        Pending: "bg-slate-100 text-slate-700",
        "In Progress": "bg-blue-100 text-blue-700",
        Completed: "bg-green-100 text-green-700",
        Overdue: "bg-red-100 text-red-700",
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.Pending}`}>
            {status}
        </span>
    );
};

/* ============================================
   Create Task Modal Component
============================================ */
const CreateTaskModal = ({ isOpen, onClose, students, onTaskCreated }) => {
    const [formData, setFormData] = useState({
        studentIds: [],
        title: "",
        description: "",
        category: "Other",
        deadline: "",
        priority: "Medium",
        attachmentRequired: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.studentIds.length === 0) {
            setError("Select at least one student");
            return;
        }
        if (!formData.title.trim()) {
            setError("Title is required");
            return;
        }
        if (!formData.deadline) {
            setError("Deadline is required");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await api.post("/tasks/advisor/tasks", formData);
            onTaskCreated();
            onClose();
            setFormData({
                studentIds: [],
                title: "",
                description: "",
                category: "Other",
                deadline: "",
                priority: "Medium",
                attachmentRequired: false,
            });
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to create task");
        } finally {
            setLoading(false);
        }
    };

    const toggleStudent = (studentId) => {
        setFormData(prev => ({
            ...prev,
            studentIds: prev.studentIds.includes(studentId)
                ? prev.studentIds.filter(id => id !== studentId)
                : [...prev.studentIds, studentId]
        }));
    };

    const selectAll = () => {
        setFormData(prev => ({
            ...prev,
            studentIds: prev.studentIds.length === students.length
                ? []
                : students.map(s => s.id)
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-green-600 to-green-700">
                    <h3 className="text-lg font-bold text-white">Create New Task</h3>
                    <button onClick={onClose} className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Student Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Assign to Students *
                        </label>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500">{formData.studentIds.length} selected</span>
                            <button type="button" onClick={selectAll} className="text-xs text-green-600 hover:underline">
                                {formData.studentIds.length === students.length ? "Deselect All" : "Select All"}
                            </button>
                        </div>
                        <div className="border border-slate-200 rounded-lg max-h-32 overflow-y-auto">
                            {students.map(student => (
                                <label
                                    key={student._id}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.studentIds.includes(student.id)}
                                        onChange={() => toggleStudent(student.id)}
                                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                    />
                                    <span className="text-sm text-slate-700">{student.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
                            placeholder="Enter task title"
                        />
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
                            placeholder="Enter task description"
                        />
                    </div>

                    {/* Category & Priority */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
                            >
                                <option value="Coding">Coding</option>
                                <option value="Documentation">Documentation</option>
                                <option value="Communication">Communication</option>
                                <option value="Research">Research</option>
                                <option value="Project">Project</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
                            >
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>
                    </div>

                    {/* Deadline */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Deadline *</label>
                        <input
                            type="date"
                            value={formData.deadline}
                            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                    </div>

                    {/* Attachment Required */}
                    <div className="mb-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.attachmentRequired}
                                onChange={(e) => setFormData({ ...formData, attachmentRequired: e.target.checked })}
                                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                            />
                            <span className="text-sm text-slate-700">Require attachment/file submission</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? "Creating..." : "Create Task"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ============================================
   Task Feedback Modal Component
============================================ */
const TaskFeedbackModal = ({ isOpen, onClose, task, onFeedbackAdded }) => {
    const [comment, setComment] = useState("");
    const [rating, setRating] = useState(7);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!comment.trim()) {
            setError("Feedback comment is required");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await api.patch(`/tasks/advisor/tasks/${task.id}/feedback`, {
                comment: comment.trim(),
                rating
            });
            onFeedbackAdded();
            onClose();
            setComment("");
            setRating(7);
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to add feedback");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !task) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden mx-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700">
                    <h3 className="text-lg font-bold text-white">Add Feedback</h3>
                    <button onClick={onClose} className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {/* Task Info */}
                    <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                        <p className="font-medium text-slate-900">{task.title}</p>
                        <p className="text-sm text-slate-500">Student: {task.student?.name}</p>
                    </div>

                    {/* Attachment Info */}
                    {task.hasAttachment && (
                        <div className="mb-4 p-3 bg-green-50 rounded-lg flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-green-700">Student submitted: {task.attachment?.filename}</span>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Rating */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Rating: {rating}/10</label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={rating}
                            onChange={(e) => setRating(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>Poor</span>
                            <span>Excellent</span>
                        </div>
                    </div>

                    {/* Comment */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Feedback Comment *</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter your feedback for the student..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? "Submitting..." : "Submit Feedback"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ============================================
   Main Tasks Page Component
============================================ */
const Tasks = () => {
    const [tasks, setTasks] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [studentFilter, setStudentFilter] = useState("");

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // Fetch tasks
    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (statusFilter) params.status = statusFilter;
            if (categoryFilter) params.category = categoryFilter;
            if (studentFilter) params.studentId = studentFilter;

            const res = await api.get("/tasks/advisor/tasks", { params });
            setTasks(res.data?.tasks || []);
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to load tasks");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, categoryFilter, studentFilter]);

    // Fetch students for filter and create modal
    const fetchStudents = useCallback(async () => {
        try {
            const res = await api.get("/advisor/students");
            setStudents(res.data?.students || []);
        } catch (err) {
            console.error("Failed to fetch students:", err);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
        fetchStudents();
    }, [fetchTasks, fetchStudents]);

    // Delete task
    const handleDelete = async (taskId) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;

        try {
            await api.delete(`/tasks/advisor/tasks/${taskId}`);
            fetchTasks();
        } catch (err) {
            alert(err?.response?.data?.message || "Failed to delete task");
        }
    };

    // Open feedback modal
    const handleFeedback = (task) => {
        setSelectedTask(task);
        setShowFeedbackModal(true);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

    // Check if deadline passed
    const isOverdue = (deadline, status) => {
        if (status === "Completed") return false;
        return new Date(deadline) < new Date();
    };

    // Stats
    const stats = useMemo(() => ({
        total: tasks.length,
        pending: tasks.filter(t => t.status === "Pending").length,
        completed: tasks.filter(t => t.status === "Completed").length,
        overdue: tasks.filter(t => isOverdue(t.deadline, t.status)).length,
    }), [tasks]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Task Management</h1>
                    <p className="text-slate-500">Create and manage tasks for your students</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Task
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm">Total Tasks</div>
                    <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm">Pending</div>
                    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm">Completed</div>
                    <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm">Overdue</div>
                    <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                    <option value="">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Overdue">Overdue</option>
                </select>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                    <option value="">All Categories</option>
                    <option value="Coding">Coding</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Communication">Communication</option>
                    <option value="Research">Research</option>
                    <option value="Project">Project</option>
                    <option value="Other">Other</option>
                </select>
                <select
                    value={studentFilter}
                    onChange={(e) => setStudentFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                    <option value="">All Students</option>
                    {students.map(s => (
                        <option key={s._id} value={s.i_d}>{s.name}</option>
                    ))}
                </select>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Tasks Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">Loading tasks...</div>
                ) : tasks.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        No tasks found. Click "Create Task" to assign one!
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Task</th>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Deadline</th>
                                <th className="px-6 py-4">Priority</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tasks.map(task => (
                                <tr key={task.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{task.title}</div>
                                        {task.hasAttachment && (
                                            <span className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                                Submitted
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{task.student?.name}</td>
                                    <td className="px-6 py-4"><CategoryBadge category={task.category} /></td>
                                    <td className="px-6 py-4">
                                        <span className={isOverdue(task.deadline, task.status) ? "text-red-600 font-medium" : "text-slate-600"}>
                                            {formatDate(task.deadline)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4"><PriorityBadge priority={task.priority} /></td>
                                    <td className="px-6 py-4"><StatusBadge status={task.status} /></td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {task.hasAttachment && !task.hasFeedback && (
                                                <button
                                                    onClick={() => handleFeedback(task)}
                                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                                                >
                                                    Feedback
                                                </button>
                                            )}
                                            {task.hasFeedback && (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                                    Reviewed
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleDelete(task.id)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modals */}
            <CreateTaskModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                students={students}
                onTaskCreated={fetchTasks}
            />
            <TaskFeedbackModal
                isOpen={showFeedbackModal}
                onClose={() => {
                    setShowFeedbackModal(false);
                    setSelectedTask(null);
                }}
                task={selectedTask}
                onFeedbackAdded={fetchTasks}
            />
        </div>
    );
};

export default Tasks;
