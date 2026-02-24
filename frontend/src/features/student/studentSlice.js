import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
    getUpcomingReviews,
    getReviewHistory,
    getReviewReport,
    getStudentProgress,
    getStudentTasks,
    uploadTaskAttachment,
    getStudentWorkshops,
    markWorkshopAttendance,
    getSyllabusWeeks,
    getStudentChecklist,
    toggleChecklistItem,
    uploadChecklistAttachment,
    uploadDocument,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from "./studentApi";

/* ===========================================
   INTERNAL HELPERS
=========================================== */

// Standard error extractor for thunks
const extractError = (err, fallback) =>
    err?.response?.data?.message || fallback;

/* ===========================================
   ASYNC THUNKS
=========================================== */

// Fetch upcoming reviews
export const fetchUpcomingReviews = createAsyncThunk(
    "student/fetchUpcomingReviews",
    async (_, thunkAPI) => {
        try {
            const res = await getUpcomingReviews();
            return {
                upcomingReviews: res.data.upcomingReviews || [],
                nextExpectedReview: res.data.nextExpectedReview || null,
            };
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to fetch upcoming reviews"));
        }
    }
);

// Fetch review history
export const fetchReviewHistory = createAsyncThunk(
    "student/fetchReviewHistory",
    async (_, thunkAPI) => {
        try {
            const res = await getReviewHistory();
            return res.data.reviewHistory || [];
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to fetch review history"));
        }
    }
);

// Fetch single review report
export const fetchReviewReport = createAsyncThunk(
    "student/fetchReviewReport",
    async (reviewId, thunkAPI) => {
        try {
            const res = await getReviewReport(reviewId);
            return res.data.report;
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to fetch review report"));
        }
    }
);

// Fetch student progress data
export const fetchStudentProgress = createAsyncThunk(
    "student/fetchStudentProgress",
    async (_, thunkAPI) => {
        try {
            const res = await getStudentProgress();
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to fetch progress data"));
        }
    }
);

// Fetch student tasks
export const fetchStudentTasks = createAsyncThunk(
    "student/fetchStudentTasks",
    async (_, thunkAPI) => {
        try {
            const res = await getStudentTasks();
            return res.data.tasks || [];
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to fetch tasks"));
        }
    }
);

// Upload task attachment
export const uploadTaskFile = createAsyncThunk(
    "student/uploadTaskFile",
    async ({ taskId, formData }, thunkAPI) => {
        try {
            const res = await uploadTaskAttachment(taskId, formData);
            return res.data.task;
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to upload attachment"));
        }
    }
);

// Fetch student workshops
export const fetchStudentWorkshops = createAsyncThunk(
    "student/fetchStudentWorkshops",
    async (_, thunkAPI) => {
        try {
            const res = await getStudentWorkshops();
            return res.data.workshops || [];
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to fetch workshops"));
        }
    }
);

// Mark workshop attendance (join)
export const joinWorkshop = createAsyncThunk(
    "student/joinWorkshop",
    async (workshopId, thunkAPI) => {
        try {
            const res = await markWorkshopAttendance(workshopId);
            return { workshopId, workshop: res.data.workshop };
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to join workshop"));
        }
    }
);

// Fetch syllabus weeks
export const fetchSyllabus = createAsyncThunk(
    "student/fetchSyllabus",
    async (_, thunkAPI) => {
        try {
            const res = await getSyllabusWeeks();
            return res.data.weeks || [];
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to fetch syllabus"));
        }
    }
);

// Fetch student checklist
export const fetchChecklist = createAsyncThunk(
    "student/fetchChecklist",
    async (_, thunkAPI) => {
        try {
            const res = await getStudentChecklist();
            return res.data.checklist || [];
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to fetch checklist"));
        }
    }
);

// Toggle checklist item
export const toggleChecklistItemThunk = createAsyncThunk(
    "student/toggleChecklistItem",
    async (itemId, thunkAPI) => {
        try {
            const res = await toggleChecklistItem(itemId);
            return res.data.item;
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to update item"));
        }
    }
);

// Upload checklist attachment
export const uploadChecklistFile = createAsyncThunk(
    "student/uploadChecklistFile",
    async ({ itemId, formData }, thunkAPI) => {
        try {
            const res = await uploadChecklistAttachment(itemId, formData);
            return res.data.item;
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to upload attachment"));
        }
    }
);

// Upload additional document
export const uploadAdditionalDocument = createAsyncThunk(
    "student/uploadAdditionalDocument",
    async (formData, thunkAPI) => {
        try {
            const res = await uploadDocument(formData);
            return res.data.document;
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to upload document"));
        }
    }
);

