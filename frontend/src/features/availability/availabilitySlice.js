import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getAllAvailability,
  getMyAvailability,
  createAvailability,
  deleteAvailability,
  getMyStatus,
  updateStatus,
  createBreak,
} from "./availabilityApi";

/* ===========================================
   INTERNAL HELPERS
=========================================== */

// Standard error extractor for thunks
const extractError = (err, fallback) =>
  err?.response?.data?.message || fallback;

// Standard pending reducer
const setPending = (state) => {
  state.loading = true;
  state.error = null;
};

// Standard rejected reducer
const setRejected = (state, action) => {
  state.loading = false;
  state.error = action.payload;
};

// Standard fulfilled base (resets loading and error)
const setFulfilled = (state) => {
  state.loading = false;
  state.error = null;
};

/* ===========================================
   ASYNC THUNKS
=========================================== */

// Fetch all availability (slots + breaks)
export const fetchAllAvailability = createAsyncThunk(
  "availability/fetchAllAvailability",
  async (_, thunkAPI) => {
    try {
      const res = await getAllAvailability();
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(extractError(err, "Failed to load availability"));
    }
  }
);

// Fetch my availability (legacy - slots only)
export const fetchMyAvailability = createAsyncThunk(
  "availability/fetchMyAvailability",
  async (_, thunkAPI) => {
    try {
      const res = await getMyAvailability();
      return res?.data ?? [];
    } catch (err) {
      return thunkAPI.rejectWithValue(extractError(err, "Failed to load availability"));
    }
  }
);

// Add availability slot
export const addAvailability = createAsyncThunk(
  "availability/addAvailability",
  async (data, thunkAPI) => {
    try {
      const res = await createAvailability(data);
      return res.data.availability;
    } catch (err) {
      return thunkAPI.rejectWithValue(extractError(err, "Failed to add availability"));
    }
  }
);

// Remove availability slot or break
export const removeAvailability = createAsyncThunk(
  "availability/removeAvailability",
  async (id, thunkAPI) => {
    try {
      await deleteAvailability(id);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue(extractError(err, "Failed to delete availability"));
    }
  }
);

// Fetch status
export const fetchMyStatus = createAsyncThunk(
  "availability/fetchMyStatus",
  async (_, thunkAPI) => {
    try {
      const res = await getMyStatus();
      return res.data.status;
    } catch (err) {
      return thunkAPI.rejectWithValue(extractError(err, "Failed to load status"));
    }
  }
);

// Update status
export const updateMyStatus = createAsyncThunk(
  "availability/updateMyStatus",
  async (status, thunkAPI) => {
    try {
      await updateStatus(status);
      return status;
    } catch (err) {
      return thunkAPI.rejectWithValue(extractError(err, "Failed to update status"));
    }
  }
);

// Add break block
export const addBreak = createAsyncThunk(
  "availability/addBreak",
  async (data, thunkAPI) => {
    try {
      const res = await createBreak(data);
      return res.data.break;
    } catch (err) {
      return thunkAPI.rejectWithValue(extractError(err, "Failed to add break"));
    }
  }
);


/* ===========================================
   SLICE
=========================================== */

const availabilitySlice = createSlice({
  name: "availability",
  initialState: {
    list: [],           // Availability slots
    breaks: [],         // Break blocks
    status: "available", // Current status
    loading: false,
    error: null,
  },
  reducers: {
    clearAvailabilityState: (state) => {
      state.list = [];
      state.breaks = [];
      state.status = "available";
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ---------- FETCH ALL ---------- */
      .addCase(fetchAllAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllAvailability.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.availability || [];
        state.breaks = action.payload.breaks || [];
        state.error = null;
      })
      .addCase(fetchAllAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ---------- FETCH MY AVAILABILITY (legacy) ---------- */
      .addCase(fetchMyAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyAvailability.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchMyAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ---------- ADD SLOT ---------- */
      .addCase(addAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addAvailability.fulfilled, (state, action) => {
        state.loading = false;
        state.list.push(action.payload);
        state.error = null;
      })
      .addCase(addAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ---------- DELETE SLOT/BREAK ---------- */
      .addCase(removeAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeAvailability.fulfilled, (state, action) => {
        state.loading = false;
        state.list = state.list.filter((slot) => slot._id !== action.payload);
        state.breaks = state.breaks.filter((b) => b._id !== action.payload);
        state.error = null;
      })
      .addCase(removeAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ---------- FETCH STATUS ---------- */
      .addCase(fetchMyStatus.fulfilled, (state, action) => {
        state.status = action.payload;
      })

      /* ---------- UPDATE STATUS ---------- */
      .addCase(updateMyStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateMyStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
      })
      .addCase(updateMyStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ---------- ADD BREAK ---------- */
      .addCase(addBreak.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addBreak.fulfilled, (state, action) => {
        state.loading = false;
        state.breaks.push(action.payload);
        state.error = null;
      })
      .addCase(addBreak.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAvailabilityState } = availabilitySlice.actions;
export default availabilitySlice.reducer;
