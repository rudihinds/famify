# Phase 2: Parent Review Interface - Detailed Execution Plan

## Overview
This phase implements the parent interface for reviewing and approving child-completed tasks. It includes the pending approvals dashboard, approval/rejection workflow, complete-on-behalf functionality, and comprehensive photo review capabilities.

## Implementation Steps

### 1. Redux Store Extensions

#### 1.1 Create Approvals Slice
**File**: `/store/slices/approvalsSlice.ts` (new)

```typescript
interface ApprovalsState {
  pendingApprovals: PendingApprovalView[];
  approvalFilters: ApprovalFilters;
  isLoading: boolean;
  isBatchProcessing: boolean;
  selectedApprovals: string[]; // For batch operations
  photoViewerState: PhotoViewerState | null;
  error: string | null;
}

interface PendingApprovalView {
  id: string; // task_completion.id
  taskInstanceId: string;
  childId: string;
  childName: string;
  childAvatar?: string;
  taskName: string;
  customDescription?: string;
  groupName: string;
  famcoinValue: number;
  photoUrl?: string;
  photoProofRequired: boolean;
  completedAt: string;
  effortScore: number;
  categoryIcon: string;
  categoryColor: string;
}

interface ApprovalFilters {
  childId?: string;
  dateRange?: { start: string; end: string };
  hasPhoto?: boolean;
  sortBy: 'completedAt' | 'childName' | 'famcoinValue';
  sortOrder: 'asc' | 'desc';
}

interface PhotoViewerState {
  taskCompletionId: string;
  photoUrl: string;
  childName: string;
  taskName: string;
}
```

**Key Actions**:
- `fetchPendingApprovals(parentId, filters)` - Get all pending tasks
- `approveTask(taskCompletionId, parentId)` - Approve with FAMCOIN award
- `rejectTask(taskCompletionId, reason, parentId)` - Reject with reason
- `batchApprove(taskCompletionIds, parentId)` - Bulk approval
- `completeOnBehalf(taskInstanceId, childId, parentId, photoUri?)` - Parent completion
- `setApprovalFilters(filters)` - Update filter preferences
- `toggleTaskSelection(taskCompletionId)` - For batch operations

#### 1.2 Create RTK Query API
**File**: `/store/api/approvalsApi.ts` (new)

```typescript
export const approvalsApi = createApi({
  reducerPath: 'approvalsApi',
  baseQuery: supabaseBaseQuery,
  tagTypes: ['PendingApprovals', 'TaskCompletions'],
  endpoints: (builder) => ({
    getPendingApprovals: builder.query<PendingApprovalView[], ApprovalQueryParams>({
      // Complex query with joins
      providesTags: ['PendingApprovals'],
    }),
    approveTask: builder.mutation<void, ApproveTaskParams>({
      // Update status + create FAMCOIN transaction
      invalidatesTags: ['PendingApprovals', 'TaskCompletions'],
    }),
    rejectTask: builder.mutation<void, RejectTaskParams>({
      // Update status + rejection reason
      invalidatesTags: ['PendingApprovals', 'TaskCompletions'],
    }),
  }),
});
```

### 2. Parent App Screens

#### 2.1 Pending Approvals Dashboard
**File**: `/app/(parent)/approvals/index.tsx` (new)

**Key Features**:
- Tab or menu item in parent navigation
- Badge showing pending count
- List of pending approvals with filters
- Batch selection mode
- Pull-to-refresh
- Empty state

**Component Structure**:
```typescript
export default function ApprovalsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { pendingApprovals, isLoading, selectedApprovals } = useSelector(
    (state: RootState) => state.approvals
  );
  
  // Filter UI state
  // Batch mode toggle
  // Navigation to detail view
  // Quick approve/reject actions
}
```

#### 2.2 Task Approval Detail Modal
**File**: `/app/(parent)/approvals/[id].tsx` (new)

**Features**:
- Full task details
- Large photo preview (if exists)
- Approve/Reject buttons
- Rejection reason picker
- Complete on behalf option

#### 2.3 Photo Viewer Screen
**File**: `/app/(parent)/approvals/photo/[id].tsx` (new)

**Features**:
- Full-screen photo with pinch-to-zoom
- Photo metadata display
- Swipe between photos (if multiple pending)
- Approve/Reject from photo view

### 3. Approval Components

#### 3.1 Pending Approval Card
**File**: `/components/parent/PendingApprovalCard.tsx` (new)

```typescript
interface PendingApprovalCardProps {
  approval: PendingApprovalView;
  onApprove: () => void;
  onReject: () => void;
  onPress: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  selectionMode?: boolean;
}
```