// Fetch notifications
export const fetchNotifications = createAsyncThunk(
    "student/fetchNotifications",
    async (_, thunkAPI) => {
        try {
            const res = await getNotifications();
            return {
                notifications: res.data.notifications || [],
                unreadCount: res.data.unreadCount || 0,
            };
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to fetch notifications"));
        }
    }
);

// Mark notification as read
export const markNotificationRead = createAsyncThunk(
    "student/markNotificationRead",
    async (notificationId, thunkAPI) => {
        try {
            await markNotificationAsRead(notificationId);
            return notificationId;
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to mark as read"));
        }
    }
);

// Mark all notifications as read
export const markAllNotificationsRead = createAsyncThunk(
    "student/markAllNotificationsRead",
    async (_, thunkAPI) => {
        try {
            await markAllNotificationsAsRead();
            return true;
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to mark all as read"));
        }
    }
);

/* ===========================================
   SLICE
=========================================== */

const initialState = {
    profile: null,
    upcomingReviews: [],
    nextExpectedReview: null,
    reviewHistory: [],
    selectedReport: null,
    // Progress page state
    progress: {
        stats: {
            overallProgress: 0,
            milestonesCompleted: 0,
            totalMilestones: 0,
            avgScore: 0,
        },
        weeklyProgress: [],
        milestones: [],
        improvementAreas: [],
    },
    // Tasks page state
    tasks: [],
    workshops: [],
    // Study Materials page state
    syllabus: [],
    checklist: [],
    // Notifications page state
    notifications: [],
    unreadCount: 0,
    loading: false,
    upcomingLoading: false,
    historyLoading: false,
    reportLoading: false,
    progressLoading: false,
    tasksLoading: false,
    workshopsLoading: false,
    uploadLoading: false,
    syllabusLoading: false,
    checklistLoading: false,
    notificationsLoading: false,
    error: null,
};

