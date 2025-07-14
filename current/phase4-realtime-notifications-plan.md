# Phase 4: Real-time and Notification System - Detailed Execution Plan

## Overview
This phase implements live status updates across devices, push notifications for task events, and celebration systems for positive reinforcement. It ensures family members stay connected and informed about task progress in real-time.

## Implementation Steps

### 1. Push Notification Setup

#### 1.1 Expo Push Notification Configuration
**File**: `/services/notificationService.ts` (new)

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

class NotificationService {
  private pushToken: string | null = null;

  async initialize() {
    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Register for push notifications
    if (Device.isDevice) {
      const token = await this.registerForPushNotifications();
      if (token) {
        await this.savePushToken(token);
      }
    }
  }

  private async registerForPushNotifications(): Promise<string | null> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    return token.data;
  }

  private async savePushToken(token: string) {
    // Save to user profile or device record
    const deviceType = await this.getDeviceType();
    
    if (deviceType === 'parent') {
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
    } else {
      await supabase
        .from('children')
        .update({ device_push_token: token })
        .eq('id', childId);
    }
  }

  async scheduleTaskReminder(
    childId: string,
    taskName: string,
    time: Date
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Task Reminder",
        body: `Time to complete: ${taskName}`,
        data: { childId, type: 'task_reminder' },
      },
      trigger: time,
    });
  }

  async sendLocalNotification(
    title: string,
    body: string,
    data?: any
  ) {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null, // Immediate
    });
  }
}

export const notificationService = new NotificationService();
```

#### 1.2 Database Schema Update
**File**: `/supabase/migrations/xxx_notification_tokens.sql` (new)

```sql
-- Add push token columns
ALTER TABLE profiles 
ADD COLUMN push_token TEXT,
ADD COLUMN notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN notification_preferences JSONB DEFAULT '{
  "task_completed": true,
  "task_approved": true,
  "task_rejected": true,
  "daily_summary": true,
  "weekly_report": true
}'::jsonb;

ALTER TABLE children
ADD COLUMN device_push_token TEXT,
ADD COLUMN notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN notification_preferences JSONB DEFAULT '{
  "task_reminder": true,
  "task_approved": true,
  "task_rejected": true,
  "famcoin_earned": true,
  "achievement_unlocked": true
}'::jsonb;

-- Notification log table
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_type TEXT CHECK (recipient_type IN ('parent', 'child')),
  recipient_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  error TEXT
);

CREATE INDEX idx_notification_logs_recipient ON notification_logs(recipient_id, sent_at DESC);
```

### 2. Real-time Infrastructure

#### 2.1 Supabase Realtime Configuration
**File**: `/services/realtimeService.ts` (new)

```typescript
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();

  subscribeToTaskCompletions(
    parentId: string,
    onTaskCompleted: (completion: any) => void,
    onTaskApproved: (completion: any) => void
  ): () => void {
    const channelName = `tasks:parent:${parentId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'task_completions',
          filter: `status=eq.child_completed`,
        },
        (payload) => {
          this.handleTaskCompleted(payload, parentId, onTaskCompleted);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'task_completions',
          filter: `status=eq.parent_approved`,
        },
        (payload) => {
          this.handleTaskApproved(payload, onTaskApproved);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime subscription active');
          this.reconnectAttempts.set(channelName, 0);
        } else if (status === 'CHANNEL_ERROR') {
          this.handleReconnect(channelName, () => 
            this.subscribeToTaskCompletions(parentId, onTaskCompleted, onTaskApproved)
          );
        }
      });

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  subscribeToChildUpdates(
    childId: string,
    onApproval: (data: any) => void,
    onRejection: (data: any) => void,
    onFamcoinEarned: (data: any) => void
  ): () => void {
    const channelName = `child:${childId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'task_completions',
          filter: `child_id=eq.${childId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          const oldStatus = payload.old.status;
          
          if (oldStatus === 'child_completed' && newStatus === 'parent_approved') {
            onApproval(payload.new);
          } else if (oldStatus === 'child_completed' && newStatus === 'parent_rejected') {
            onRejection(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'famcoin_transactions',
          filter: `child_id=eq.${childId}`,
        },
        (payload) => {
          if (payload.new.transaction_type === 'earned') {
            onFamcoinEarned(payload.new);
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  private handleReconnect(channelName: string, resubscribe: () => void) {
    const attempts = this.reconnectAttempts.get(channelName) || 0;
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // Max 30s
    
    this.reconnectAttempts.set(channelName, attempts + 1);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect ${channelName}`);
      resubscribe();
    }, delay);
  }

  subscribeTofamilyActivity(
    familyId: string,
    onActivity: (activity: FamilyActivity) => void
  ): () => void {
    // Subscribe to all family member activities
    // Show live indicators when family members are active
  }

  unsubscribeAll() {
    this.channels.forEach(channel => channel.unsubscribe());
    this.channels.clear();
    this.reconnectAttempts.clear();
  }
}

