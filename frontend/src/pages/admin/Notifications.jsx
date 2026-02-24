import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../api/axios";

/* ===========================================
   CONSTANTS
=========================================== */
const STATUS_COLORS = {
    pending: "bg-yellow-100 text-yellow-700",
    "in-progress": "bg-blue-100 text-blue-700",
    resolved: "bg-green-100 text-green-700",
};

const CATEGORY_LABELS = {
    technical: "Technical",
    academic: "Academic",
    schedule: "Schedule",
    suggestion: "Suggestion",
    other: "Other",
};

const RECIPIENT_GROUPS = ["students", "advisors", "reviewers", "all_users"];

const RECIPIENT_GROUP_LABELS = {
    students: "Students",
    reviewers: "Reviewers",
    advisors: "Advisors",
    all_users: "All Users",
};

// Date formatter
const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Recipient group formatter
const formatRecipientGroup = (group) =>
    RECIPIENT_GROUP_LABELS[group] || group;

const Notifications = () => {
    const [activeTab, setActiveTab] = useState("send");

    // Send notification state
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [recipientGroup, setRecipientGroup] = useState("");
    const [sentNotifications, setSentNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    // Student issues state
    const [issues, setIssues] = useState([]);
    const [issuesLoading, setIssuesLoading] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [response, setResponse] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [issueCounts, setIssueCounts] = useState({ pending: 0, inProgress: 0, resolved: 0 });

    // Memoized fetch functions
    const fetchSentNotifications = useCallback(async () => {
        try {
            setFetchLoading(true);
            const response = await api.get("/notifications/admin/sent");
            setSentNotifications(response.data.notifications || []);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        } finally {
            setFetchLoading(false);
        }
    }, []);

    const fetchIssueCounts = useCallback(async () => {
        try {
            const res = await api.get("/issues/counts");
            setIssueCounts(res.data);
        } catch (err) {
            console.error("Failed to fetch counts:", err);
        }
    }, []);

    const fetchIssues = useCallback(async () => {
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
    }, [statusFilter]);

    useEffect(() => {
        fetchSentNotifications();
        fetchIssues();
        fetchIssueCounts();
    }, [fetchSentNotifications, fetchIssueCounts]);

    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);

    // Memoized handlers
    const handleSendNotification = useCallback(async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!title.trim() || !message.trim() || !recipientGroup) {
            setError("Please fill in all fields");
            return;
        }

        try {
            setLoading(true);
            const response = await api.post("/notifications/admin/send", {
                title: title.trim(),
                message: message.trim(),
                recipientGroup,
            });
            setSuccess(`Notification sent to ${response.data.recipientCount} recipients`);
            setTitle("");
            setMessage("");
            setRecipientGroup("");
            fetchSentNotifications();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to send notification");
        } finally {
            setLoading(false);
        }
    }, [title, message, recipientGroup, fetchSentNotifications]);

    const viewIssue = useCallback(async (issueId) => {
        try {
            const res = await api.get(`/issues/${issueId}`);
            setSelectedIssue(res.data.issue);
            setResponse("");
        } catch (err) {
            console.error("Failed to fetch issue:", err);
        }
    }, []);

    const handleRespond = useCallback(async () => {
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
    }, [response, selectedIssue, viewIssue, fetchIssueCounts]);

    const updateStatus = useCallback(async (status) => {
        if (!selectedIssue) return;
        try {
            await api.patch(`/issues/${selectedIssue._id}/status`, { status });
            viewIssue(selectedIssue._id);
            fetchIssues();
            fetchIssueCounts();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update status");
        }
    }, [selectedIssue, viewIssue, fetchIssues, fetchIssueCounts]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
                <p className="text-slate-500">Manage system notifications and student issues</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button onClick={() => setActiveTab("send")} className={`px-4 py-2 text-sm font-medium ${activeTab === "send" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}>
                    Send Notification
                </button>
                <button onClick={() => setActiveTab("sent")} className={`px-4 py-2 text-sm font-medium ml-4 ${activeTab === "sent" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}>
                    Sent History
                </button>
                <button onClick={() => setActiveTab("issues")} className={`px-4 py-2 text-sm font-medium ml-4 relative ${activeTab === "issues" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}>
                    Student Issues
                    {issueCounts.pending > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{issueCounts.pending}</span>
                    )}
                </button>
            </div>

            {/* Send Notification Tab */}
            {activeTab === "send" && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Create & Send Notifications</h2>
                    <form onSubmit={handleSendNotification} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your notification message here..." rows={4} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Send To</label>
                            <div className="flex flex-wrap gap-3">
                                {RECIPIENT_GROUPS.map((group) => (
                                    <label key={group} className={`flex items-center px-4 py-2 rounded-lg cursor-pointer border ${recipientGroup === group ? "bg-blue-50 border-blue-500 text-blue-700" : "border-slate-300"}`}>
                                        <input type="radio" name="recipientGroup" value={group} checked={recipientGroup === group} onChange={() => setRecipientGroup(group)} className="sr-only" />
                                        {formatRecipientGroup(group)}
                                    </label>
                                ))}
                            </div>
                        </div>
                        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
                        {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">{success}</div>}
                        <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                            {loading ? "Sending..." : "Send Notification"}
                        </button>
                    </form>
                </div>
            )}

            {/* Sent History Tab */}
            {activeTab === "sent" && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200">
                        <h3 className="font-medium text-slate-900">Previously Sent Notifications</h3>
                    </div>
                    {fetchLoading ? (
                        <div className="p-8 text-center text-slate-500">Loading...</div>
                    ) : sentNotifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No notifications sent yet</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 text-left">Title</th>
                                    <th className="px-6 py-3 text-left">Date Sent</th>
                                    <th className="px-6 py-3 text-left">Sent To</th>
                                    <th className="px-6 py-3 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sentNotifications.map((notification) => (
                                    <tr key={notification.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900 text-sm">{notification.title}</div>
                                            <div className="text-xs text-slate-500 truncate max-w-xs">{notification.message}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(notification.dateSent)}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">{formatRecipientGroup(notification.recipientGroup)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${notification.status === "delivered" ? "bg-green-100 text-green-700" : notification.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                                                {notification.status === "delivered" ? "Delivered" : notification.status === "pending" ? "Pending" : "Failed"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Student Issues Tab */}
            {activeTab === "issues" && (
                <>
                    <div className="grid grid-cols-4 gap-4">
                        <div onClick={() => setStatusFilter("")} className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition ${!statusFilter ? "ring-2 ring-blue-500" : "border-slate-200"}`}>
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
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="font-medium text-slate-900">Issues from Students</h3>
                                {statusFilter && <button onClick={() => setStatusFilter("")} className="text-xs text-blue-600 hover:underline">Clear filter</button>}
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                {issuesLoading ? (
                                    <div className="p-4 text-center text-slate-400">Loading...</div>
                                ) : issues.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400">No issues found</div>
                                ) : (
                                    issues.map((issue) => (
                                        <div key={issue._id} onClick={() => viewIssue(issue._id)} className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${selectedIssue?._id === issue._id ? "bg-blue-50" : ""}`}>
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-slate-900">{issue.subject}</span>
                                                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[issue.status]}`}>{issue.status}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                                <span className="font-medium">{issue.studentId?.name}</span>
                                                <span>•</span>
                                                <span>{CATEGORY_LABELS[issue.category]}</span>
                                                <span>•</span>
                                                <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            {selectedIssue ? (
                                <>
                                    <div className="p-4 border-b border-slate-200">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-medium text-slate-900">{selectedIssue.subject}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[selectedIssue.status]}`}>{selectedIssue.status}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                            <span>From: {selectedIssue.studentId?.name}</span>
                                            <span>•</span>
                                            <span>{CATEGORY_LABELS[selectedIssue.category]}</span>
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
                                            {selectedIssue.status !== "in-progress" && <button onClick={() => updateStatus("in-progress")} className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Mark In Progress</button>}
                                            {selectedIssue.status !== "resolved" && <button onClick={() => updateStatus("resolved")} className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">Mark Resolved</button>}
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Type your response..." className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" onKeyPress={(e) => e.key === "Enter" && handleRespond()} />
                                            <button onClick={handleRespond} disabled={submitting || !response.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Send</button>
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
        </div>
    );
};

export default Notifications;
