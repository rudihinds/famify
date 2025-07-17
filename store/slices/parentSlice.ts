import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { taskService } from "../../services/taskService";

interface ParentState {
  pendingReviewCount: number;
  isLoadingCount: boolean;
  error: string | null;
  lastCountUpdate: string | null;
}

const initialState: ParentState = {
  pendingReviewCount: 0,
  isLoadingCount: false,
  error: null,
  lastCountUpdate: null,
};

// Async thunk to fetch pending count
export const fetchPendingReviewCount = createAsyncThunk(
  "parent/fetchPendingCount",
  async (parentId: string) => {
    const count = await taskService.getPendingCompletionsCount(parentId);
    return count;
  }
);

const parentSlice = createSlice({
  name: "parent",
  initialState,
  reducers: {
    // Immediate optimistic update when child completes a task
    incrementPendingCount: (state) => {
      state.pendingReviewCount += 1;
      state.lastCountUpdate = new Date().toISOString();
    },
    // Immediate update when parent approves/rejects
    decrementPendingCount: (state) => {
      state.pendingReviewCount = Math.max(0, state.pendingReviewCount - 1);
      state.lastCountUpdate = new Date().toISOString();
    },
    // Set exact count (for sync)
    setPendingCount: (state, action: PayloadAction<number>) => {
      state.pendingReviewCount = action.payload;
      state.lastCountUpdate = new Date().toISOString();
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPendingReviewCount.pending, (state) => {
        state.isLoadingCount = true;
        state.error = null;
      })
      .addCase(fetchPendingReviewCount.fulfilled, (state, action) => {
        state.isLoadingCount = false;
        state.pendingReviewCount = action.payload;
        state.lastCountUpdate = new Date().toISOString();
      })
      .addCase(fetchPendingReviewCount.rejected, (state, action) => {
        state.isLoadingCount = false;
        state.error = action.error.message || "Failed to fetch pending count";
      });
  },
});

export const { 
  incrementPendingCount, 
  decrementPendingCount, 
  setPendingCount, 
  clearError 
} = parentSlice.actions;

export default parentSlice.reducer;