export const realtimeService = new RealtimeService();
```

#### 2.2 Redux Real-time Integration
**File**: `/store/slices/realtimeSlice.ts` (new)

```typescript
interface RealtimeState {
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  activeSubscriptions: string[];
  recentActivities: FamilyActivity[];
  unreadNotifications: number;
}

interface FamilyActivity {
  id: string;
  type: 'task_completed' | 'task_approved' | 'famcoin_earned' | 'achievement';
  actorName: string;
  actorType: 'parent' | 'child';
  description: string;
  timestamp: string;
  metadata?: any;
}

const realtimeSlice = createSlice({
  name: 'realtime',
  initialState,
  reducers: {
    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload;
    },
    addActivity: (state, action) => {
      state.recentActivities.unshift(action.payload);
      // Keep only last 50 activities
      state.recentActivities = state.recentActivities.slice(0, 50);
    },
    incrementUnreadNotifications: (state) => {
      state.unreadNotifications += 1;
    },
    resetUnreadNotifications: (state) => {
      state.unreadNotifications = 0;
    },
  },
});
```

### 3. Notification Triggers

#### 3.1 Edge Function for Push Notifications
**File**: `/supabase/functions/send-notification/index.ts` (new)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface NotificationPayload {
  recipientType: 'parent' | 'child';
  recipientId: string;
  notificationType: string;
  title: string;
  body: string;
  data?: any;
}

serve(async (req) => {
  const payload: NotificationPayload = await req.json();
  
  // Get push token
  const pushToken = await getPushToken(
    payload.recipientType,
    payload.recipientId
  );
  
  if (!pushToken) {
    return new Response(
      JSON.stringify({ error: 'No push token found' }),
      { status: 404 }
    );
  }
  
  // Check notification preferences
  const isEnabled = await checkNotificationPreference(
    payload.recipientType,
    payload.recipientId,
    payload.notificationType
  );
  
  if (!isEnabled) {
    return new Response(
      JSON.stringify({ message: 'Notification type disabled' }),
      { status: 200 }
    );
  }
  
  // Send via Expo Push API
  const message = {
    to: pushToken,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data,
  };
  
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  
  // Log notification
  await logNotification(payload);
  
  return new Response(
    JSON.stringify({ success: true }),
    { status: 200 }
  );
});
```

#### 3.2 Database Triggers for Notifications
**File**: `/supabase/migrations/xxx_notification_triggers.sql` (new)

```sql
-- Trigger for task completion notifications
CREATE OR REPLACE FUNCTION notify_task_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'child_completed' AND OLD.status = 'pending' THEN
    -- Get parent ID
    PERFORM http_post(
      'https://your-project.supabase.co/functions/v1/send-notification',
      json_build_object(
        'recipientType', 'parent',
        'recipientId', (SELECT parent_id FROM children WHERE id = NEW.child_id),
        'notificationType', 'task_completed',
        'title', 'Task Completed',
        'body', format('%s completed a task', 
          (SELECT name FROM children WHERE id = NEW.child_id)),
        'data', json_build_object(
          'taskCompletionId', NEW.id,
          'childId', NEW.child_id
        )
      )::text,
      'application/json'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_completion_notification
AFTER UPDATE ON task_completions
FOR EACH ROW
EXECUTE FUNCTION notify_task_completed();

-- Similar triggers for approvals, rejections, FAMCOIN earnings
```

### 4. UI Updates for Real-time Features

#### 4.1 Live Activity Indicators
**File**: `/components/common/LiveActivityIndicator.tsx` (new)

