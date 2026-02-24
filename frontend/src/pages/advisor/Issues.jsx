import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../../api/axios";

const AdvisorNotifications = () => {
    const { user } = useSelector((state) => state.auth);
    const [activeTab, setActiveTab] = useState("issues");

    // Issues state
    const [issues, setIssues] = useState([]);
    const [issuesLoading, setIssuesLoading] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [response, setResponse] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [issueCounts, setIssueCounts] = useState({ pending: 0, inProgress: 0, resolved: 0 });

    // Notifications state (from admin)
    const [notifications, setNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);

    // Fetch issues
    const fetchIssues = async () => {
        try {
            setIssuesLoading(true);
            const query = statusFilter ? `?status=${statusFilter}` : "";
            const res = await api.get(`/issues${query}`);
            setIssues(res.data.issues || []);
        } catch (err) {
            console.error("Failed to fetch issues:", err);
        } finally {
            setIssuesLoading(false);
        }
    };

    const fetchIssueCounts = async () => {
        try {
            const res = await api.get("/issues/counts");
            setIssueCounts(res.data);
        } catch (err) {
            console.error("Failed to fetch counts:", err);
        }
    };

    // Fetch notifications from admin
    const fetchNotifications = async () => {
        try {
            setNotificationsLoading(true);
            const res = await api.get("/notifications");
            setNotifications(res.data.notifications || []);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        } finally {
            setNotificationsLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
        fetchIssueCounts();
        fetchNotifications();
    }, [statusFilter]);

    // View issue detail
    const viewIssue = async (issueId) => {
        try {
            const res = await api.get(`/issues/${issueId}`);
            setSelectedIssue(res.data.issue);
            setResponse("");
        } catch (err) {
            console.error("Failed to fetch issue:", err);
        }
    };

    // Send response
    const handleRespond = async () => {
        if (!response.trim() || !selectedIssue) return;
        try {
            setSubmitting(true);
            await api.post(`/issues/${selectedIssue._id}/respond`, { message: response });
            setResponse("");
            viewIssue(selectedIssue._id);
            fetchIssueCounts();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to send response");
        } finally {
            setSubmitting(false);
        }
    };

    // Update status
    const updateStatus = async (status) => {
        if (!selectedIssue) return;
        try {
            await api.patch(`/issues/${selectedIssue._id}/status`, { status });
            viewIssue(selectedIssue._id);
            fetchIssues();
            fetchIssueCounts();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update status");
        }
    };

    // Mark notification as read
    const markAsRead = async (notificationId) => {
        try {
            await api.patch(`/notifications/${notificationId}/read`);
            fetchNotifications();
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    const statusColors = {
        pending: "bg-yellow-100 text-yellow-700",
        "in-progress": "bg-blue-100 text-blue-700",
        resolved: "bg-green-100 text-green-700",
    };

    const categoryLabels = {
        technical: "Technical",
        academic: "Academic",
        schedule: "Schedule",
        suggestion: "Suggestion",
        other: "Other",
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
                <p className="text-slate-500">Student issues and admin announcements</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab("issues")}
                    className={`px-4 py-2 text-sm font-medium relative ${activeTab === "issues" ? "border-b-2 border-green-600 text-green-600" : "text-slate-500"}`}
                >
                    Student Issues
                    {issueCounts.pending > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {issueCounts.pending}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("announcements")}
                    className={`px-4 py-2 text-sm font-medium ml-4 ${activeTab === "announcements" ? "border-b-2 border-green-600 text-green-600" : "text-slate-500"}`}
                >
                    Admin Announcements
                </button>
            </div>

            {/* Student Issues Tab */}
            {activeTab === "issues" && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-4 gap-4">
                        <div onClick={() => setStatusFilter("")} className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition ${!statusFilter ? "ring-2 ring-green-500" : "border-slate-200"}`}>
                            <div className="text-2xl font-bold text-slate-900">{issueCounts.total || 0}</div>
                            <div className="text-sm text-slate-500">Total Issues</div>
                        </div>
                        <div onClick={() => setStatusFilter("pending")} className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition ${statusFilter === "pending" ? "ring-2 ring-yellow-500" : "border-slate-200"}`}>
                            <div className="text-2xl font-bold text-yellow-600">{issueCounts.pending || 0}</div>
                            <div className="text-sm text-slate-500">Pending</div>
                        </div>
                        <div onClick={() => setStatusFilter("in-progress")} className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition ${statusFilter === "in-progress" ? "ring-2 ring-blue-500" : "border-slate-200"}`}>
                            <div className="text-2xl font-bold text-blue-600">{issueCounts.inProgress || 0}</div>
                            <div className="text-sm text-slate-500">In Progress</div>
                        </div>
                        <div onClick={() => setStatusFilter("resolved")} className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition ${statusFilter === "resolved" ? "ring-2 ring-green-500" : "border-slate-200"}`}>
                            <div className="text-2xl font-bold text-green-600">{issueCounts.resolved || 0}</div>
                            <div className="text-sm text-slate-500">Resolved</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Issues List */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="font-medium text-slate-900">Issues from Students</h3>
                                {statusFilter && (
                                    <button onClick={() => setStatusFilter("")} className="text-xs text-blue-600 hover:underline">Clear filter</button>
                                )}
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                {issuesLoading ? (
                                    <div className="p-4 text-center text-slate-400">Loading...</div>
                                ) : issues.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400">No issues found</div>
                                ) : (
                                    issues.map((issue) => (
                                        <div key={issue._id} onClick={() => viewIssue(issue._id)} className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${selectedIssue?._id === issue._id ? "bg-green-50" : ""}`}>
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-slate-900">{issue.subject}</span>
                                                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[issue.status]}`}>{issue.status}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                                <span className="font-medium">{issue.studentId?.name}</span>
                                                <span>•</span>
                                                <span>{categoryLabels[issue.category]}</span>
                                                <span>•</span>
                                                <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Issue Detail */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            {selectedIssue ? (
                                <>
                                    <div className="p-4 border-b border-slate-200">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-medium text-slate-900">{selectedIssue.subject}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full ${statusColors[selectedIssue.status]}`}>{selectedIssue.status}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                            <span>From: {selectedIssue.studentId?.name}</span>
                                            <span>•</span>
                                            <span>{categoryLabels[selectedIssue.category]}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedIssue.description}</p>
                                        <p className="text-xs text-slate-400 mt-2">Submitted on {new Date(selectedIssue.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div className="flex-1 overflow-y-auto max-h-[150px]">
                                        {selectedIssue.responses?.map((resp, idx) => (
                                            <div key={idx} className="p-4 border-b border-slate-100">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-sm text-slate-900">{resp.responderName}</span>
                                                    <span className="text-xs text-slate-400">({resp.responderRole})</span>
                                                </div>
                                                <p className="text-sm text-slate-700">{resp.message}</p>
                                                <p className="text-xs text-slate-400 mt-1">{new Date(resp.createdAt).toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 border-t border-slate-200 bg-slate-50">
                                        <div className="flex gap-2 mb-3">
                                            {selectedIssue.status !== "in-progress" && (
                                                <button onClick={() => updateStatus("in-progress")} className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Mark In Progress</button>
                                            )}
                                            {selectedIssue.status !== "resolved" && (
                                                <button onClick={() => updateStatus("resolved")} className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">Mark Resolved</button>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Type your response..." className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" onKeyPress={(e) => e.key === "Enter" && handleRespond()} />
                                            <button onClick={handleRespond} disabled={submitting || !response.trim()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">Send</button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-400 p-8">Select an issue to view details</div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Admin Announcements Tab */}
            {activeTab === "announcements" && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200">
                        <h3 className="font-medium text-slate-900">Announcements from Admin</h3>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                        {notificationsLoading ? (
                            <div className="p-4 text-center text-slate-400">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">No announcements yet</div>
                        ) : (
                            notifications.map((notif) => (
                                <div key={notif._id} className={`p-4 border-b border-slate-100 ${notif.isRead ? "" : "bg-blue-50"}`}>
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-slate-900">{notif.title}</h4>
                                        {!notif.isRead && (
                                            <button onClick={() => markAsRead(notif._id)} className="text-xs text-blue-600 hover:underline">Mark as read</button>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">{notif.message}</p>
                                    <p className="text-xs text-slate-400 mt-2">{new Date(notif.createdAt).toLocaleString()}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvisorNotifications;