**Features**:
- Child avatar and name
- Task details
- Time since completion
- Photo thumbnail
- Quick action buttons
- Selection checkbox (batch mode)

#### 3.2 Approval Filters Component
**File**: `/components/parent/ApprovalFilters.tsx` (new)

```typescript
interface ApprovalFiltersProps {
  filters: ApprovalFilters;
  onFiltersChange: (filters: ApprovalFilters) => void;
  children: Child[];
}
```

**Features**:
- Child selector (all/specific)
- Date range picker
- Photo filter toggle
- Sort options
- Clear filters button

#### 3.3 Rejection Reason Modal
**File**: `/components/parent/RejectionReasonModal.tsx` (new)

```typescript
interface RejectionReasonModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const PRESET_REASONS = [
  'Task not completed properly',
  'Photo doesn\'t show completed task',
  'Need to redo this task',
  'Wrong task completed',
];
```

**Features**:
- Preset reason options
- Custom reason text input
- Character limit
- Cancel/Submit buttons

#### 3.4 Complete On Behalf Modal
**File**: `/components/parent/CompleteOnBehalfModal.tsx` (new)

```typescript
interface CompleteOnBehalfModalProps {
  visible: boolean;
  task: TaskInstanceView;
  children: Child[];
  onClose: () => void;
  onComplete: (childId: string, reason: string, photoUri?: string) => void;
}
```

**Features**:
- Child selector
- Reason for completion
- Optional photo upload
- Confirmation message

### 4. Approval Service Layer

#### 4.1 Create Approval Service
**File**: `/services/approvalService.ts` (new)

```typescript
class ApprovalService {
  async getPendingApprovals(
    parentId: string,
    filters?: ApprovalFilters
  ): Promise<PendingApprovalView[]> {
    // Complex query with filters
    // Join multiple tables
    // Apply sorting
  }

  async approveTask(
    taskCompletionId: string,
    parentId: string
  ): Promise<void> {
    // Start transaction
    // Update task_completion status
    // Create FAMCOIN transaction
    // Update child balance
    // Commit transaction
  }

  async rejectTask(
    taskCompletionId: string,
    reason: string,
    parentId: string
  ): Promise<void> {
    // Update status and rejection reason
    // Record rejection timestamp
  }

  async completeOnBehalf(
    taskInstanceId: string,
    childId: string,
    parentId: string,
    reason: string,
    photoBlob?: Blob
  ): Promise<void> {
    // Create or update task_completion
    // Set status directly to approved
    // Create FAMCOIN transaction
    // Upload photo if provided
  }

  async batchApprove(
    taskCompletionIds: string[],
    parentId: string
  ): Promise<BatchApprovalResult> {
    // Process in transaction
    // Return success/failure counts
  }
}
```

### 5. Photo Review System

#### 5.1 Photo Viewer Component
**File**: `/components/parent/TaskPhotoViewer.tsx` (new)

```typescript
interface TaskPhotoViewerProps {
  photoUrl: string;
  taskName: string;
  childName: string;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}
```

Using `react-native-image-zoom-viewer`:
- Pinch to zoom
- Double tap to zoom
- Pan when zoomed
- Loading states

#### 5.2 Photo Grid Component
**File**: `/components/parent/PendingPhotosGrid.tsx` (new)

For quick photo review mode:
- Grid of pending photos
- Tap to view full screen
- Quick approve/reject overlay

### 6. Notification Badge System

#### 6.1 Update Parent Layout
**File**: `/app/(parent)/_layout.tsx` (existing)

Add badge to approvals tab:
```typescript
function ApprovalsBadge() {
  const pendingCount = useSelector(
    (state: RootState) => state.approvals.pendingApprovals.length
  );
  
  if (pendingCount === 0) return null;
  
  return (
    <View className="absolute -top-1 -right-1 bg-red-500 rounded-full">
      <Text className="text-white text-xs px-2 py-0.5">
        {pendingCount > 99 ? '99+' : pendingCount}
      </Text>
    </View>
  );
}
```

### 7. Database Queries

