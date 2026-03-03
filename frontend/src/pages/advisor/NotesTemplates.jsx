import React, { useState, useEffect } from "react";
import api from "../../api/axios";

const Notes = () => {
    // Notes state
    const [notes, setNotes] = useState([]);
    const [notesLoading, setNotesLoading] = useState(false);
    const [students, setStudents] = useState([]);
    const [noteForm, setNoteForm] = useState({ studentId: "", title: "", content: "" });
    const [noteFile, setNoteFile] = useState(null);
    const [noteSaving, setNoteSaving] = useState(false);
    const [editingNote, setEditingNote] = useState(null);

    useEffect(() => {
        fetchNotes();
        fetchStudents();
    }, []);

    /* ======== NOTES FUNCTIONS ======== */
    const fetchNotes = async () => {
        try {
            setNotesLoading(true);
            const res = await api.get("/advisor/notes");
            setNotes(res.data.notes || []);
        } catch (err) {
            console.error("Failed to fetch notes:", err);
        } finally {
            setNotesLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await api.get("/advisor/students");
            setStudents(res.data.students || []);
        } catch (err) {
            console.error("Failed to fetch students:", err);
        }
    };

    const handleNoteSubmit = async (e) => {
        e.preventDefault();
        if (!noteForm.studentId || !noteForm.title || !noteForm.content) {
            alert("Please fill in all required fields");
            return;
        }

        try {
            setNoteSaving(true);
            const formData = new FormData();
            formData.append("studentId", noteForm.studentId);
            formData.append("title", noteForm.title);
            formData.append("content", noteForm.content);
            if (noteFile) formData.append("attachment", noteFile);

            if (editingNote) {
                await api.put(`/advisor/notes/${editingNote._id}`, formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
            } else {
                await api.post("/advisor/notes", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
            }

            setNoteForm({ studentId: "", title: "", content: "" });
            setNoteFile(null);
            setEditingNote(null);
            fetchNotes();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to save note");
        } finally {
            setNoteSaving(false);
        }
    };

    const handleEditNote = (note) => {
        setEditingNote(note);
        setNoteForm({
            studentId: note.studentId?._id || "",
            title: note.title,
            content: note.content,
        });
        setNoteFile(null);
    };

    const handleDeleteNote = async (id) => {
        if (!window.confirm("Are you sure you want to delete this note?")) return;
        try {
            await api.delete(`/advisor/notes/${id}`);
            fetchNotes();
        } catch (err) {
            alert("Failed to delete note");
        }
    };

    const cancelNoteEdit = () => {
        setEditingNote(null);
        setNoteForm({ studentId: "", title: "", content: "" });
        setNoteFile(null);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Notes</h2>
                <p className="text-slate-500">Manage your private notes for students</p>
            </div>

            {/* Note Form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">{editingNote ? "Edit Note" : "Create Note"}</h3>
                <form onSubmit={handleNoteSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Student</label>
                        <select
                            value={noteForm.studentId}
                            onChange={(e) => setNoteForm({ ...noteForm, studentId: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                        >
                            <option value="">Select a student...</option>
                            {students.map((s) => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={noteForm.title}
                            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                            placeholder="e.g., Mid-term Progress Check"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
                        <textarea
                            value={noteForm.content}
                            onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                            placeholder="Write your note here..."
                            rows={4}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Attach File (Optional)</label>
                        <input
                            type="file"
                            onChange={(e) => setNoteFile(e.target.files[0])}
                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip"
                        />
                        <p className="text-xs text-slate-400 mt-1">Allowed: PDF, DOC, PPT, Images, ZIP</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={noteSaving}
                            className="flex-1 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {noteSaving ? "Saving..." : (editingNote ? "Update Note" : "Save Note")}
                        </button>
                        {editingNote && (
                            <button type="button" onClick={cancelNoteEdit} className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Notes List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900">Your Notes</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {notesLoading ? (
                        <div className="p-6 text-center text-slate-400">Loading...</div>
                    ) : notes.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">No notes yet</div>
                    ) : (
                        notes.map((note) => (
                            <div key={note._id} className="p-4 hover:bg-slate-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-green-600">{note.studentId?.name || "Student"}</p>
                                        <h4 className="font-semibold text-slate-900">{note.title}</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">{new Date(note.createdAt).toLocaleDateString()}</p>
                                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{note.content}</p>
                                        {note.attachmentName && (
                                            <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${note.attachmentPath}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 mt-2 hover:underline">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                {note.attachmentName}
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <button onClick={() => handleEditNote(note)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button onClick={() => handleDeleteNote(note._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notes;
