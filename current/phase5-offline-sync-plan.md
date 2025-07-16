# Phase 5: Offline Support and Sync - Detailed Execution Plan

## Overview
This phase implements comprehensive offline functionality allowing children to complete tasks and parents to approve them without network connectivity. It includes intelligent sync conflict resolution, background synchronization, and robust error recovery mechanisms.

## Implementation Steps

### 1. Offline Storage Architecture

#### 1.1 Redux Persist Configuration Enhancement
**File**: `/store/persistConfig.ts` (new)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMigrate, REHYDRATE } from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';

// Migrations for offline data structure
const migrations = {
  0: (state: any) => state,
  1: (state: any) => ({
    ...state,
    offline: {
      queue: [],
      lastSyncTimestamp: null,
      syncErrors: [],
    },
  }),
};

export const offlinePersistConfig = {
  key: 'offline',
  storage: AsyncStorage,
  version: 1,
  migrate: createMigrate(migrations, { debug: true }),
  stateReconciler: autoMergeLevel2,
  whitelist: ['queue', 'syncErrors'], // Don't persist connection state
};

export const tasksPersistConfig = {
  key: 'tasks',
  storage: AsyncStorage,
  whitelist: ['dailyTasks', 'offlineQueue', 'photoUploadProgress'],
  blacklist: ['isLoading', 'error'], // Don't persist temporary states
};

export const approvalsPersistConfig = {
  key: 'approvals',
  storage: AsyncStorage,
  whitelist: ['pendingApprovals', 'selectedApprovals'],
  transforms: [
    {
      in: (state: any) => ({
        ...state,
        // Store only essential data for offline
        pendingApprovals: state.pendingApprovals.map((approval: any) => ({
          ...approval,
          // Exclude large photo data from persistence
          photoUrl: approval.photoUrl ? 'cached' : null,
        })),
      }),
      out: (state: any) => state,
    },
  ],
};
```

#### 1.2 Create Offline Slice
**File**: `/store/slices/offlineSlice.ts` (new)

```typescript
interface OfflineState {
  isOnline: boolean;
  queue: OfflineAction[];
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncTimestamp: string | null;
  syncErrors: SyncError[];
  conflictResolutions: ConflictResolution[];
}

interface OfflineAction {
  id: string;
  type: ActionType;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'normal' | 'low';
  dependencies?: string[]; // IDs of actions that must complete first
}

type ActionType = 
  | 'COMPLETE_TASK'
  | 'UPLOAD_PHOTO'
  | 'APPROVE_TASK'
  | 'REJECT_TASK'
  | 'COMPLETE_ON_BEHALF'
  | 'AWARD_FAMCOINS'
  | 'ADJUST_BALANCE';

interface SyncError {
  actionId: string;
  error: string;
  timestamp: number;
  canRetry: boolean;
}

interface ConflictResolution {
  id: string;
  type: 'task_already_completed' | 'balance_mismatch' | 'task_deleted';
  localAction: OfflineAction;
  serverState: any;
  resolution: 'use_server' | 'use_local' | 'merge' | 'manual';
  resolvedAt?: string;
}

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
      if (action.payload && state.queue.length > 0) {
        state.syncStatus = 'syncing';
      }
    },
    
    enqueueAction: (state, action: PayloadAction<Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>>) => {
      const offlineAction: OfflineAction = {
        ...action.payload,
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };
      
      // Insert based on priority
      const insertIndex = state.queue.findIndex(
        item => getPriorityValue(item.priority) < getPriorityValue(offlineAction.priority)
      );
      
      if (insertIndex === -1) {
        state.queue.push(offlineAction);
      } else {
        state.queue.splice(insertIndex, 0, offlineAction);
      }
    },
    
    dequeueAction: (state, action: PayloadAction<string>) => {
      state.queue = state.queue.filter(item => item.id !== action.payload);
    },
    
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const item = state.queue.find(a => a.id === action.payload);
      if (item) {
        item.retryCount += 1;
      }
    },
    
    addSyncError: (state, action: PayloadAction<SyncError>) => {
      state.syncErrors.push(action.payload);
      // Keep only last 50 errors
      state.syncErrors = state.syncErrors.slice(-50);
    },
    
    addConflictResolution: (state, action: PayloadAction<ConflictResolution>) => {
      state.conflictResolutions.push(action.payload);
    },
    
    setSyncStatus: (state, action: PayloadAction<OfflineState['syncStatus']>) => {
      state.syncStatus = action.payload;
    },
    
    updateLastSync: (state) => {
      state.lastSyncTimestamp = new Date().toISOString();
    },
  },
});
```

### 2. Offline Queue Management

#### 2.1 Offline Action Handler
**File**: `/services/offlineService.ts` (new)

```typescript
import NetInfo from '@react-native-community/netinfo';
import BackgroundFetch from 'react-native-background-fetch';