#### 7.1 Pending Approvals Query
```sql
SELECT 
  tc.id,
  tc.task_instance_id,
  tc.child_id,
  tc.completed_at,
  tc.photo_url,
  c.name as child_name,
  c.avatar_url as child_avatar,
  ti.custom_name,
  ti.custom_description,
  ti.famcoin_value,
  ti.photo_proof_required,
  ti.effort_score,
  tt.name as template_name,
  g.name as group_name,
  cat.icon as category_icon,
  cat.color as category_color
FROM task_completions tc
JOIN children c ON tc.child_id = c.id
JOIN task_instances ti ON tc.task_instance_id = ti.id
JOIN task_templates tt ON ti.template_id = tt.id
JOIN groups g ON ti.group_id = g.id
JOIN task_categories cat ON tt.category_id = cat.id
WHERE c.parent_id = $1
  AND tc.status = 'child_completed'
  AND ($2::uuid IS NULL OR tc.child_id = $2) -- Optional child filter
  AND ($3::date IS NULL OR tc.completed_at >= $3) -- Date range start
  AND ($4::date IS NULL OR tc.completed_at <= $4) -- Date range end
ORDER BY tc.completed_at DESC;
```

#### 7.2 Batch Approval Transaction
```sql
BEGIN;

-- Update all task completions
UPDATE task_completions
SET 
  status = 'parent_approved',
  approved_at = NOW(),
  approved_by = $parentId
WHERE id = ANY($taskCompletionIds)
  AND status = 'child_completed';

-- Create FAMCOIN transactions
INSERT INTO famcoin_transactions (child_id, amount, task_completion_id, transaction_type, created_by)
SELECT 
  tc.child_id,
  ti.famcoin_value,
  tc.id,
  'earned',
  $parentId
FROM task_completions tc
JOIN task_instances ti ON tc.task_instance_id = ti.id
WHERE tc.id = ANY($taskCompletionIds);

-- Update child balances
UPDATE children c
SET famcoin_balance = c.famcoin_balance + earned.total
FROM (
  SELECT child_id, SUM(ti.famcoin_value) as total
  FROM task_completions tc
  JOIN task_instances ti ON tc.task_instance_id = ti.id
  WHERE tc.id = ANY($taskCompletionIds)
  GROUP BY child_id
) earned
WHERE c.id = earned.child_id;

COMMIT;
```

### 8. Real-time Updates Foundation

#### 8.1 Supabase Realtime Subscription
**File**: `/hooks/useApprovalSubscription.ts` (new)

```typescript
export function useApprovalSubscription(parentId: string) {
  useEffect(() => {
    const subscription = supabase
      .channel('approvals')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'task_completions',
          filter: `status=eq.child_completed`,
        },
        (payload) => {
          // Dispatch action to add to pending approvals
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [parentId]);
}
```

### 9. Error Handling

#### 9.1 Approval Errors
- Concurrent approval (already approved) → Show current state
- Network failure → Retry with exponential backoff
- Invalid state transition → Refresh and show error
- FAMCOIN calculation error → Log and use fallback

#### 9.2 Photo Loading Errors
- Network timeout → Show retry button
- Invalid URL → Show placeholder
- Large file → Progressive loading
- Format not supported → Show error image

### 10. Performance Optimizations

#### 10.1 List Virtualization
**File**: `/components/parent/VirtualizedApprovalList.tsx` (new)

Using `@shopify/flash-list`:
- Efficient rendering of large lists
- Maintain scroll position
- Smooth scrolling

#### 10.2 Image Caching
Configure `expo-image` for caching:
```typescript
<Image
  source={{ uri: photoUrl }}
  cachePolicy="memory-disk"
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
/>
```

### 11. Testing Requirements

#### 11.1 Component Tests
- Approval card interactions
- Filter logic
- Batch selection
- Photo viewer gestures

#### 11.2 Integration Tests
- Full approval flow
- Batch approval transaction
- Complete on behalf flow
- Real-time updates

## Success Criteria

1. **Functionality**
   - Parents can view all pending approvals
   - Single and batch approval works correctly
   - Rejection with reasons functions properly
   - Complete on behalf creates proper records
   - Photos are viewable in full screen

2. **Performance**
   - List loads in < 1 second
   - Smooth scrolling with 100+ items
   - Photo previews load progressively
   - Batch operations complete in < 3 seconds

3. **User Experience**
   - Clear visual hierarchy
   - Intuitive approval actions
   - Helpful empty states
   - Accessible to screen readers

4. **Data Integrity**
   - FAMCOIN calculations are accurate
   - Transactions are atomic
   - No double approvals
   - Audit trail maintained

## Dependencies

### NPM Packages
- `@shopify/flash-list` - Virtualized lists
- `react-native-image-zoom-viewer` - Photo zoom
- `expo-image` - Optimized image loading
- `date-fns` - Date manipulation

### Existing Dependencies
- Redux Toolkit
- React Navigation
- Supabase client

## Migration Notes

- Extends existing parent app structure
- No database schema changes needed
- Reuses authentication patterns
- Compatible with offline sync preparation