import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { sequenceService } from '../../services/sequenceService';

// Types
interface TaskCompletion {
  id: string;
  taskInstanceId: string;
  taskName: string;
  childId: string;
  dueDate: string;
  completedAt: string | null;
  approvedAt: string | null;
  famcoinsEarned: number;
  groupName: string;
}

interface ActiveSequence {
  id: string;
  childId: string;
  childName: string;
  period: '1week' | '2weeks' | '1month' | 'ongoing';
  startDate: string;
  endDate: string | null;
  budgetCurrency: number;
  budgetFamcoins: number;
  status: 'active' | 'paused' | 'completed';
  totalTasks: number;
  completedTasks: number;
  todaysTasks: TaskCompletion[];
}

interface SequencesState {
  activeSequences: ActiveSequence[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetchTime: string | null;
}

const initialState: SequencesState = {
  activeSequences: [],
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastFetchTime: null,
};

// Async thunks
export const fetchActiveSequences = createAsyncThunk(
  'sequences/fetchActive',
  async (parentId: string) => {
    const response = await sequenceService.getActiveSequences(parentId);
    return response;
  }
);

export const refreshSequences = createAsyncThunk(
  'sequences/refresh',
  async (parentId: string) => {
    const response = await sequenceService.getActiveSequences(parentId);
    return response;
  }
);

// Slice
const sequencesSlice = createSlice({
  name: 'sequences',
  initialState,
  reducers: {
    clearSequences: (state) => {
      state.activeSequences = [];
      state.lastFetchTime = null;
    },
    updateTaskCompletion: (state, action: PayloadAction<{
      sequenceId: string;
      taskCompletionId: string;
      updates: Partial<TaskCompletion>;
    }>) => {
      const { sequenceId, taskCompletionId, updates } = action.payload;
      const sequence = state.activeSequences.find(s => s.id === sequenceId);
      if (sequence) {
        const task = sequence.todaysTasks.find(t => t.id === taskCompletionId);
        if (task) {
          Object.assign(task, updates);
          // Update completed count if task was just completed
          if (updates.completedAt && !task.completedAt) {
            sequence.completedTasks += 1;
          }
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch sequences
      .addCase(fetchActiveSequences.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchActiveSequences.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeSequences = action.payload;
        state.lastFetchTime = new Date().toISOString();
      })
      .addCase(fetchActiveSequences.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch sequences';
      })
      // Refresh sequences
      .addCase(refreshSequences.pending, (state) => {
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase(refreshSequences.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.activeSequences = action.payload;
        state.lastFetchTime = new Date().toISOString();
      })
      .addCase(refreshSequences.rejected, (state, action) => {
        state.isRefreshing = false;
        state.error = action.error.message || 'Failed to refresh sequences';
      });
  },
});

// Actions
export const { clearSequences, updateTaskCompletion } = sequencesSlice.actions;

// Selectors
export const selectActiveSequences = (state: RootState) => state.sequences.activeSequences;
export const selectSequenceById = (sequenceId: string) => (state: RootState) => 
  state.sequences.activeSequences.find(s => s.id === sequenceId);
export const selectSequencesByChild = (childId: string) => (state: RootState) =>
  state.sequences.activeSequences.filter(s => s.childId === childId);
export const selectTodaysTasks = (state: RootState) =>
  state.sequences.activeSequences.flatMap(s => s.todaysTasks);
export const selectIsLoadingSequences = (state: RootState) => state.sequences.isLoading;
export const selectIsRefreshingSequences = (state: RootState) => state.sequences.isRefreshing;

export default sequencesSlice.reducer;