class OfflineService {
  private store: Store;
  private syncInProgress = false;
  private networkListener: (() => void) | null = null;

  initialize(store: Store) {
    this.store = store;
    this.setupNetworkListener();
    this.setupBackgroundSync();
  }

  private setupNetworkListener() {
    this.networkListener = NetInfo.addEventListener(state => {
      const wasOffline = !this.store.getState().offline.isOnline;
      const isOnline = state.isConnected && state.isInternetReachable;
      
      this.store.dispatch(setOnlineStatus(isOnline));
      
      if (wasOffline && isOnline) {
        // Just came online, trigger sync
        this.syncOfflineQueue();
      }
    });
  }

  private setupBackgroundSync() {
    BackgroundFetch.configure({
      minimumFetchInterval: 15, // 15 minutes
      stopOnTerminate: false,
      enableHeadless: true,
    }, async () => {
      await this.syncOfflineQueue();
      BackgroundFetch.finish(BackgroundFetch.FETCH_RESULT_NEW_DATA);
    }, (error) => {
      console.error('Background fetch failed:', error);
    });
  }

  async syncOfflineQueue() {
    if (this.syncInProgress) return;
    
    const state = this.store.getState();
    if (!state.offline.isOnline || state.offline.queue.length === 0) return;
    
    this.syncInProgress = true;
    this.store.dispatch(setSyncStatus('syncing'));
    
    try {
      const queue = [...state.offline.queue];
      
      // Group actions by type for batch processing
      const groupedActions = this.groupActionsByType(queue);
      
      // Process each group
      for (const [type, actions] of Object.entries(groupedActions)) {
        await this.processActionGroup(type as ActionType, actions);
      }
      
      this.store.dispatch(updateLastSync());
      this.store.dispatch(setSyncStatus('idle'));
    } catch (error) {
      console.error('Sync failed:', error);
      this.store.dispatch(setSyncStatus('error'));
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processActionGroup(type: ActionType, actions: OfflineAction[]) {
    switch (type) {
      case 'COMPLETE_TASK':
        await this.syncTaskCompletions(actions);
        break;
      case 'UPLOAD_PHOTO':
        await this.syncPhotoUploads(actions);
        break;
      case 'APPROVE_TASK':
      case 'REJECT_TASK':
        await this.syncApprovals(actions);
        break;
      case 'AWARD_FAMCOINS':
        await this.syncFamcoinTransactions(actions);
        break;
      default:
        // Process individually
        for (const action of actions) {
          await this.processSingleAction(action);
        }
    }
  }

  private async syncTaskCompletions(actions: OfflineAction[]) {
    // Check current server state for all tasks
    const taskIds = actions.map(a => a.payload.taskCompletionId);
    const serverStates = await this.fetchTaskStates(taskIds);
    
    for (const action of actions) {
      const serverState = serverStates.find(
        s => s.id === action.payload.taskCompletionId
      );
      
      if (serverState && serverState.status !== 'pending') {
        // Conflict: task already processed
        await this.handleConflict(action, serverState, 'task_already_completed');
      } else {
        // Safe to complete
        await this.executeTaskCompletion(action);
      }
    }
  }

  private async handleConflict(
    action: OfflineAction,
    serverState: any,
    conflictType: ConflictResolution['type']
  ) {
    const conflict: ConflictResolution = {
      id: `conflict_${Date.now()}`,
      type: conflictType,
      localAction: action,
      serverState,
      resolution: this.determineResolution(conflictType, action, serverState),
    };
    
    this.store.dispatch(addConflictResolution(conflict));
    
    switch (conflict.resolution) {
      case 'use_server':
        // Discard local action
        this.store.dispatch(dequeueAction(action.id));
        break;
      case 'use_local':
        // Force local change
        await this.forceLocalChange(action);
        break;
      case 'merge':
        // Merge changes
        await this.mergeChanges(action, serverState);
        break;
      case 'manual':
        // Require user intervention
        this.store.dispatch(requireManualResolution(conflict));
        break;
    }
  }

  private determineResolution(
    type: ConflictResolution['type'],
    action: OfflineAction,
    serverState: any
  ): ConflictResolution['resolution'] {
    switch (type) {
      case 'task_already_completed':
        // If server has same completion, use server
        if (serverState.completed_at && action.payload.completedAt) {
          const serverTime = new Date(serverState.completed_at).getTime();
          const localTime = action.payload.completedAt;
          // Use whichever completed first
          return serverTime < localTime ? 'use_server' : 'use_local';
        }
        return 'use_server';
        
      case 'balance_mismatch':
        // Always recalculate from server
        return 'use_server';
        
      case 'task_deleted':
        // Task no longer exists
        return 'use_server';
        
      default:
        return 'manual';
    }
  }

  async queueOfflineAction(
    type: ActionType,
    payload: any,
    options?: {
      priority?: OfflineAction['priority'];
      dependencies?: string[];
    }
  ) {
    const action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'> = {
      type,
      payload,
      priority: options?.priority || 'normal',
      maxRetries: this.getMaxRetries(type),
      dependencies: options?.dependencies,
    };
    
    this.store.dispatch(enqueueAction(action));
    
    // Optimistically update UI
    this.applyOptimisticUpdate(type, payload);
    
    // Try to sync immediately if online
    if (this.store.getState().offline.isOnline) {
      this.syncOfflineQueue();
    }
  }

  private applyOptimisticUpdate(type: ActionType, payload: any) {
    switch (type) {
      case 'COMPLETE_TASK':
        this.store.dispatch(markTaskCompleteOptimistic(payload));
        break;
      case 'APPROVE_TASK':
        this.store.dispatch(approveTaskOptimistic(payload));
        break;
      case 'AWARD_FAMCOINS':
        this.store.dispatch(updateBalanceOptimistic(payload));
        break;
    }
  }

  private getMaxRetries(type: ActionType): number {
    switch (type) {
      case 'UPLOAD_PHOTO':
        return 10; // Photos need more retries
      case 'AWARD_FAMCOINS':
        return 5; // Financial transactions need reliability
      default:
        return 3;
    }
  }
}

export const offlineService = new OfflineService();
```

### 3. Photo Offline Handling

#### 3.1 Offline Photo Manager
**File**: `/services/offlinePhotoService.ts` (new)

```typescript
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

class OfflinePhotoService {
  private readonly cacheDir = `${FileSystem.cacheDirectory}offline_photos/`;
  private readonly maxCacheSize = 100 * 1024 * 1024; // 100MB