```typescript
export function LiveActivityIndicator() {
  const recentActivities = useSelector(selectRecentActivities);
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (recentActivities.length > 0) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [recentActivities]);
  
  if (!visible || recentActivities.length === 0) return null;
  
  const latestActivity = recentActivities[0];
  
  return (
    <Animated.View 
      entering={SlideInUp}
      exiting={SlideOutUp}
      className="absolute top-20 left-4 right-4 bg-white rounded-lg shadow-lg p-3"
    >
      <View className="flex-row items-center">
        <View className="w-2 h-2 bg-green-500 rounded-full mr-2">
          <Animated.View
            className="absolute inset-0 bg-green-500 rounded-full"
            style={[animatedPulse]}
          />
        </View>
        <Text className="flex-1 text-sm">
          {latestActivity.description}
        </Text>
        <Text className="text-xs text-gray-500">
          just now
        </Text>
      </View>
    </Animated.View>
  );
}
```

#### 4.2 Real-time Status Updates
**File**: `/hooks/useRealtimeTaskStatus.ts` (new)

```typescript
export function useRealtimeTaskStatus(taskCompletionId: string) {
  const dispatch = useDispatch();
  const [status, setStatus] = useState<TaskStatus>('pending');
  
  useEffect(() => {
    const channel = supabase
      .channel(`task:${taskCompletionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'task_completions',
          filter: `id=eq.${taskCompletionId}`,
        },
        (payload) => {
          setStatus(payload.new.status);
          
          // Trigger appropriate UI feedback
          if (payload.new.status === 'parent_approved') {
            dispatch(showApprovalCelebration());
          } else if (payload.new.status === 'parent_rejected') {
            dispatch(showRejectionFeedback(payload.new.rejection_reason));
          }
        }
      )
      .subscribe();
      
    return () => {
      channel.unsubscribe();
    };
  }, [taskCompletionId, dispatch]);
  
  return status;
}
```

### 5. Celebration and Feedback Systems

#### 5.1 Celebration Manager
**File**: `/services/celebrationService.ts` (new)

```typescript
import Sound from 'react-native-sound';
import * as Haptics from 'expo-haptics';

class CelebrationService {
  private sounds: Map<string, Sound> = new Map();
  
  async initialize() {
    // Preload celebration sounds
    const soundFiles = {
      taskComplete: require('@/assets/sounds/task-complete.mp3'),
      famcoinEarned: require('@/assets/sounds/coins.mp3'),
      achievement: require('@/assets/sounds/achievement.mp3'),
      levelUp: require('@/assets/sounds/level-up.mp3'),
    };
    
    Object.entries(soundFiles).forEach(([key, file]) => {
      const sound = new Sound(file, Sound.MAIN_BUNDLE, (error) => {
        if (!error) {
          this.sounds.set(key, sound);
        }
      });
    });
  }
  
  async celebrateTaskCompletion() {
    // Play sound
    this.playSound('taskComplete');
    
    // Trigger haptic feedback
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );
    
    // Show animation (handled by component)
  }
  
  async celebrateFamcoinEarned(amount: number) {
    // Play coin sound
    this.playSound('famcoinEarned');
    
    // Special celebration for milestone amounts
    if (amount >= 100) {
      this.playSound('achievement');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }
  
  private playSound(soundKey: string) {
    const sound = this.sounds.get(soundKey);
    if (sound) {
      sound.play();
    }
  }
}

