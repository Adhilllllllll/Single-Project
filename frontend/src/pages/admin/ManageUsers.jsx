import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import CreateUserModal from "../../components/CreateUserModal";
import api from "../../api/axios";
import Avatar from "../../components/Avatar";

 
/* ======================================================
   MEMOIZED SUB-COMPONENTS
   Last Updated: 2026-01-12 12:50 - Force Vite recompile
====================================================== */

// Memoized user row to prevent re-renders


const UserRow = memo(({ user, onView, onEdit, onDelete }) => (
    <tr className="hover:bg-slate-50">
        <td className="px-6 py-4 flex items-center gap-3">
            <Avatar src={user.avatar} name={user.name} size="sm" />
            <div>
                <div className="font-medium text-slate-900 text-sm">{user.name}</div>
                <div className="text-xs text-slate-500 capitalize">{user.role}</div>
            </div>
        </td>
        <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
        <td className="px-6 py-4 text-sm text-slate-600">{user.domain || "-"}</td>
        <td className="px-6 py-4">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {user.status === 'active' ? 'Active' : 'Inactive'}
            </span>
        </td>
        <td className="px-6 py-4 text-right flex justify-end gap-2 text-slate-400">
            <button className="hover:text-blue-600" onClick={() => onView(user)} title="View">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
            <button className="hover:text-amber-600" onClick={() => onEdit(user)} title="Edit">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button className="hover:text-red-600" onClick={() => onDelete(user)} title="Delete">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </td>
    </tr>
));

/* ======================================================
   CONSTANTS
====================================================== */
const TAB_TO_ROLE = {
    "Advisors": "advisor",
    "Reviewers": "reviewer",
    "Students": "student",
};
const TABS = ["Advisors", "Reviewers", "Students"];

/* ======================================================
   MAIN COMPONENT
====================================================== */
const ManageUsers = () => {
    const [activeTab, setActiveTab] = useState("Advisors");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // Modal states
    const [viewModal, setViewModal] = useState({ open: false, user: null });
    const [editModal, setEditModal] = useState({ open: false, user: null });
    const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
    const [actionLoading, setActionLoading] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", domain: "" });

    // Memoized fetch function
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const role = TAB_TO_ROLE[activeTab];
            const params = new URLSearchParams();
            params.append("role", role);
            if (statusFilter) params.append("status", statusFilter);

            const response = await api.get(`/admin/users?${params.toString()}`);
            setUsers(response.data.users || []);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
        }
    }, [activeTab, statusFilter]);

    // Fetch users when tab or filter changes
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Memoized filtered users
    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        const query = searchQuery.toLowerCase();
        return users.filter(user =>
            user.name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query)
        );
    }, [users, searchQuery]);

    // Memoized handlers
    const handleUserCreated = useCallback(() => fetchUsers(), [fetchUsers]);
    const handleView = useCallback((user) => setViewModal({ open: true, user }), []);
    const handleEdit = useCallback((user) => {
        setEditForm({ name: user.name || "", domain: user.domain || "" });
        setEditModal({ open: true, user });
    }, []);
    const handleDelete = useCallback((user) => setDeleteModal({ open: true, user }), []);

    // Toggle status handler
    const handleToggleStatus = useCallback(async (user) => {
        try {
            setActionLoading(true);
            const type = user.isStudent ? "student" : "user";
            await api.patch(`/admin/users/${user._id}/status?type=${type}`);
            fetchUsers();
        } catch (err) {
            console.error("Failed to toggle status:", err);
        } finally {
            setActionLoading(false);
        }
    }, [fetchUsers]);

    // Confirm edit handler
    const confirmEdit = useCallback(async () => {
        try {
            setActionLoading(true);
            const user = editModal.user;
            const type = user.isStudent ? "student" : "user";
            await api.patch(`/admin/users/${user._id}?type=${type}`, editForm);
            setEditModal({ open: false, user: null });
            fetchUsers();
        } catch (err) {
            console.error("Failed to update user:", err);
        } finally {
            setActionLoading(false);
        }
    }, [editForm, editModal.user, fetchUsers]);

    // Confirm delete handler
    const confirmDelete = useCallback(async () => {
        try {
            setActionLoading(true);
            const user = deleteModal.user;
            const type = user.isStudent ? "student" : "user";
            await api.delete(`/admin/users/${user._id}?type=${type}`);
            setDeleteModal({ open: false, user: null });
            fetchUsers();
        } catch (err) {
            console.error("Failed to delete user:", err);
        } finally {
            setActionLoading(false);
        }
    }, [deleteModal.user, fetchUsers]);


    return (
        <>
            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleUserCreated}
            />

            {/* View Modal */}
            {viewModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">User Details</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-4 mb-4">
                                <Avatar
                                    src={viewModal.user.avatar}
                                    name={viewModal.user.name}
                                    size="xl"
                                />
                                <div>
                                    <div className="font-medium text-slate-900">{viewModal.user.name}</div>
                                    <div className="text-sm text-slate-500">{viewModal.user.role}</div>
                                </div>
                            </div>
                            <div className="border-t pt-3 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Email:</span>
                                    <span className="text-slate-900">{viewModal.user.email}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Domain:</span>
                                    <span className="text-slate-900">{viewModal.user.domain || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Status:</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${viewModal.user.status === 'active'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                        }`}>
                                        {viewModal.user.status === 'active' ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                {viewModal.user.advisorName && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Advisor:</span>
                                        <span className="text-slate-900">{viewModal.user.advisorName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex gap-2">
                            <button
                                onClick={() => handleToggleStatus(viewModal.user)}
                                disabled={actionLoading}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${viewModal.user.status === 'active'
                                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    }`}
                            >
                                {viewModal.user.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                                onClick={() => setViewModal({ open: false, user: null })}
                                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit User</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Domain</label>
                                <input
                                    type="text"
                                    value={editForm.domain}
                                    onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex gap-2">
                            <button
                                onClick={confirmEdit}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                                {actionLoading ? "Saving..." : "Save Changes"}
                            </button>
                            <button
                                onClick={() => setEditModal({ open: false, user: null })}
                                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete User</h3>
                        <p className="text-slate-600 mb-4">
                            Are you sure you want to delete <strong>{deleteModal.user?.name}</strong>?
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={confirmDelete}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                                {actionLoading ? "Deleting..." : "Delete"}
                            </button>
                            <button
                                onClick={() => setDeleteModal({ open: false, user: null })}
                                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Manage Users</h2>
                        <p className="text-slate-500">Add, edit, and manage system users</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Bulk Import</button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 shadow-sm"
                        >
                            + Add New User
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    {/* TABS */}
                    <div className="flex border-b border-slate-200 px-6 pt-2">
                        {["Advisors", "Reviewers", "Students"].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`mr-8 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* FILTERS */}
                    <div className="p-4 border-b border-slate-200 flex gap-4 bg-slate-50">
                        <input
                            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <select
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    {/* TABLE */}
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            No {activeTab.toLowerCase()} found
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Domain</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <Avatar src={user.avatar} name={user.name} size="sm" />
                                            <div>
                                                <div className="font-medium text-slate-900 text-sm">{user.name}</div>
                                                <div className="text-xs text-slate-500 capitalize">{user.role}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{user.domain || "-"}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {user.status === 'active' ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2 text-slate-400">
                                            <button
                                                className="hover:text-blue-600"
                                                onClick={() => handleView(user)}
                                                title="View"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                            <button
                                                className="hover:text-amber-600"
                                                onClick={() => handleEdit(user)}
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button
                                                className="hover:text-red-600"
                                                onClick={() => handleDelete(user)}
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
};

export default ManageUsers;