  async initialize() {
    // Ensure cache directory exists
    const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
    }
  }

  async cachePhotoForUpload(
    uri: string,
    taskCompletionId: string
  ): Promise<string> {
    // Compress photo
    const compressed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1920 } }], // Max width 1920px
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    // Save to offline cache
    const fileName = `${taskCompletionId}_${Date.now()}.jpg`;
    const cachePath = `${this.cacheDir}${fileName}`;
    
    await FileSystem.copyAsync({
      from: compressed.uri,
      to: cachePath,
    });
    
    // Track in offline queue
    await offlineService.queueOfflineAction(
      'UPLOAD_PHOTO',
      {
        taskCompletionId,
        localPath: cachePath,
        originalUri: uri,
      },
      { priority: 'low' } // Photos are lower priority than data
    );
    
    // Clean up old cache if needed
    await this.cleanupCacheIfNeeded();
    
    return cachePath;
  }

  async uploadQueuedPhoto(action: OfflineAction): Promise<void> {
    const { localPath, taskCompletionId } = action.payload;
    
    // Check if file still exists
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (!fileInfo.exists) {
      throw new Error('Cached photo no longer exists');
    }
    
    // Upload to Supabase
    const blob = await this.fileToBlob(localPath);
    const photoUrl = await photoService.uploadPhoto(
      blob,
      `task-photos/${taskCompletionId}/${Date.now()}.jpg`
    );
    
    // Update task completion with photo URL
    await taskService.updateTaskPhoto(taskCompletionId, photoUrl);
    
    // Clean up local file
    await FileSystem.deleteAsync(localPath, { idempotent: true });
  }

  private async fileToBlob(uri: string): Promise<Blob> {
    const response = await fetch(uri);
    return response.blob();
  }

  private async cleanupCacheIfNeeded() {
    const files = await FileSystem.readDirectoryAsync(this.cacheDir);
    let totalSize = 0;
    const fileInfos = [];
    
    for (const file of files) {
      const info = await FileSystem.getInfoAsync(`${this.cacheDir}${file}`);
      if (info.exists && !info.isDirectory) {
        totalSize += info.size || 0;
        fileInfos.push({ name: file, size: info.size || 0, modTime: info.modificationTime || 0 });
      }
    }
    
    if (totalSize > this.maxCacheSize) {
      // Delete oldest files first
      fileInfos.sort((a, b) => a.modTime - b.modTime);
      
      for (const file of fileInfos) {
        await FileSystem.deleteAsync(`${this.cacheDir}${file.name}`, { idempotent: true });
        totalSize -= file.size;
        
        if (totalSize <= this.maxCacheSize * 0.8) {
          break; // Keep 20% buffer
        }
      }
    }
  }

  async getCachedPhotos(): Promise<CachedPhoto[]> {
    const files = await FileSystem.readDirectoryAsync(this.cacheDir);
    const photos: CachedPhoto[] = [];
    
    for (const file of files) {
      const path = `${this.cacheDir}${file}`;
      const info = await FileSystem.getInfoAsync(path);
      
      if (info.exists && !info.isDirectory) {
        photos.push({
          uri: path,
          name: file,
          size: info.size || 0,
          timestamp: info.modificationTime || 0,
        });
      }
    }
    
    return photos;
  }
}

