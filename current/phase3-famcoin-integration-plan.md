# Phase 3: FAMCOIN Integration - Detailed Execution Plan

## Overview
This phase implements the FAMCOIN reward system that automatically awards currency upon task approval, maintains real-time balance updates across devices, and provides comprehensive transaction logging for family financial transparency.

## Implementation Steps

### 1. Redux Store Enhancements

#### 1.1 Create FAMCOIN Slice
**File**: `/store/slices/famcoinSlice.ts` (new)

```typescript
interface FamcoinState {
  balances: { [childId: string]: ChildBalance };
  transactions: { [childId: string]: Transaction[] };
  transactionFilters: TransactionFilters;
  isLoadingBalances: boolean;
  isLoadingTransactions: boolean;
  pendingTransactions: PendingTransaction[];
  error: string | null;
}

interface ChildBalance {
  childId: string;
  balance: number;
  lastUpdated: string;
  pendingEarnings: number; // From unapproved tasks
}

interface Transaction {
  id: string;
  childId: string;
  amount: number;
  balance_after: number;
  transaction_type: 'earned' | 'spent' | 'adjusted' | 'bonus';
  task_completion_id?: string;
  wishlist_item_id?: string;
  description?: string;
  created_at: string;
  created_by: string;
  metadata?: {
    taskName?: string;
    itemName?: string;
    adjustmentReason?: string;
  };
}

interface PendingTransaction {
  id: string;
  type: 'earn' | 'spend' | 'adjust';
  childId: string;
  amount: number;
  reference_id?: string;
  timestamp: number;
}

interface TransactionFilters {
  dateRange?: { start: string; end: string };
  transactionType?: Transaction['transaction_type'];
  childId?: string;
  minAmount?: number;
  maxAmount?: number;
}
```

**Key Actions**:
- `fetchChildBalances(childIds)` - Get current balances
- `fetchTransactionHistory(childId, filters)` - Get filtered transactions
- `awardFamcoins(taskCompletionId, childId, amount)` - Process earning
- `spendFamcoins(wishlistItemId, childId, amount)` - Process spending
- `adjustBalance(childId, amount, reason, parentId)` - Manual adjustment
- `calculatePendingEarnings(childId)` - Sum unapproved task values
- `subscribeToBalanceUpdates(childIds)` - Real-time balance sync

#### 1.2 Update Child Slice
**File**: `/store/slices/childSlice.ts` (existing)

Modify to reference FAMCOIN slice for balance:
```typescript
// Remove balance from child slice
// Use selector to get balance from famcoin slice
export const selectChildBalance = (childId: string) => 
  (state: RootState) => state.famcoin.balances[childId]?.balance || 0;
```

### 2. FAMCOIN Service Layer

#### 2.1 Create FAMCOIN Service
**File**: `/services/famcoinService.ts` (new)

```typescript
class FamcoinService {
  async getChildBalance(childId: string): Promise<number> {
    const { data, error } = await supabase
      .from('children')
      .select('famcoin_balance')
      .eq('id', childId)
      .single();
    
    if (error) throw error;
    return data.famcoin_balance;
  }

  async getTransactionHistory(
    childId: string,
    filters?: TransactionFilters
  ): Promise<Transaction[]> {
    let query = supabase
      .from('famcoin_transactions')
      .select(`
        *,
        task_completion:task_completions(
          task_instance:task_instances(
            custom_name,
            template:task_templates(name)
          )
        ),
        wishlist_item:wishlist_items(name)
      `)
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return this.mapTransactionsWithMetadata(data);
  }

  async createTransaction(
    params: CreateTransactionParams
  ): Promise<Transaction> {
    // Start transaction
    const { data: transaction, error: txError } = await supabase.rpc(
      'create_famcoin_transaction',
      {
        p_child_id: params.childId,
        p_amount: params.amount,
        p_type: params.type,
        p_reference_id: params.referenceId,
        p_description: params.description,
        p_created_by: params.createdBy
      }
    );

    if (txError) throw txError;
    return transaction;
  }

  async adjustBalance(
    childId: string,
    adjustment: number,
    reason: string,
    parentId: string
  ): Promise<void> {
    const { error } = await supabase.rpc('adjust_child_balance', {
      p_child_id: childId,
      p_adjustment: adjustment,
      p_reason: reason,
      p_parent_id: parentId
    });

    if (error) throw error;
  }

  async calculatePendingEarnings(childId: string): Promise<number> {
    const { data, error } = await supabase
      .from('task_completions')
      .select(`
        task_instance:task_instances(famcoin_value)
      `)
      .eq('child_id', childId)
      .eq('status', 'child_completed');

    if (error) throw error;
    
    return data.reduce(
      (sum, tc) => sum + (tc.task_instance?.famcoin_value || 0),
      0
    );
  }

  subscribeToChildBalance(
    childId: string,
    onUpdate: (balance: number) => void
  ): RealtimeChannel {
    return supabase
      .channel(`balance:${childId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'children',
          filter: `id=eq.${childId}`
        },
        (payload) => {
          onUpdate(payload.new.famcoin_balance);
        }
      )
      .subscribe();
  }
}

