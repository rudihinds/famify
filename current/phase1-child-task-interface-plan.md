# Phase 1: Child Task Interface - Detailed Execution Plan

## Overview
This phase implements the core child interface for viewing and completing daily tasks. This includes the main task list, completion actions, photo capture, and task detail views.

## Implementation Steps

### 1. Redux Store Setup

#### 1.1 Create Task Slice
**File**: `/store/slices/taskSlice.ts` (new)

```typescript
interface TaskState {
  dailyTasks: TaskCompletionView[];
  selectedDate: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  photoUploadProgress: { [taskId: string]: number };
  offlineQueue: OfflineTaskAction[];
}

interface TaskCompletionView {
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

interface OfflineTaskAction {
  id: string;
  type: 'complete' | 'photo_upload';
  taskCompletionId: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}
```

**Key Actions**:
- `fetchDailyTasks(childId, date)` - Fetches tasks for specific date
- `markTaskComplete(taskCompletionId)` - Optimistic update + API call
- `uploadTaskPhoto(taskCompletionId, photoUri)` - Photo upload with progress
- `syncOfflineActions()` - Process queued offline actions
- `setSelectedDate(date)` - Update currently viewed date

#### 1.2 Update Child Slice
**File**: `/store/slices/childSlice.ts` (existing)

Add:
```typescript
interface ChildState {
  // ... existing fields
  currentBalance: number; // Current FAMCOIN balance
  balanceLastUpdated: string | null;
}
```

### 2. Task Service Layer

#### 2.1 Extend Task Service
**File**: `/services/taskService.ts` (existing)

Add methods:
```typescript
class TaskService {
  // ... existing methods

  async getDailyTasks(childId: string, date: string): Promise<TaskCompletionView[]> {
    // Join task_completions with task_instances, groups, templates, categories
    // Filter by child_id and due_date
    // Include group active_days filtering
  }

  async markTaskComplete(taskCompletionId: string): Promise<void> {
    // Update status to 'child_completed'
    // Set completed_at timestamp
  }

  async uploadTaskPhoto(taskCompletionId: string, photoBlob: Blob): Promise<string> {
    // Upload to Supabase storage
    // Update task_completion with photo_url
    // Return photo URL
  }

  async getTaskDetails(taskCompletionId: string): Promise<TaskDetailView> {
    // Full task information with all relationships
  }
}
```

### 3. Child App Navigation Structure

#### 3.1 Create Child Layout
**File**: `/app/child/_layout.tsx` (existing - update)

Update to include task-related routes:
```typescript
export default function ChildLayout() {
  // Add tab for tasks
  // Ensure proper auth checking
}
```

#### 3.2 Daily Task List Screen
**File**: `/app/child/tasks/index.tsx` (new)

**Key Components**:
- Date selector with calendar navigation
- Task list grouped by completion status
- Empty state for no tasks
- Refresh control
- FAMCOIN balance display
- Loading states

**Component Structure**:
```typescript
export default function ChildTasksScreen() {
  // Redux hooks for tasks and child state
  // Date navigation logic
  // Pull-to-refresh handling
  // Navigation to task details
}
```

#### 3.3 Task Detail Modal
**File**: `/app/child/tasks/[id].tsx` (new)

**Features**:
- Full task information display
- Completion toggle with animation
- Photo capture/upload interface
- Status indicators
- Rejection reason display

### 4. Reusable Components

#### 4.1 Task Card Component
**File**: `/components/child/TaskCard.tsx` (new)

```typescript
interface TaskCardProps {
  task: TaskCompletionView;
  onPress: () => void;
  onComplete: () => void;
}
```

**Features**:
- Category icon and color
- Task name and description
- FAMCOIN value display
- Completion checkbox/button
- Photo indicator
- Status badge

#### 4.2 Date Navigation Component
**File**: `/components/child/DateNavigator.tsx` (new)

```typescript
interface DateNavigatorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  hasTasksOnDate: (date: string) => boolean;
}
```

**Features**:
- Swipe or button navigation
- Today button
- Visual indicators for dates with tasks
- Accessibility support

#### 4.3 Photo Capture Component
**File**: `/components/child/PhotoCapture.tsx` (new)

```typescript
interface PhotoCaptureProps {
  onPhotoCapture: (photoUri: string) => void;
  onCancel: () => void;
  maxSizeMB?: number;
}
```

**Features**:
- Camera integration with expo-camera
- Gallery picker with expo-image-picker
- Image compression with expo-image-manipulator
- Free-crop aspect ratio
- Progress indicator

### 5. Photo Management

#### 5.1 Photo Storage Setup
**Supabase Storage Bucket**: `task-photos`

