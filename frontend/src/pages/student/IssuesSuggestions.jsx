import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../../api/axios";

const IssuesSuggestions = () => {
    const { user } = useSelector((state) => state.auth);
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [activeTab, setActiveTab] = useState("submit");

    // Form state
    const [form, setForm] = useState({
        subject: "",
        description: "",
        category: "other",
        recipients: ["advisor"],
    });

    // Fetch user's issues
    const fetchIssues = async () => {
        try {
            setLoading(true);
            const res = await api.get("/issues/my");
            setIssues(res.data.issues || []);
        } catch (err) {
            console.error("Failed to fetch issues:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, []);

    // Handle form change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // Handle recipient toggle
    const toggleRecipient = (recipient) => {
        setForm((prev) => {
            const exists = prev.recipients.includes(recipient);
            if (exists && prev.recipients.length === 1) return prev; // Must have at least one
            return {
                ...prev,
                recipients: exists
                    ? prev.recipients.filter((r) => r !== recipient)
                    : [...prev.recipients, recipient],
            };
        });
    };

    // Submit issue
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.subject.trim() || !form.description.trim()) {
            alert("Please fill in subject and description");
            return;
        }
        try {
            setSubmitting(true);
            await api.post("/issues", form);
            alert("Issue submitted successfully!");
            setForm({
                subject: "",
                description: "",
                category: "other",
                recipients: ["advisor"],
            });
            fetchIssues();
            setActiveTab("history");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to submit issue");
        } finally {
            setSubmitting(false);
        }
    };

    // View issue detail
    const viewIssue = async (issueId) => {
        try {
            const res = await api.get(`/issues/${issueId}`);
            setSelectedIssue(res.data.issue);
        } catch (err) {
            console.error("Failed to fetch issue:", err);
        }
    };

    // Status badge colors
    const statusColors = {
        pending: "bg-yellow-100 text-yellow-700",
        "in-progress": "bg-blue-100 text-blue-700",
        resolved: "bg-green-100 text-green-700",
    };

    // Category labels
    const categoryLabels = {
        technical: "Technical Issue",
        academic: "Academic",
        schedule: "Schedule",
        suggestion: "Suggestion",
        other: "Other",
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Issues & Suggestions</h2>
                <p className="text-slate-500">Submit issues or suggestions to your advisor or admin</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab("submit")}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === "submit" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}
                >
                    Submit New
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === "history" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}
                >
                    My Issues ({issues.length})
                </button>
            </div>

            {/* Submit Form */}
            {activeTab === "submit" && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Subject */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                            <input
                                type="text"
                                name="subject"
                                value={form.subject}
                                onChange={handleChange}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Brief summary of your issue"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <select
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="technical">Technical Issue</option>
                                <option value="academic">Academic</option>
                                <option value="schedule">Schedule</option>
                                <option value="suggestion">Suggestion</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Recipients */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Send To *</label>
                            <div className="flex gap-3">
                                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border ${form.recipients.includes("advisor") ? "bg-blue-50 border-blue-500 text-blue-700" : "border-slate-300 text-slate-600"}`}>
                                    <input
                                        type="checkbox"
                                        checked={form.recipients.includes("advisor")}
                                        onChange={() => toggleRecipient("advisor")}
                                        className="sr-only"
                                    />
                                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${form.recipients.includes("advisor") ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                                        {form.recipients.includes("advisor") && <span className="text-white text-xs">✓</span>}
                                    </span>
                                    Advisor
                                </label>
                                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border ${form.recipients.includes("admin") ? "bg-blue-50 border-blue-500 text-blue-700" : "border-slate-300 text-slate-600"}`}>
                                    <input
                                        type="checkbox"
                                        checked={form.recipients.includes("admin")}
                                        onChange={() => toggleRecipient("admin")}
                                        className="sr-only"
                                    />
                                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${form.recipients.includes("admin") ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                                        {form.recipients.includes("admin") && <span className="text-white text-xs">✓</span>}
                                    </span>
                                    Admin
                                </label>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none"
                                placeholder="Describe your issue or suggestion in detail..."
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                        >
                            {submitting ? "Submitting..." : "Submit Issue"}
                        </button>
                    </form>
                </div>
            )}

            {/* Issues History */}
            {activeTab === "history" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Issues List */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200">
                            <h3 className="font-medium text-slate-900">My Issues</h3>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto">
                            {loading ? (
                                <div className="p-4 text-center text-slate-400">Loading...</div>
                            ) : issues.length === 0 ? (
                                <div className="p-4 text-center text-slate-400">No issues submitted yet</div>
                            ) : (
                                issues.map((issue) => (
                                    <div
                                        key={issue._id}
                                        onClick={() => viewIssue(issue._id)}
                                        className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${selectedIssue?._id === issue._id ? "bg-blue-50" : ""}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-slate-900">{issue.subject}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${statusColors[issue.status]}`}>
                                                {issue.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
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
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {selectedIssue ? (
                            <>
                                <div className="p-4 border-b border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium text-slate-900">{selectedIssue.subject}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[selectedIssue.status]}`}>
                                            {selectedIssue.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                        <span>{categoryLabels[selectedIssue.category]}</span>
                                        <span>•</span>
                                        <span>Sent to: {selectedIssue.recipients.join(", ")}</span>
                                    </div>
                                </div>
                                <div className="p-4 border-b border-slate-100 bg-slate-50">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedIssue.description}</p>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Submitted on {new Date(selectedIssue.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                {/* Responses */}
                                <div className="max-h-[250px] overflow-y-auto">
                                    {selectedIssue.responses?.length > 0 ? (
                                        selectedIssue.responses.map((resp, idx) => (
                                            <div key={idx} className="p-4 border-b border-slate-100">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-sm text-slate-900">{resp.responderName}</span>
                                                    <span className="text-xs text-slate-400">({resp.responderRole})</span>
                                                </div>
                                                <p className="text-sm text-slate-700">{resp.message}</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {new Date(resp.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-slate-400 text-sm">
                                            No responses yet
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="p-8 text-center text-slate-400">
                                Select an issue to view details
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default IssuesSuggestions;