export const famcoinService = new FamcoinService();
```

### 3. Database Functions

#### 3.1 Create FAMCOIN Transaction Function
**File**: `/supabase/migrations/xxx_famcoin_functions.sql` (new)

```sql
CREATE OR REPLACE FUNCTION create_famcoin_transaction(
  p_child_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_created_by UUID
) RETURNS famcoin_transactions AS $$
DECLARE
  v_transaction famcoin_transactions;
  v_new_balance INTEGER;
BEGIN
  -- Lock the child row to prevent concurrent updates
  SELECT famcoin_balance INTO v_new_balance
  FROM children
  WHERE id = p_child_id
  FOR UPDATE;

  -- Calculate new balance
  v_new_balance := v_new_balance + p_amount;
  
  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient FAMCOIN balance';
  END IF;

  -- Update child balance
  UPDATE children
  SET famcoin_balance = v_new_balance
  WHERE id = p_child_id;

  -- Create transaction record
  INSERT INTO famcoin_transactions (
    child_id,
    amount,
    balance_after,
    transaction_type,
    task_completion_id,
    wishlist_item_id,
    description,
    created_by
  ) VALUES (
    p_child_id,
    p_amount,
    v_new_balance,
    p_type,
    CASE WHEN p_type = 'earned' THEN p_reference_id ELSE NULL END,
    CASE WHEN p_type = 'spent' THEN p_reference_id ELSE NULL END,
    p_description,
    p_created_by
  ) RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle task approval with FAMCOIN award
CREATE OR REPLACE FUNCTION approve_task_with_famcoins(
  p_task_completion_id UUID,
  p_parent_id UUID
) RETURNS VOID AS $$
DECLARE
  v_task_completion task_completions%ROWTYPE;
  v_task_instance task_instances%ROWTYPE;
  v_child_id UUID;
  v_famcoin_value INTEGER;