export const offlinePhotoService = new OfflinePhotoService();
```

### 4. Conflict Resolution UI

#### 4.1 Conflict Resolution Modal
**File**: `/components/offline/ConflictResolutionModal.tsx` (new)

```typescript
interface ConflictResolutionModalProps {
  conflict: ConflictResolution;
  onResolve: (resolution: 'use_local' | 'use_server') => void;
  onDismiss: () => void;
}

export function ConflictResolutionModal({
  conflict,
  onResolve,
  onDismiss,
}: ConflictResolutionModalProps) {
  const renderConflictDetails = () => {
    switch (conflict.type) {
      case 'task_already_completed':
        return (
          <View>
            <Text className="text-lg font-bold mb-2">Task Already Completed</Text>
            <Text className="text-gray-600 mb-4">
              This task was completed by someone else while you were offline.
            </Text>
            
            <View className="bg-gray-50 p-3 rounded-lg mb-3">
              <Text className="font-medium">Your completion:</Text>
              <Text className="text-sm text-gray-600">
                {formatTime(conflict.localAction.timestamp)}
              </Text>
            </View>
            
            <View className="bg-gray-50 p-3 rounded-lg">
              <Text className="font-medium">Server completion:</Text>
              <Text className="text-sm text-gray-600">
                {formatTime(conflict.serverState.completed_at)}
              </Text>
            </View>
          </View>
        );
        
      case 'balance_mismatch':
        return (
          <View>
            <Text className="text-lg font-bold mb-2">Balance Mismatch</Text>
            <Text className="text-gray-600 mb-4">
              The FAMCOIN balance has changed while you were offline.
            </Text>
            
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-sm text-gray-500">Your Balance</Text>
                <Text className="text-2xl font-bold">
                  {conflict.localAction.payload.expectedBalance} FC
                </Text>
              </View>
              
              <View className="items-center">
                <Text className="text-sm text-gray-500">Server Balance</Text>
                <Text className="text-2xl font-bold">
                  {conflict.serverState.balance} FC
                </Text>
              </View>
            </View>
          </View>
        );
    }
  };
  
  return (
    <Modal visible transparent animationType="slide">
      <View className="flex-1 justify-center bg-black/50 p-4">
        <View className="bg-white rounded-xl p-6">
          {renderConflictDetails()}
          
          <View className="flex-row mt-6 space-x-3">
            <TouchableOpacity
              onPress={() => onResolve('use_server')}
              className="flex-1 bg-gray-200 rounded-lg py-3"
            >
              <Text className="text-center font-medium">Use Server Data</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => onResolve('use_local')}
              className="flex-1 bg-indigo-600 rounded-lg py-3"
            >
              <Text className="text-white text-center font-medium">Keep My Changes</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            onPress={onDismiss}
            className="mt-3 py-2"
          >
            <Text className="text-center text-gray-500">Decide Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
```

### 5. Sync Status UI

#### 5.1 Sync Status Indicator
**File**: `/components/offline/SyncStatusIndicator.tsx` (new)

```typescript
export function SyncStatusIndicator() {
  const { isOnline, syncStatus, queue, lastSyncTimestamp } = useSelector(
    (state: RootState) => state.offline
  );
  
  if (!isOnline) {
    return (
      <View className="flex-row items-center bg-orange-100 px-3 py-1 rounded-full">
        <View className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
        <Text className="text-sm text-orange-700">Offline Mode</Text>
        {queue.length > 0 && (
          <Text className="text-sm text-orange-700 ml-1">
            ({queue.length} pending)
          </Text>
        )}
      </View>
    );
  }
  
  if (syncStatus === 'syncing') {
    return (
      <View className="flex-row items-center bg-blue-100 px-3 py-1 rounded-full">
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text className="text-sm text-blue-700 ml-2">Syncing...</Text>
      </View>
    );
  }
  
  if (syncStatus === 'error') {
    return (
      <TouchableOpacity
        onPress={() => offlineService.syncOfflineQueue()}
        className="flex-row items-center bg-red-100 px-3 py-1 rounded-full"
      >
        <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
        <Text className="text-sm text-red-700">Sync Error - Tap to retry</Text>
      </TouchableOpacity>
    );
  }
  
  // Show last sync time if recent
  if (lastSyncTimestamp) {
    const minutesAgo = Math.floor(
      (Date.now() - new Date(lastSyncTimestamp).getTime()) / 60000
    );
    
    if (minutesAgo < 5) {
      return (
        <View className="flex-row items-center bg-green-100 px-3 py-1 rounded-full">
          <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
          <Text className="text-sm text-green-700">Synced</Text>
        </View>
      );
    }
  }
  
  return null;
}
```

### 6. Background Sync

#### 6.1 Background Task Configuration
**File**: `/services/backgroundTaskService.ts` (new)

```typescript
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

const BACKGROUND_SYNC_TASK = 'FAMIFY_BACKGROUND_SYNC';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    // Check if app has offline actions
    const state = await AsyncStorage.getItem('persist:offline');
    if (!state) return BackgroundFetch.Result.NoData;
    
    const offlineState = JSON.parse(state);
    const queue = JSON.parse(offlineState.queue || '[]');
    
    if (queue.length === 0) {
      return BackgroundFetch.Result.NoData;
    }
    
    // Initialize minimal services
    await supabase.auth.getSession(); // Restore auth
    
    // Process offline queue
    const processed = await processBackgroundQueue(queue);
    
    // Update persisted state
    if (processed > 0) {
      await updatePersistedQueue(queue.slice(processed));
      return BackgroundFetch.Result.NewData;
    }
    
    return BackgroundFetch.Result.NoData;
  } catch (error) {
    console.error('Background sync error:', error);
    return BackgroundFetch.Result.Failed;
  }
});

