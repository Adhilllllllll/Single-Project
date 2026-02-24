import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
    getMyReviews,
    getSingleReview,
    acceptReview,
    rejectReview,
    getReviewerDashboard,
} from "./reviewerApi";

/* ===========================================
   INTERNAL HELPERS
=========================================== */

// Standard error extractor for thunks
const extractError = (err, fallback) =>
    err?.response?.data?.message || fallback;

// Standard loading state setter
const setLoading = (state, isLoading = true) => {
    state.loading = isLoading;
    if (isLoading) state.error = null;
};

// Update review status in list by ID
const updateReviewStatus = (state, reviewId, status) => {
    const index = state.reviews.findIndex(r => r._id === reviewId);
    if (index !== -1) {
        state.reviews[index].status = status;
    }
};

/* ===========================================
   ASYNC THUNKS
=========================================== */

// Fetch all reviews for reviewer
export const fetchReviewerReviews = createAsyncThunk(
    "reviewer/fetchReviewerReviews",
    async (_, thunkAPI) => {
        try {
            const res = await getMyReviews();
            return res.data || [];
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to fetch reviews"));
        }
    }
);

// Fetch single review details
export const fetchSingleReview = createAsyncThunk(
    "reviewer/fetchSingleReview",
    async (reviewId, thunkAPI) => {
        try {
            const res = await getSingleReview(reviewId);
            return res.data.review;
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to fetch review"));
        }
    }
);

// Accept review request
export const acceptReviewRequest = createAsyncThunk(
    "reviewer/acceptReviewRequest",
    async (reviewId, thunkAPI) => {
        try {
            await acceptReview(reviewId);
            return reviewId;
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to accept review"));
        }
    }
);

// Reject review request
export const rejectReviewRequest = createAsyncThunk(
    "reviewer/rejectReviewRequest",
    async ({ reviewId, reason }, thunkAPI) => {
        try {
            await rejectReview(reviewId, reason);
            return reviewId;
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to reject review"));
        }
    }
);

// Fetch dashboard data
export const fetchDashboardData = createAsyncThunk(
    "reviewer/fetchDashboardData",
    async (_, thunkAPI) => {
        try {
            const res = await getReviewerDashboard();
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(extractError(err, "Failed to fetch dashboard data"));
        }
    }
);

/* ===========================================
   SLICE
=========================================== */


const reviewerSlice = createSlice({
    name: "reviewer",
    initialState: {
        reviews: [],
        selectedReview: null,
        loading: false,
        error: null,
        // Dashboard state
        dashboard: {
            stats: {
                reviewsThisWeek: 0,
                pendingFeedback: 0,
                totalCompleted: 0,
                avgRating: 0,
            },
            upcomingReviews: [],
            pendingFeedbackList: [],
        },
        dashboardLoading: false,
        dashboardError: null,
    },
    reducers: {
        clearSelectedReview: (state) => {
            state.selectedReview = null;
        },
        clearReviewerState: (state) => {
            state.reviews = [];
            state.selectedReview = null;
            state.loading = false;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            /* ---------- FETCH REVIEWS ---------- */
            .addCase(fetchReviewerReviews.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchReviewerReviews.fulfilled, (state, action) => {
                state.loading = false;
                state.reviews = action.payload;
                state.error = null;
            })
            .addCase(fetchReviewerReviews.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            /* ---------- FETCH SINGLE REVIEW ---------- */
            .addCase(fetchSingleReview.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchSingleReview.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedReview = action.payload;
            })
            .addCase(fetchSingleReview.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            /* ---------- ACCEPT REVIEW ---------- */
            .addCase(acceptReviewRequest.pending, (state) => {
                state.loading = true;
            })
            .addCase(acceptReviewRequest.fulfilled, (state, action) => {
                state.loading = false;
                // Update review status in list
                const index = state.reviews.findIndex(r => r._id === action.payload);
                if (index !== -1) {
                    state.reviews[index].status = "accepted";
                }
            })
            .addCase(acceptReviewRequest.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            /* ---------- REJECT REVIEW ---------- */
            .addCase(rejectReviewRequest.pending, (state) => {
                state.loading = true;
            })
            .addCase(rejectReviewRequest.fulfilled, (state, action) => {
                state.loading = false;
                // Update review status in list
                const index = state.reviews.findIndex(r => r._id === action.payload);
                if (index !== -1) {
                    state.reviews[index].status = "rejected";
                }
            })
            .addCase(rejectReviewRequest.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            /* ---------- FETCH DASHBOARD DATA ---------- */
            .addCase(fetchDashboardData.pending, (state) => {
                state.dashboardLoading = true;
                state.dashboardError = null;
            })
            .addCase(fetchDashboardData.fulfilled, (state, action) => {
                state.dashboardLoading = false;
                state.dashboard = action.payload;
                state.dashboardError = null;
            })
            .addCase(fetchDashboardData.rejected, (state, action) => {
                state.dashboardLoading = false;
                state.dashboardError = action.payload;
            });
    },
});

export const { clearSelectedReview, clearReviewerState } = reviewerSlice.actions;
export default reviewerSlice.reducer;