BEGIN
  -- Get task completion details
  SELECT tc.*, ti.*
  INTO v_task_completion, v_task_instance
  FROM task_completions tc
  JOIN task_instances ti ON tc.task_instance_id = ti.id
  WHERE tc.id = p_task_completion_id
    AND tc.status = 'child_completed'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task completion not found or already processed';
  END IF;

  -- Update task completion status
  UPDATE task_completions
  SET 
    status = 'parent_approved',
    approved_at = NOW(),
    approved_by = p_parent_id
  WHERE id = p_task_completion_id;

  -- Award FAMCOINs
  PERFORM create_famcoin_transaction(
    v_task_completion.child_id,
    v_task_instance.famcoin_value,
    'earned',
    p_task_completion_id,
    NULL,
    p_parent_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. UI Components

#### 4.1 FAMCOIN Balance Display
**File**: `/components/common/FamcoinBalance.tsx` (new)

```typescript
interface FamcoinBalanceProps {
  childId: string;
  size?: 'small' | 'medium' | 'large';
  showPending?: boolean;
  animated?: boolean;
}

export function FamcoinBalance({ 
  childId, 
  size = 'medium', 
  showPending = false,
  animated = true 
}: FamcoinBalanceProps) {
  const balance = useSelector(selectChildBalance(childId));
  const pendingEarnings = useSelector(selectPendingEarnings(childId));
  
  // Animate balance changes
  const animatedValue = useSharedValue(balance);
  
  useEffect(() => {
    animatedValue.value = withSpring(balance);
  }, [balance]);

  return (
    <View className="flex-row items-center">
      <Image source={require('@/assets/famcoin-icon.png')} />
      <AnimatedText>{animatedValue}</AnimatedText>
      {showPending && pendingEarnings > 0 && (
        <Text className="text-gray-500">+{pendingEarnings}</Text>
      )}
    </View>
  );
}
```

#### 4.2 Transaction List Item
**File**: `/components/famcoin/TransactionListItem.tsx` (new)

```typescript
interface TransactionListItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

export function TransactionListItem({ 
  transaction, 
  onPress 
}: TransactionListItemProps) {
  const icon = getTransactionIcon(transaction.transaction_type);
  const color = getTransactionColor(transaction.transaction_type);
  
  return (
    <TouchableOpacity onPress={onPress} className="bg-white p-4 mb-2 rounded-lg">
      <View className="flex-row items-center">
        <View className={`p-2 rounded-full bg-${color}-100`}>
          {icon}
        </View>
        <View className="flex-1 ml-3">
          <Text className="font-medium">
            {getTransactionTitle(transaction)}
          </Text>
          <Text className="text-sm text-gray-500">
            {format(new Date(transaction.created_at), 'MMM d, h:mm a')}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`font-bold text-${color}-600`}>
            {transaction.amount > 0 ? '+' : ''}{transaction.amount} FC
          </Text>
          <Text className="text-xs text-gray-500">
            Balance: {transaction.balance_after} FC
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
```

#### 4.3 Balance Adjustment Modal
**File**: `/components/parent/BalanceAdjustmentModal.tsx` (new)

```typescript
interface BalanceAdjustmentModalProps {
  visible: boolean;
  child: Child;
  onClose: () => void;
  onSubmit: (amount: number, reason: string) => void;
}

const PRESET_ADJUSTMENTS = [
  { amount: 10, label: '+10 FC' },
  { amount: 25, label: '+25 FC' },
  { amount: 50, label: '+50 FC' },
  { amount: -10, label: '-10 FC' },
  { amount: -25, label: '-25 FC' },
];

const PRESET_REASONS = [
  'Bonus for extra help',
  'Birthday gift',
  'Good behavior reward',
  'Correction for error',
  'Lost privileges',
];
```

### 5. Animation System

#### 5.1 FAMCOIN Earning Animation
**File**: `/components/child/FamcoinEarningAnimation.tsx` (new)

```typescript
interface FamcoinEarningAnimationProps {
  amount: number;
  onComplete: () => void;
}

export function FamcoinEarningAnimation({ 
  amount, 
  onComplete 
}: FamcoinEarningAnimationProps) {
  // Coin shower animation
  // Counter incrementing animation
  // Success sound effect
  // Haptic feedback
  
  return (
    <Modal transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/50">
        <LottieView
          source={require('@/assets/animations/coins.json')}
          autoPlay
          loop={false}
          onAnimationFinish={onComplete}
        />
        <Text className="text-4xl font-bold text-yellow-500">
          +{amount} FAMCOINS!
        </Text>
      </View>
    </Modal>
  );
}
```

### 6. Parent Dashboard Integration

#### 6.1 Family FAMCOIN Overview
**File**: `/components/parent/FamilyFamcoinOverview.tsx` (new)

```typescript
export function FamilyFamcoinOverview() {
  const children = useSelector(selectAllChildren);
  const balances = useSelector(selectAllBalances);
  
  const totalBalance = Object.values(balances).reduce(
    (sum, child) => sum + child.balance, 
    0
  );
  
  return (
    <View className="bg-white rounded-xl p-4 shadow-sm">
      <Text className="text-lg font-bold mb-3">Family FAMCOINS</Text>
      
      <View className="mb-4 p-3 bg-indigo-50 rounded-lg">
        <Text className="text-sm text-gray-600">Total Balance</Text>
        <Text className="text-2xl font-bold text-indigo-600">
          {totalBalance} FC
        </Text>
      </View>
      
      {children.map(child => (
        <View key={child.id} className="flex-row items-center py-2">
          <Image source={{ uri: child.avatar_url }} className="w-8 h-8 rounded-full" />
          <Text className="flex-1 ml-2">{child.name}</Text>
          <FamcoinBalance childId={child.id} size="small" />
        </View>
      ))}
    </View>
  );
}
```

### 7. Transaction History Screen

#### 7.1 Child Transaction History
**File**: `/app/child/famcoins/history.tsx` (new)

```typescript
export default function ChildTransactionHistory() {
  const childId = useSelector(selectCurrentChildId);
  const transactions = useSelector(selectChildTransactions(childId));
  const filters = useSelector(selectTransactionFilters);
  
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="p-4">
        <FamcoinBalance childId={childId} size="large" showPending />
      </View>
      
      <TransactionFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />
      
      <FlashList
        data={transactions}
        renderItem={({ item }) => (
          <TransactionListItem transaction={item} />
        )}
        estimatedItemSize={80}
        ListEmptyComponent={<EmptyTransactions />}
      />
    </SafeAreaView>
  );
}
```

#### 7.2 Parent Transaction Management
**File**: `/app/(parent)/famcoins/index.tsx` (new)

Features:
- View all children's transactions
- Filter by child, date, type
- Manual balance adjustments
- Export transaction history
- Analytics charts

### 8. Real-time Balance Sync

#### 8.1 Balance Subscription Hook
**File**: `/hooks/useFamcoinSubscription.ts` (new)

```typescript
export function useFamcoinSubscription(childIds: string[]) {
  const dispatch = useDispatch();
  
  useEffect(() => {
    const subscriptions = childIds.map(childId => 
      famcoinService.subscribeToChildBalance(
        childId,
        (newBalance) => {
          dispatch(updateChildBalance({ childId, balance: newBalance }));
        }
      )
    );

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [childIds, dispatch]);
}
```

### 9. Analytics and Reporting

#### 9.1 FAMCOIN Analytics Service
**File**: `/services/famcoinAnalytics.ts` (new)

```typescript
class FamcoinAnalyticsService {
  async getEarningsTrend(
    childId: string,
    period: 'week' | 'month' | 'year'
  ): Promise<EarningsTrend[]> {
    // Group transactions by period
    // Calculate totals and averages
  }

  async getSpendingCategories(
    childId: string,
    dateRange: DateRange
  ): Promise<SpendingCategory[]> {
    // Analyze wishlist spending patterns
  }

  async getFamilyReport(
    parentId: string,
    month: string
  ): Promise<FamilyReport> {
    // Total earnings, spending, adjustments
    // Per-child breakdowns
    // Task completion rates
  }
}
```

### 10. Error Handling

#### 10.1 Transaction Errors
- Insufficient balance → Show current balance and deficit
- Concurrent updates → Retry with latest balance
- Network failure → Queue for retry
- Invalid amount → Input validation

#### 10.2 Balance Sync Errors
- Connection lost → Show cached balance with indicator
- Subscription failure → Exponential backoff retry
- Data inconsistency → Reconciliation process

### 11. Testing Requirements

#### 11.1 Unit Tests
- Transaction calculations
- Balance update logic
- Filter functions
- Animation triggers

#### 11.2 Integration Tests
- Task approval → FAMCOIN award flow
- Manual adjustments
- Real-time sync
- Transaction history queries

## Success Criteria

1. **Accuracy**
   - FAMCOIN calculations are always correct
   - No double-spending or double-earning
   - Balances remain consistent across devices
   - Transaction history is complete

2. **Performance**
   - Balance updates appear instantly
   - Transaction history loads quickly
   - Animations run at 60fps
   - No memory leaks from subscriptions

3. **User Experience**
   - Clear visual feedback for earnings
   - Easy-to-understand transaction history
   - Intuitive balance adjustments
   - Helpful analytics insights

4. **Reliability**
   - Transactions are atomic
   - Network failures handled gracefully
   - Data integrity maintained
   - Audit trail preserved

## Dependencies

### NPM Packages
- `lottie-react-native` - Earning animations
- `react-native-sound` - Success sounds
- `react-native-haptic-feedback` - Tactile feedback
- `react-native-svg` - Charts and graphs

### Database Requirements
- Stored procedures for atomic operations
- Indexes on transaction queries
- Real-time subscriptions enabled

## Migration Notes

- Integrates with existing approval flow
- Extends current Redux patterns
- No breaking changes to schema
- Backward compatible with existing data