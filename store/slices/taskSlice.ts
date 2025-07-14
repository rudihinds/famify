import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { taskService } from '../../services/taskService';

// Interfaces
export interface TaskCompletionView {
  id: string; // task_completion.id
  taskInstanceId: string;
  taskName: string;
  customDescription?: string;
  groupName: string;
  famcoinValue: number;
  photoProofRequired: boolean;
  effortScore: number;
  status: 'pending' | 'child_completed' | 'parent_approved' | 'parent_rejected' | 'excused';
  photoUrl?: string;
  completedAt?: string;
  rejectionReason?: string;
  categoryIcon: string;
  categoryColor: string;
}

export interface OfflineTaskAction {
  id: string;
  type: 'complete' | 'photo_upload';
  taskCompletionId: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

export interface TaskState {
  dailyTasks: TaskCompletionView[];
  selectedDate: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  photoUploadProgress: { [taskId: string]: number };
  offlineQueue: OfflineTaskAction[];
}

// Helper to get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Initial state
const initialState: TaskState = {
  dailyTasks: [],
  selectedDate: getTodayString(),
  isLoading: false,
  isRefreshing: false,
  error: null,
  photoUploadProgress: {},
  offlineQueue: [],
};

// Async thunks
export const fetchDailyTasks = createAsyncThunk(
  'tasks/fetchDaily',
  async ({ childId, date }: { childId: string; date: string }) => {
    const tasks = await taskService.getDailyTasks(childId, date);
    return tasks;
  }
);

export const markTaskComplete = createAsyncThunk(
  'tasks/markComplete',
  async (taskCompletionId: string, { getState, dispatch }) => {
    try {
      await taskService.markTaskComplete(taskCompletionId);
      return { taskCompletionId, success: true };
    } catch (error) {
      // Queue for offline sync if network error
      const offlineAction: OfflineTaskAction = {
        id: `offline_${Date.now()}_${Math.random()}`,
        type: 'complete',
        taskCompletionId,
        payload: { completedAt: new Date().toISOString() },
        timestamp: Date.now(),
        retryCount: 0,
      };
      dispatch(addOfflineAction(offlineAction));
      throw error;
    }
  }
);

export const uploadTaskPhoto = createAsyncThunk(
  'tasks/uploadPhoto',
  async (
    { taskCompletionId, photoUri }: { taskCompletionId: string; photoUri: string },
    { dispatch }
  ) => {
    try {
      // Convert URI to Blob (will be implemented in component)
      const response = await fetch(photoUri);
      const blob = await response.blob();
      
      // Upload with progress tracking
      const photoUrl = await taskService.uploadTaskPhoto(
        taskCompletionId,
        blob,
        (progress) => {
          dispatch(setPhotoUploadProgress({ taskCompletionId, progress }));
        }
      );
      
      return { taskCompletionId, photoUrl };
    } catch (error) {
      // Queue for offline sync if network error
      const offlineAction: OfflineTaskAction = {
        id: `offline_${Date.now()}_${Math.random()}`,
        type: 'photo_upload',
        taskCompletionId,
        payload: { photoUri },
        timestamp: Date.now(),
        retryCount: 0,
      };
      dispatch(addOfflineAction(offlineAction));
      throw error;
    }
  }
);

export const syncOfflineActions = createAsyncThunk(
  'tasks/syncOffline',
  async (_, { getState, dispatch }) => {
    const state = getState() as { tasks: TaskState };
    const { offlineQueue } = state.tasks;
    
    const results = [];
    for (const action of offlineQueue) {
      try {
        if (action.type === 'complete') {
          await taskService.markTaskComplete(action.taskCompletionId);
          dispatch(removeOfflineAction(action.id));
          results.push({ actionId: action.id, success: true });
        } else if (action.type === 'photo_upload') {
          const response = await fetch(action.payload.photoUri);
          const blob = await response.blob();
          await taskService.uploadTaskPhoto(action.taskCompletionId, blob);
          dispatch(removeOfflineAction(action.id));
          results.push({ actionId: action.id, success: true });
        }
      } catch (error) {
        // Increment retry count
        dispatch(incrementOfflineActionRetry(action.id));
        results.push({ actionId: action.id, success: false, error });
      }
    }
    
    return results;
  }
);

// Slice
const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setDailyTasks: (state, action: PayloadAction<TaskCompletionView[]>) => {
      state.dailyTasks = action.payload;
    },
    updateTaskStatus: (state, action: PayloadAction<{ 
      taskCompletionId: string; 
      status: TaskCompletionView['status'];
      completedAt?: string;
    }>) => {
      const task = state.dailyTasks.find(t => t.id === action.payload.taskCompletionId);
      if (task) {
        task.status = action.payload.status;
        if (action.payload.completedAt) {
          task.completedAt = action.payload.completedAt;
        }
      }
    },
    setPhotoUploadProgress: (state, action: PayloadAction<{
      taskCompletionId: string;
      progress: number;
    }>) => {
      state.photoUploadProgress[action.payload.taskCompletionId] = action.payload.progress;
    },
    clearPhotoUploadProgress: (state, action: PayloadAction<string>) => {
      delete state.photoUploadProgress[action.payload];
    },
    addOfflineAction: (state, action: PayloadAction<OfflineTaskAction>) => {
      state.offlineQueue.push(action.payload);
    },
    removeOfflineAction: (state, action: PayloadAction<string>) => {
      state.offlineQueue = state.offlineQueue.filter(a => a.id !== action.payload);
    },
    incrementOfflineActionRetry: (state, action: PayloadAction<string>) => {
      const offlineAction = state.offlineQueue.find(a => a.id === action.payload);
      if (offlineAction) {
        offlineAction.retryCount += 1;
      }
    },
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.isRefreshing = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetTaskState: () => initialState,
  },
  extraReducers: (builder) => {
    // Fetch daily tasks
    builder
      .addCase(fetchDailyTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDailyTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dailyTasks = action.payload;
      })
      .addCase(fetchDailyTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch tasks';
      });
    
    // Mark task complete
    builder
      .addCase(markTaskComplete.pending, (state, action) => {
        // Optimistic update
        const task = state.dailyTasks.find(t => t.id === action.meta.arg);
        if (task) {
          task.status = 'child_completed';
          task.completedAt = new Date().toISOString();
        }
      })
      .addCase(markTaskComplete.fulfilled, (state) => {
        // Success - optimistic update already applied
      })
      .addCase(markTaskComplete.rejected, (state, action) => {
        // Revert optimistic update
        const task = state.dailyTasks.find(t => t.id === action.meta.arg);
        if (task) {
          task.status = 'pending';
          task.completedAt = undefined;
        }
      });
    
    // Upload photo
    builder
      .addCase(uploadTaskPhoto.fulfilled, (state, action) => {
        const task = state.dailyTasks.find(t => t.id === action.payload.taskCompletionId);
        if (task) {
          task.photoUrl = action.payload.photoUrl;
        }
        delete state.photoUploadProgress[action.payload.taskCompletionId];
      })
      .addCase(uploadTaskPhoto.rejected, (state, action) => {
        delete state.photoUploadProgress[action.meta.arg.taskCompletionId];
      });
    
    // Sync offline actions
    builder
      .addCase(syncOfflineActions.fulfilled, (state, action) => {
        // Results are handled by individual removeOfflineAction calls
      });
  },
});

// Export actions
export const {
  setDailyTasks,
  updateTaskStatus,
  setPhotoUploadProgress,
  clearPhotoUploadProgress,
  addOfflineAction,
  removeOfflineAction,
  incrementOfflineActionRetry,
  setSelectedDate,
  setLoading,
  setRefreshing,
  setError,
  resetTaskState,
} = taskSlice.actions;

// Export reducer
export default taskSlice.reducer;