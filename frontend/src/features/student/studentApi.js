import api from "../../api/axios";

/* ===========================================
   Student Reviews API
=========================================== */

// Get upcoming reviews for student
export const getUpcomingReviews = () => {
    return api.get("/reviews/student/upcoming");
};

// Get review history (completed reviews)
export const getReviewHistory = () => {
    return api.get("/reviews/student/history");
};

// Get single review report
export const getReviewReport = (reviewId) => {
    return api.get(`/reviews/student/${reviewId}/report`);
};

// Get student progress data
export const getStudentProgress = () => {
    return api.get("/reviews/student/progress");
};

/* ===========================================
   Student Tasks API
=========================================== */

// Get all tasks for student
export const getStudentTasks = () => {
    return api.get("/tasks/student/tasks");
};

// Update task status
export const updateTaskStatus = (taskId, status) => {
    return api.patch(`/tasks/student/tasks/${taskId}/status`, { status });
};

// Upload task attachment
export const uploadTaskAttachment = (taskId, formData) => {
    return api.post(`/tasks/student/tasks/${taskId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

/* ===========================================
   Student Workshops API
=========================================== */

// Get all workshops for student
export const getStudentWorkshops = () => {
    return api.get("/tasks/student/workshops");
};

// Mark workshop attendance
export const markWorkshopAttendance = (workshopId) => {
    return api.patch(`/tasks/student/workshops/${workshopId}/attend`);
};

// Get workshop materials
export const getWorkshopMaterials = (workshopId) => {
    return api.get(`/tasks/student/workshops/${workshopId}/materials`);
};

/* ===========================================
   Student Study Materials API
=========================================== */

// Get syllabus weeks
export const getSyllabusWeeks = () => {
    return api.get("/materials/syllabus");
};

// Get student checklist
export const getStudentChecklist = () => {
    return api.get("/materials/checklist");
};

// Toggle checklist item
export const toggleChecklistItem = (itemId) => {
    return api.patch(`/materials/checklist/${itemId}/toggle`);
};

// Upload checklist attachment
export const uploadChecklistAttachment = (itemId, formData) => {
    return api.post(`/materials/checklist/${itemId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

// Get checklist progress
export const getChecklistProgress = () => {
    return api.get("/materials/checklist/progress");
};

// Upload additional document
export const uploadDocument = (formData) => {
    return api.post("/materials/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

/* ===========================================
   Student Notifications API
=========================================== */

// Get all notifications
export const getNotifications = () => {
    return api.get("/notifications");
};

// Get unread count
export const getUnreadCount = () => {
    return api.get("/notifications/unread-count");
};

// Mark notification as read
export const markNotificationAsRead = (notificationId) => {
    return api.patch(`/notifications/${notificationId}/read`);
};

// Mark all notifications as read
export const markAllNotificationsAsRead = () => {
    return api.patch("/notifications/read-all");
};

// Delete notification
export const deleteNotification = (notificationId) => {
    return api.delete(`/notifications/${notificationId}`);
};

/* ===========================================
   Student Profile API
=========================================== */

// Get student profile
export const getStudentProfile = () => {
    return api.get("/students/me");
};

// Change password
export const changeStudentPassword = (data) => {
    return api.patch("/students/change-password", data);
};

// Upload avatar
export const uploadStudentAvatar = (formData) => {
    return api.post("/students/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

// Get progress summary
export const getStudentProgressSummary = () => {
    return api.get("/students/progress-summary");
};

// Get documents
export const getStudentDocuments = () => {
    return api.get("/students/documents");
};

// Upload document
export const uploadStudentDocument = (formData) => {
    return api.post("/students/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

// Delete document
export const deleteStudentDocument = (documentId) => {
    return api.delete(`/students/documents/${documentId}`);
};
