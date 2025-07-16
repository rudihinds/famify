import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { taskService } from '../../services/taskService';
import { transactionService } from '../../services/transactionService';
import { updateBalance } from './childSlice';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

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
  dueDate: string;
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
  todayTasks: TaskCompletionView[]; // Always contains today's tasks for home screen
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
  todayTasks: [],
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

export const fetchTodayTasks = createAsyncThunk(
  'tasks/fetchToday',
  async ({ childId }: { childId: string }) => {
    const today = getTodayString();
    const tasks = await taskService.getDailyTasks(childId, today);
    return tasks;
  }
);

export const markTaskComplete = createAsyncThunk(
  'tasks/markComplete',
  async (taskCompletionId: string, { getState, dispatch }) => {
    try {
      // Get task details to find FAMCOIN value
      const state = getState() as any;
      const task = state.tasks.dailyTasks.find((t: TaskCompletionView) => t.id === taskCompletionId);
      
      if (!task) {
        throw new Error('Task not found');
      }

      // Get child ID from state
      const childId = state.child.profile?.id;
      if (!childId) {
        throw new Error('Child profile not found');
      }

      // Complete task with transaction
      const result = await transactionService.completeTaskWithTransaction(
        taskCompletionId,
        childId,
        task.famcoinValue,
        task.photoUrl
      );

      // Note: We don't update the balance here because FAMCOINs are only earned
      // after parent approval. We'll show pending earnings in the UI instead.
      
      // Calculate and dispatch pending earnings update
      const pendingEarnings = await transactionService.getPendingEarnings(childId);
      dispatch(updateBalance({ 
        balance: state.child.currentBalance, 
        pendingEarnings 
      }));

      return { 
        taskCompletionId, 
        success: true,
        pendingEarnings
      };
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
      console.log('[uploadTaskPhoto thunk] Starting with URI:', photoUri);
      console.log('[uploadTaskPhoto thunk] URI starts with:', photoUri.substring(0, 50));
      
      // Read file as base64 using FileSystem
      console.log('[uploadTaskPhoto thunk] Reading file as base64...');
      const base64String = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('[uploadTaskPhoto thunk] Base64 string created:', {
        length: base64String.length,
        firstChars: base64String.substring(0, 50),
        lastChars: base64String.substring(base64String.length - 50)
      });
      
      // Convert base64 to ArrayBuffer
      console.log('[uploadTaskPhoto thunk] Converting base64 to ArrayBuffer...');
      const arrayBuffer = decode(base64String);
      
      console.log('[uploadTaskPhoto thunk] ArrayBuffer created:', {
        byteLength: arrayBuffer.byteLength,
        constructor: arrayBuffer.constructor.name
      });
      
      // Validate ArrayBuffer
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.error('[uploadTaskPhoto thunk] ArrayBuffer validation failed - empty buffer');
        throw new Error('Invalid photo data - ArrayBuffer is empty');
      }
      
      console.log('[uploadTaskPhoto thunk] ArrayBuffer validation passed, proceeding to upload...');
      
      // Upload with progress tracking
      const photoUrl = await taskService.uploadTaskPhoto(
        taskCompletionId,
        arrayBuffer,
        (progress) => {
          dispatch(setPhotoUploadProgress({ taskCompletionId, progress }));
        }
      );
      
      return { taskCompletionId, photoUrl };
    } catch (error) {
      console.error('[uploadTaskPhoto thunk] Error:', error);
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
          const base64String = await FileSystem.readAsStringAsync(action.payload.photoUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const arrayBuffer = decode(base64String);
          await taskService.uploadTaskPhoto(action.taskCompletionId, arrayBuffer);
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
    
    // Fetch today's tasks
    builder
      .addCase(fetchTodayTasks.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchTodayTasks.fulfilled, (state, action) => {
        state.todayTasks = action.payload;
      })
      .addCase(fetchTodayTasks.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch today\'s tasks';
      });
    
    // Mark task complete
    builder
      .addCase(markTaskComplete.pending, (state, action) => {
        // Optimistic update for dailyTasks
        const task = state.dailyTasks.find(t => t.id === action.meta.arg);
        if (task) {
          task.status = 'child_completed';
          task.completedAt = new Date().toISOString();
        }
        
        // Also update todayTasks if the task is from today
        const todayTask = state.todayTasks.find(t => t.id === action.meta.arg);
        if (todayTask) {
          todayTask.status = 'child_completed';
          todayTask.completedAt = new Date().toISOString();
        }
      })
      .addCase(markTaskComplete.fulfilled, (state) => {
        // Success - optimistic update already applied
      })
      .addCase(markTaskComplete.rejected, (state, action) => {
        // Revert optimistic update for dailyTasks
        const task = state.dailyTasks.find(t => t.id === action.meta.arg);
        if (task) {
          task.status = 'pending';
          task.completedAt = undefined;
        }
        
        // Revert optimistic update for todayTasks
        const todayTask = state.todayTasks.find(t => t.id === action.meta.arg);
        if (todayTask) {
          todayTask.status = 'pending';
          todayTask.completedAt = undefined;
        }
      });
    
    // Upload photo
    builder
      .addCase(uploadTaskPhoto.fulfilled, (state, action) => {
        const task = state.dailyTasks.find(t => t.id === action.payload.taskCompletionId);
        if (task) {
          task.photoUrl = action.payload.photoUrl;
        }
        
        // Also update todayTasks if the task is from today
        const todayTask = state.todayTasks.find(t => t.id === action.payload.taskCompletionId);
        if (todayTask) {
          todayTask.photoUrl = action.payload.photoUrl;
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