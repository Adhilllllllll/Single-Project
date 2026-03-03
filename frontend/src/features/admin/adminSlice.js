import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchAdminCounts } from "./adminApi";

export const loadAdminCounts = createAsyncThunk(
  "admin/loadCounts",
  async (_, thunkAPI) => {
    try {
      const res = await fetchAdminCounts();
      return res.data;
    } catch (e) {
      return thunkAPI.rejectWithValue("Failed to load counts");
    }
  }
);

const adminSlice = createSlice({
  name: "admin",
  initialState: { counts: null, loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(loadAdminCounts.pending, (s) => { s.loading = true; });
    b.addCase(loadAdminCounts.fulfilled, (s, a) => {
      s.loading = false; s.counts = a.payload;
    });
    b.addCase(loadAdminCounts.rejected, (s, a) => {
      s.loading = false; s.error = a.payload;
    });
  },
});

export default adminSlice.reducer;