export async function registerBackgroundSync() {
  const status = await BackgroundFetch.getStatusAsync();
  
  if (status === BackgroundFetch.Status.Restricted ||
      status === BackgroundFetch.Status.Denied) {
    console.log('Background fetch is disabled');
    return;
  }
  
  await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 15 * 60, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
```

### 7. Data Caching Strategy

#### 7.1 Selective Data Caching
**File**: `/services/cacheService.ts` (new)

```typescript
class CacheService {
  private readonly CACHE_VERSION = 1;
  private readonly CACHE_KEYS = {
    TASK_TEMPLATES: 'cache:task_templates',
    TASK_CATEGORIES: 'cache:task_categories',
    CHILD_TASKS: (childId: string, date: string) => `cache:tasks:${childId}:${date}`,
    PENDING_APPROVALS: (parentId: string) => `cache:approvals:${parentId}`,
  };

  async cacheTaskTemplates(templates: TaskTemplate[]) {
    await AsyncStorage.setItem(
      this.CACHE_KEYS.TASK_TEMPLATES,
      JSON.stringify({
        version: this.CACHE_VERSION,
        timestamp: Date.now(),
        data: templates,
      })
    );
  }

  async getCachedTaskTemplates(): Promise<TaskTemplate[] | null> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEYS.TASK_TEMPLATES);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      
      // Check cache validity (24 hours)
      if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
        return null;
      }
      
      return parsed.data;
    } catch {
      return null;
    }
  }

  async cacheChildTasks(childId: string, date: string, tasks: TaskCompletionView[]) {
    const key = this.CACHE_KEYS.CHILD_TASKS(childId, date);
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        version: this.CACHE_VERSION,
        timestamp: Date.now(),
        data: tasks,
      })
    );
    
    // Keep only last 7 days of task cache per child
    await this.cleanupOldTaskCache(childId, date);
  }

  private async cleanupOldTaskCache(childId: string, currentDate: string) {
    const keys = await AsyncStorage.getAllKeys();
    const taskKeys = keys.filter(k => k.startsWith(`cache:tasks:${childId}:`));
    
    const keysWithDates = taskKeys.map(key => {
      const date = key.split(':').pop()!;
      return { key, date };
    });
    
    // Sort by date and keep only last 7
    keysWithDates.sort((a, b) => b.date.localeCompare(a.date));
    const keysToDelete = keysWithDates.slice(7).map(k => k.key);
    
    if (keysToDelete.length > 0) {
      await AsyncStorage.multiRemove(keysToDelete);
    }
  }

  async invalidateCache(pattern?: string) {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => 
      k.startsWith('cache:') && (!pattern || k.includes(pattern))
    );
    
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  }
}