export const celebrationService = new CelebrationService();
```

#### 5.2 Celebration Components
**File**: `/components/celebrations/TaskCompletionCelebration.tsx` (new)

```typescript
export function TaskCompletionCelebration({ 
  visible, 
  onComplete 
}: CelebrationProps) {
  useEffect(() => {
    if (visible) {
      celebrationService.celebrateTaskCompletion();
    }
  }, [visible]);
  
  if (!visible) return null;
  
  return (
    <Modal transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/50">
        <LottieView
          source={require('@/assets/animations/confetti.json')}
          autoPlay
          loop={false}
          style={{ width: 300, height: 300 }}
        />
        <Animated.View
          entering={ZoomIn.delay(300)}
          className="bg-white rounded-xl p-6 mx-4"
        >
          <Text className="text-2xl font-bold text-center mb-2">
            Great Job! 🎉
          </Text>
          <Text className="text-gray-600 text-center">
            Task completed! Waiting for parent approval...
          </Text>
          <TouchableOpacity
            onPress={onComplete}
            className="mt-4 bg-indigo-600 rounded-lg py-3"
          >
            <Text className="text-white text-center font-medium">
              Continue
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
```

### 6. Notification Management UI

#### 6.1 Notification Settings Screen
**File**: `/app/(parent)/settings/notifications.tsx` (new)

```typescript
export default function NotificationSettings() {
  const user = useSelector(selectUser);
  const [preferences, setPreferences] = useState<NotificationPreferences>();
  
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <Text className="text-lg font-bold mb-4">Notification Settings</Text>
        
        <View className="bg-white rounded-xl p-4 mb-4">
          <SwitchRow
            label="Task Completions"
            value={preferences?.task_completed}
            onValueChange={(value) => updatePreference('task_completed', value)}
          />
          <SwitchRow
            label="Task Approvals"
            value={preferences?.task_approved}
            onValueChange={(value) => updatePreference('task_approved', value)}
          />
          <SwitchRow
            label="Daily Summary"
            value={preferences?.daily_summary}
            onValueChange={(value) => updatePreference('daily_summary', value)}
          />
        </View>
        
        <View className="bg-white rounded-xl p-4">
          <Text className="font-medium mb-3">Quiet Hours</Text>
          <TimePicker
            label="Start"
            value={preferences?.quiet_hours_start}
            onChange={setQuietHoursStart}
          />
          <TimePicker
            label="End"
            value={preferences?.quiet_hours_end}
            onChange={setQuietHoursEnd}
          />
        </View>
      </View>
    </ScrollView>
  );
}
```

### 7. Background Tasks

#### 7.1 Daily Summary Notifications
**File**: `/supabase/functions/daily-summary/index.ts` (new)

```typescript
// Scheduled function to send daily summaries
serve(async (req) => {
  const parents = await getParentsWithDailySummaryEnabled();
  
  for (const parent of parents) {
    const summary = await generateDailySummary(parent.id);
    
    if (summary.hasPendingApprovals || summary.hasCompletedTasks) {
      await sendNotification({
        recipientType: 'parent',
        recipientId: parent.id,
        notificationType: 'daily_summary',
        title: 'Daily Task Summary',
        body: formatSummaryMessage(summary),
        data: summary,
      });
    }
  }
  
  return new Response(JSON.stringify({ success: true }));
});
```

### 8. Connection Status Management

#### 8.1 Connection Monitor
**File**: `/components/common/ConnectionStatus.tsx` (new)

```typescript
export function ConnectionStatus() {
  const connectionStatus = useSelector(selectConnectionStatus);
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    if (connectionStatus !== 'connected') {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus]);
  
  if (!show) return null;
  
  return (
    <Animated.View
      entering={SlideInDown}
      exiting={SlideOutDown}
      className={`absolute bottom-20 left-4 right-4 p-3 rounded-lg ${
        connectionStatus === 'connected' ? 'bg-green-500' : 'bg-orange-500'
      }`}
    >
      <Text className="text-white text-center">
        {connectionStatus === 'connected' 
          ? '✓ Connected' 
          : connectionStatus === 'reconnecting'
          ? 'Reconnecting...'
          : 'No connection'}
      </Text>
    </Animated.View>
  );
}
```

### 9. Testing Requirements

#### 9.1 Unit Tests
- Notification permission handling
- Real-time message processing
- Celebration trigger logic
- Connection state management

#### 9.2 Integration Tests
- End-to-end notification flow
- Real-time update propagation
- Offline/online transitions
- Multi-device synchronization

## Success Criteria

1. **Real-time Performance**
   - Updates appear within 1 second
   - Smooth reconnection handling
   - Minimal battery impact
   - Efficient bandwidth usage

2. **Notification Delivery**
   - 95%+ delivery rate
   - Correct routing to devices
   - Respect user preferences
   - Handle quiet hours

3. **User Experience**
   - Delightful celebrations
   - Non-intrusive notifications
   - Clear connection status
   - Smooth animations

4. **Reliability**
   - Graceful degradation offline
   - Automatic reconnection
   - No duplicate notifications
   - Preserved message order

## Dependencies

### NPM Packages
- `expo-notifications` - Push notifications
- `expo-haptics` - Haptic feedback
- `react-native-sound` - Audio playback
- `lottie-react-native` - Animations

### Backend Requirements
- Supabase Realtime enabled
- Edge Functions deployed
- Expo Push Service configured
- Database triggers created

## Migration Notes

- Requires notification permissions
- Database schema additions needed
- Edge functions deployment required
- No breaking changes to existing code