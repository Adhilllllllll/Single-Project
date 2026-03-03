import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAssignedStudents } from "../../features/advisor/advisorSlice";
import StudentProfileModal from "../../components/StudentProfileModal";

const Students = () => {
    const dispatch = useDispatch();
    const { students, loading, error } = useSelector((state) => state.advisor);

    // Modal state
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        dispatch(fetchAssignedStudents());
    }, [dispatch]);

    // Memoized handler for opening modal
    const handleViewProfile = useCallback((studentId) => {
        setSelectedStudentId(studentId);
        setIsModalOpen(true);
    }, []);

    // Memoized handler for closing modal
    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
        setSelectedStudentId(null);
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">My Students</h2>
                    <p className="text-slate-500">View and manage your assigned students</p>
                </div>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    {students.length} Students
                </span>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-600 text-sm flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Students Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading.students ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-3 text-slate-500">Loading students...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-1">No students assigned</h3>
                        <p className="text-slate-500 text-sm">Students will appear here once they are assigned to you by the admin.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Current Status</th>
                                <th className="px-6 py-3">Last Review Date</th>
                                <th className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {students.map((student) => (
                                <tr key={student._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">
                                                {student.name?.charAt(0) || "S"}
                                            </div>
                                            <span className="font-medium text-slate-900">{student.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{student.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.status === 'Active'
                                            ? 'bg-green-100 text-green-700'
                                            : student.status === 'Review'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {student.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {formatDate(student.lastReviewDate)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleViewProfile(student._id)}
                                            className="text-sm text-green-600 hover:text-green-800 font-medium hover:underline transition-colors"
                                        >
                                            View Profile
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Student Profile Modal */}
            <StudentProfileModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                studentId={selectedStudentId}
            />
        </div>
    );
};

export default Students;