export const cacheService = new CacheService();
```

### 8. Testing Requirements

#### 8.1 Offline Scenario Tests
- Complete tasks while offline
- Approve tasks while offline
- Upload photos while offline
- Switch between online/offline multiple times
- Background sync execution
- Conflict resolution flows

#### 8.2 Performance Tests
- Queue with 100+ actions
- Large photo uploads
- Cache size management
- Battery usage monitoring
- Memory usage tracking

## Success Criteria

1. **Functionality**
   - All core features work offline
   - Data syncs correctly when online
   - Conflicts resolved intelligently
   - No data loss during sync

2. **Performance**
   - Offline mode has no UI lag
   - Sync completes within 30 seconds
   - Background sync uses < 5% battery
   - Cache size stays under limits

3. **Reliability**
   - Handles network interruptions
   - Recovers from sync failures
   - Preserves data integrity
   - Maintains consistency

4. **User Experience**
   - Clear offline indicators
   - Transparent sync status
   - Minimal conflict interruptions
   - Seamless online/offline transitions

## Dependencies

### NPM Packages
- `@react-native-community/netinfo` - Network state
- `expo-background-fetch` - Background sync
- `expo-task-manager` - Background tasks
- `expo-file-system` - File management

### Platform Requirements
- iOS: Background App Refresh enabled
- Android: Background restrictions handled
- Both: Storage permissions for photo cache

## Migration Notes

- Requires Redux persist migration
- Background task registration on app start
- Cache warming strategy needed
- User education about offline mode