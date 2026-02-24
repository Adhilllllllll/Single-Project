import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getDashboardStats,
  getAssignedStudents,
  getAdvisorReviews,
  approveReviewScore,
  getReviewersAvailability,
} from "./advisorApi";
import { STUDENTS, REVIEWS, ANALYTICS } from "./mockData";

/* =============================================
   ASYNC THUNKS
============================================= */

// Fetch dashboard stats
export const fetchDashboardStats = createAsyncThunk(
  "advisor/fetchDashboardStats",
  async (_, thunkAPI) => {
    try {
      const res = await getDashboardStats();
     if (process.env.NODE_ENV === "development") {
  return ANALYTICS;
}
throw err;

    } catch (err) {
      // TODO: Replace with real API when backend ready
      console.warn("Using mock dashboard data:", err?.message);
      return ANALYTICS;
    }
  }
);

// Fetch assigned students (real data from DB)
export const fetchAssignedStudents = createAsyncThunk(
  "advisor/fetchAssignedStudents",
  async (_, thunkAPI) => {
    try {
      const res = await getAssignedStudents();
      return res.data?.students ?? [];
    } catch (err) {
      console.error("Fetch assigned students error:", err?.message);
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || "Failed to fetch students"
      );
    }
  }
);

// Fetch advisor reviews (real data from DB)
export const fetchAdvisorReviews = createAsyncThunk(
  "advisor/fetchAdvisorReviews",
  async (_, thunkAPI) => {
    try {
      const res = await getAdvisorReviews();
      return res.data?.reviews ?? [];
    } catch (err) {
      console.error("Fetch advisor reviews error:", err?.message);
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || "Failed to fetch reviews"
      );
    }
  }
);

// Approve a pending score
export const approveScore = createAsyncThunk(
  "advisor/approveScore",
  async (reviewId, thunkAPI) => {
    try {
      await approveReviewScore(reviewId);
      return reviewId;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || "Failed to approve score"
      );
    }
  }
);

// Fetch reviewers availability (real data from DB)
export const fetchReviewersAvailability = createAsyncThunk(
  "advisor/fetchReviewersAvailability",
  async (_, thunkAPI) => {
    try {
      const res = await getReviewersAvailability();
      return res.data?.reviewers ?? [];
    } catch (err) {
      console.error("Fetch reviewers availability error:", err?.message);
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || "Failed to fetch reviewers"
      );
    }
  }
);

/* =============================================
   SLICE
============================================= */

const advisorSlice = createSlice({
  name: "advisor",
  initialState: {
    // Dashboard stats
    stats: {
      totalStudents: 0,
      avgProgress: 0,
      reviewsThisWeek: 0,
      pendingScores: 0,
    },
    // Data
    students: [],
    reviews: [],
    reviewers: [],
    // Loading states
    loading: {
      stats: false,
      students: false,
      reviews: false,
      reviewers: false,
    },
    // Error states
    error: null,
  },
  reducers: {
    clearAdvisorState: (state) => {
      state.stats = { totalStudents: 0, avgProgress: 0, reviewsThisWeek: 0, pendingScores: 0 };
      state.students = [];
      state.reviews = [];
      state.reviewers = [];
      state.loading = { stats: false, students: false, reviews: false, reviewers: false };
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ---------- DASHBOARD STATS ---------- */
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading.stats = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error = action.error.message;
      })

      /* ---------- STUDENTS ---------- */
      .addCase(fetchAssignedStudents.pending, (state) => {
        state.loading.students = true;
        state.error = null;
      })
      .addCase(fetchAssignedStudents.fulfilled, (state, action) => {
        state.loading.students = false;
        state.students = action.payload;
      })
      .addCase(fetchAssignedStudents.rejected, (state, action) => {
        state.loading.students = false;
        state.error = action.error.message;
      })

      /* ---------- REVIEWS ---------- */
      .addCase(fetchAdvisorReviews.pending, (state) => {
        state.loading.reviews = true;
        state.error = null;
      })
      .addCase(fetchAdvisorReviews.fulfilled, (state, action) => {
        state.loading.reviews = false;
        state.reviews = action.payload;
      })
      .addCase(fetchAdvisorReviews.rejected, (state, action) => {
        state.loading.reviews = false;
        state.error = action.error.message;
      })

      /* ---------- APPROVE SCORE ---------- */
      .addCase(approveScore.fulfilled, (state, action) => {
        // Remove approved review from pending list
        state.reviews = state.reviews.filter(r => r._id !== action.payload);
        state.stats.pendingScores = Math.max(0, state.stats.pendingScores - 1);
      })

      /* ---------- REVIEWERS AVAILABILITY ---------- */
      .addCase(fetchReviewersAvailability.pending, (state) => {
        state.loading.reviewers = true;
      })
      .addCase(fetchReviewersAvailability.fulfilled, (state, action) => {
        state.loading.reviewers = false;
        state.reviewers = action.payload;
      })
      .addCase(fetchReviewersAvailability.rejected, (state, action) => {
        state.loading.reviewers = false;
        state.error = action.error.message;
      });
  },
});

export const { clearAdvisorState } = advisorSlice.actions;
export default advisorSlice.reducer;