Structure:
```
/task-photos/
  /{parent_id}/
    /{child_id}/
      /{task_completion_id}/
        /photo_{timestamp}.jpg
```

#### 5.2 Photo Upload Service
**File**: `/services/photoService.ts` (new)

```typescript
class PhotoService {
  async compressPhoto(uri: string): Promise<Blob> {
    // Use expo-image-manipulator
    // Compress to 80% quality
    // Ensure under 2MB
  }

  async uploadPhoto(
    blob: Blob,
    path: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // Upload with progress tracking
    // Return public URL
  }
}
```

### 6. Offline Support Foundation

#### 6.1 Offline Queue Persistence
**Redux Persist Config Update**: `/store/index.ts`

Add offline queue to persisted state:
```typescript
const persistConfig = {
  // ... existing config
  whitelist: ['auth', 'child', 'tasks'], // Add tasks
}
```

#### 6.2 Network State Monitoring
**File**: `/hooks/useNetworkState.ts` (new)

```typescript
export function useNetworkState() {
  // Monitor network connectivity
  // Trigger sync when online
}
```

### 7. Animation and Feedback

#### 7.1 Task Completion Animation
**File**: `/components/child/TaskCompletionAnimation.tsx` (new)

Using React Native Reanimated:
- Checkmark animation
- Confetti effect
- FAMCOIN preview (pending approval)

#### 7.2 Loading States
**File**: `/components/child/TaskSkeleton.tsx` (new)

Skeleton loaders for:
- Task cards
- Date navigator
- Photo upload progress

### 8. Database Queries

#### 8.1 Daily Tasks Query
```sql
SELECT 
  tc.id,
  tc.task_instance_id,
  tc.due_date,
  tc.status,
  tc.photo_url,
  tc.completed_at,
  tc.rejection_reason,
  ti.custom_name,
  ti.custom_description,
  ti.famcoin_value,
  ti.photo_proof_required,
  ti.effort_score,
  tt.name as template_name,
  tt.description as template_description,
  g.name as group_name,
  cat.icon as category_icon,
  cat.color as category_color
FROM task_completions tc
JOIN task_instances ti ON tc.task_instance_id = ti.id
JOIN task_templates tt ON ti.template_id = tt.id
JOIN groups g ON ti.group_id = g.id
JOIN task_categories cat ON tt.category_id = cat.id
WHERE tc.child_id = $1 
  AND tc.due_date = $2
  AND $3 = ANY(g.active_days) -- day of week check
ORDER BY 
  CASE tc.status 
    WHEN 'pending' THEN 1
    WHEN 'parent_rejected' THEN 2
    WHEN 'child_completed' THEN 3
    ELSE 4
  END,
  ti.effort_score DESC;
```

### 9. Error Handling

#### 9.1 Task Completion Errors
- Network failures → Queue for offline sync
- Permission denied → Show permission request
- Task already completed → Refresh and show current state
- Invalid task state → Log and show generic error

#### 9.2 Photo Upload Errors
- Size too large → Auto-compress and retry
- Network failure → Queue for background upload
- Storage full → Show storage management prompt
- Invalid format → Show format requirements

### 10. Testing Requirements

#### 10.1 Component Tests
- Task card interactions
- Date navigation logic
- Photo capture flow
- Offline queue persistence

#### 10.2 Integration Tests
- Full task completion flow
- Photo upload with compression
- Offline/online transitions
- Error recovery scenarios

## Success Criteria

1. **Functionality**
   - Children can view all their daily tasks
   - Tasks can be marked complete with immediate UI feedback
   - Photos can be captured/selected and uploaded
   - Task details are viewable in modal
   - Date navigation works smoothly

2. **Performance**
   - Task list loads in < 1 second
   - Photo compression completes in < 2 seconds
   - Smooth 60fps animations
   - Minimal memory usage for photo handling

3. **Reliability**
   - Offline actions are queued and synced
   - Photo uploads resume after interruption
   - State persists across app restarts
   - Error states are handled gracefully

4. **User Experience**
   - Clear visual feedback for all actions
   - Intuitive navigation between dates
   - Accessible to screen readers
   - Celebration feedback for completions

## Dependencies

### NPM Packages
- `expo-camera` - Camera access
- `expo-image-picker` - Gallery access
- `expo-image-manipulator` - Photo compression
- `react-native-reanimated` - Animations
- `@react-native-async-storage/async-storage` - Already installed
- `@reduxjs/toolkit` - Already installed

### Expo SDK Requirements
- Camera permissions
- Media library permissions
- Minimum SDK 53 (current)

## Migration Notes

- No database schema changes required
- Extends existing Redux patterns
- Follows established component structure
- Compatible with current auth flow