const studentSlice = createSlice({
    name: "student",
    initialState,
    reducers: {
        clearSelectedReport: (state) => {
            state.selectedReport = null;
        },
        clearStudentState: (state) => {
            state.upcomingReviews = [];
            state.reviewHistory = [];
            state.selectedReport = null;
            state.tasks = [];
            state.workshops = [];
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            /* ---------- FETCH UPCOMING REVIEWS ---------- */
            .addCase(fetchUpcomingReviews.pending, (state) => {
                state.upcomingLoading = true;
                state.error = null;
            })
            .addCase(fetchUpcomingReviews.fulfilled, (state, action) => {
                state.upcomingLoading = false;
                state.upcomingReviews = action.payload.upcomingReviews;
                state.nextExpectedReview = action.payload.nextExpectedReview;
            })
            .addCase(fetchUpcomingReviews.rejected, (state, action) => {
                state.upcomingLoading = false;
                state.error = action.payload;
            })

            /* ---------- FETCH REVIEW HISTORY ---------- */
            .addCase(fetchReviewHistory.pending, (state) => {
                state.historyLoading = true;
                state.error = null;
            })
            .addCase(fetchReviewHistory.fulfilled, (state, action) => {
                state.historyLoading = false;
                state.reviewHistory = action.payload;
            })
            .addCase(fetchReviewHistory.rejected, (state, action) => {
                state.historyLoading = false;
                state.error = action.payload;
            })

            /* ---------- FETCH REVIEW REPORT ---------- */
            .addCase(fetchReviewReport.pending, (state) => {
                state.reportLoading = true;
                state.error = null;
            })
            .addCase(fetchReviewReport.fulfilled, (state, action) => {
                state.reportLoading = false;
                state.selectedReport = action.payload;
            })
            .addCase(fetchReviewReport.rejected, (state, action) => {
                state.reportLoading = false;
                state.error = action.payload;
            })

            /* ---------- FETCH STUDENT PROGRESS ---------- */
            .addCase(fetchStudentProgress.pending, (state) => {
                state.progressLoading = true;
                state.error = null;
            })
            .addCase(fetchStudentProgress.fulfilled, (state, action) => {
                state.progressLoading = false;
                state.progress = action.payload;
            })
            .addCase(fetchStudentProgress.rejected, (state, action) => {
                state.progressLoading = false;
                state.error = action.payload;
            })

            /* ---------- FETCH STUDENT TASKS ---------- */
            .addCase(fetchStudentTasks.pending, (state) => {
                state.tasksLoading = true;
                state.error = null;
            })
            .addCase(fetchStudentTasks.fulfilled, (state, action) => {
                state.tasksLoading = false;
                state.tasks = action.payload;
            })
            .addCase(fetchStudentTasks.rejected, (state, action) => {
                state.tasksLoading = false;
                state.error = action.payload;
            })

            /* ---------- UPLOAD TASK FILE ---------- */
            .addCase(uploadTaskFile.pending, (state) => {
                state.uploadLoading = true;
                state.error = null;
            })
            .addCase(uploadTaskFile.fulfilled, (state, action) => {
                state.uploadLoading = false;
                // Update task in list
                const index = state.tasks.findIndex(t => t.id === action.payload._id);
                if (index !== -1) {
                    state.tasks[index].status = "Completed";
                    state.tasks[index].hasAttachment = true;
                }
            })
            .addCase(uploadTaskFile.rejected, (state, action) => {
                state.uploadLoading = false;
                state.error = action.payload;
            })

            /* ---------- FETCH STUDENT WORKSHOPS ---------- */
            .addCase(fetchStudentWorkshops.pending, (state) => {
                state.workshopsLoading = true;
                state.error = null;
            })
            .addCase(fetchStudentWorkshops.fulfilled, (state, action) => {
                state.workshopsLoading = false;
                state.workshops = action.payload;
            })
            .addCase(fetchStudentWorkshops.rejected, (state, action) => {
                state.workshopsLoading = false;
                state.error = action.payload;
            })

            /* ---------- JOIN WORKSHOP ---------- */
            .addCase(joinWorkshop.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(joinWorkshop.fulfilled, (state, action) => {
                state.loading = false;
                // Update workshop attendance in list
                const index = state.workshops.findIndex(w => w.id === action.payload.workshopId);
                if (index !== -1) {
                    state.workshops[index].attendance = "Attended";
                }
            })
            .addCase(joinWorkshop.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            /* ---------- FETCH SYLLABUS ---------- */
            .addCase(fetchSyllabus.pending, (state) => {
                state.syllabusLoading = true;
                state.error = null;
            })
            .addCase(fetchSyllabus.fulfilled, (state, action) => {
                state.syllabusLoading = false;
                state.syllabus = action.payload;
            })
            .addCase(fetchSyllabus.rejected, (state, action) => {
                state.syllabusLoading = false;
                state.error = action.payload;
            })

            /* ---------- FETCH CHECKLIST ---------- */
            .addCase(fetchChecklist.pending, (state) => {
                state.checklistLoading = true;
                state.error = null;
            })
            .addCase(fetchChecklist.fulfilled, (state, action) => {
                state.checklistLoading = false;
                state.checklist = action.payload;
            })
            .addCase(fetchChecklist.rejected, (state, action) => {
                state.checklistLoading = false;
                state.error = action.payload;
            })

            /* ---------- TOGGLE CHECKLIST ITEM ---------- */
            .addCase(toggleChecklistItemThunk.fulfilled, (state, action) => {
                const index = state.checklist.findIndex(i => i.id === action.payload.id);
                if (index !== -1) {
                    state.checklist[index] = action.payload;
                }
            })

            /* ---------- UPLOAD CHECKLIST FILE ---------- */
            .addCase(uploadChecklistFile.pending, (state) => {
                state.uploadLoading = true;
            })
            .addCase(uploadChecklistFile.fulfilled, (state, action) => {
                state.uploadLoading = false;
                const index = state.checklist.findIndex(i => i.id === action.payload.id);
                if (index !== -1) {
                    state.checklist[index] = action.payload;
                }
            })
            .addCase(uploadChecklistFile.rejected, (state, action) => {
                state.uploadLoading = false;
                state.error = action.payload;
            })

            /* ---------- UPLOAD ADDITIONAL DOCUMENT ---------- */
            .addCase(uploadAdditionalDocument.pending, (state) => {
                state.uploadLoading = true;
            })
            .addCase(uploadAdditionalDocument.fulfilled, (state) => {
                state.uploadLoading = false;
            })
            .addCase(uploadAdditionalDocument.rejected, (state, action) => {
                state.uploadLoading = false;
                state.error = action.payload;
            })

            /* ---------- FETCH NOTIFICATIONS ---------- */
            .addCase(fetchNotifications.pending, (state) => {
                state.notificationsLoading = true;
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.notificationsLoading = false;
                state.notifications = action.payload.notifications;
                state.unreadCount = action.payload.unreadCount;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.notificationsLoading = false;
                state.error = action.payload;
            })

            /* ---------- MARK NOTIFICATION READ ---------- */
            .addCase(markNotificationRead.fulfilled, (state, action) => {
                const index = state.notifications.findIndex(n => n.id === action.payload);
                if (index !== -1) {
                    state.notifications[index].isRead = true;
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })

            /* ---------- MARK ALL NOTIFICATIONS READ ---------- */
            .addCase(markAllNotificationsRead.fulfilled, (state) => {
                state.notifications = state.notifications.map(n => ({ ...n, isRead: true }));
                state.unreadCount = 0;
            });
    },
});

export const { clearSelectedReport, clearStudentState } = studentSlice.actions;
export default studentSlice.reducer;
