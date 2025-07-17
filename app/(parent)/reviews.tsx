import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { useRouter, useFocusEffect } from "expo-router";
import { 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  ChevronDown,
  CheckSquare,
  Circle,
  Coins,
  Square,
} from "lucide-react-native";
import { format, formatDistanceToNow, addDays, subDays } from "date-fns";
import TaskReviewModal from "../../components/TaskReviewModal";
import DateNavigator from "../../components/DateNavigator";
import BulkActionBar from "../../components/BulkActionBar";
import { taskService } from "../../services/taskService";
import { decrementPendingCount } from "../../store/slices/parentSlice";
import { Alert } from "../../lib/alert";

interface TaskCompletion {
  id: string;
  taskName: string;
  taskDescription?: string;
  groupName: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  childName: string;
  childId: string;
  childAvatar?: string;
  famcoinValue: number;
  effortScore: number;
  completedAt?: string;
  approvedAt?: string;
  dueDate: string;
  photoUrl?: string;
  photoRequired: boolean;
  status: 'pending' | 'child_completed' | 'parent_approved' | 'parent_rejected';
  rejectionReason?: string;
  feedback?: string;
}

interface TaskAccordionProps {
  title: string;
  count: number;
  tasks: TaskCompletion[];
  color: string;
  defaultOpen?: boolean;
  onTaskPress: (task: TaskCompletion) => void;
  onCompleteOnBehalf?: (task: TaskCompletion) => void;
  showCompleteButton?: boolean;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (taskId: string, selected: boolean) => void;
}

function TaskAccordion({ 
  title, 
  count, 
  tasks, 
  color, 
  defaultOpen = false,
  onTaskPress,
  onCompleteOnBehalf,
  showCompleteButton = false,
  selectionMode = false,
  selectedIds = new Set(),
  onSelectionChange,
}: TaskAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [animation] = useState(new Animated.Value(defaultOpen ? 1 : 0));

  const toggleAccordion = () => {
    const toValue = isOpen ? 0 : 1;
    
    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setIsOpen(!isOpen);
  };

  if (count === 0) return null;

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View className="mb-4">
      <TouchableOpacity
        onPress={toggleAccordion}
        className={`bg-${color}-50 rounded-xl p-4 flex-row items-center justify-between border border-${color}-200`}
        style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
      >
        <View className="flex-row items-center flex-1">
          <Text className={`text-base font-semibold text-${color}-900`}>
            {title}
          </Text>
          <View className={`bg-${color}-500 rounded-full px-2 py-1 ml-2`} style={{ backgroundColor: color }}>
            <Text className="text-white font-bold text-sm">{count}</Text>
          </View>
        </View>
        
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <ChevronDown size={20} color={color} />
        </Animated.View>
      </TouchableOpacity>

      {isOpen && (
        <View className="mt-2">
          {tasks.map((task) => {
            const isSelected = selectedIds.has(task.id);
            return (
              <TouchableOpacity
                key={task.id}
                onPress={() => {
                  if (selectionMode && onSelectionChange) {
                    onSelectionChange(task.id, !isSelected);
                  } else {
                    onTaskPress(task);
                  }
                }}
                className={`bg-white rounded-lg p-4 mb-2 shadow-sm ${
                  isSelected ? 'border-2 border-indigo-500' : ''
                }`}
              >
                <View className="flex-row items-start">
                {/* Selection Checkbox or Child Avatar */}
                {selectionMode ? (
                  <View className="w-10 h-10 mr-3 items-center justify-center">
                    {isSelected ? (
                      <CheckSquare size={24} color="#4f46e5" />
                    ) : (
                      <Square size={24} color="#9ca3af" />
                    )}
                  </View>
                ) : (
                  <Image
                    source={{ uri: task.childAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + task.childName }}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                )}
                
                <View className="flex-1">
                  {/* Task Name and Child Name */}
                  <Text className="text-base font-semibold text-gray-900">{task.taskName}</Text>
                  <Text className="text-sm text-gray-600">{task.childName} • {task.groupName}</Text>
                  
                  {/* Task Details */}
                  <View className="flex-row items-center mt-2">
                    <View className="flex-row items-center mr-4">
                      <Coins size={14} color="#10b981" />
                      <Text className="text-sm font-medium text-green-700 ml-1">{task.famcoinValue} FC</Text>
                    </View>
                    
                    <Text className="text-xs text-gray-500">
                      {task.completedAt 
                        ? formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })
                        : format(new Date(task.dueDate), 'MMM d')}
                    </Text>
                  </View>
                  
                  {/* Status-specific info */}
                  {task.status === 'parent_rejected' && task.rejectionReason && (
                    <View className="bg-orange-50 rounded-lg p-2 mt-2">
                      <Text className="text-xs text-orange-800">Reason: {task.rejectionReason}</Text>
                    </View>
                  )}
                  
                  {task.status === 'parent_approved' && task.feedback && (
                    <View className="bg-green-50 rounded-lg p-2 mt-2">
                      <Text className="text-xs text-green-800">Feedback: {task.feedback}</Text>
                    </View>
                  )}
                  
                  {/* Complete on Behalf Button */}
                  {showCompleteButton && onCompleteOnBehalf && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onCompleteOnBehalf(task);
                      }}
                      className="bg-blue-100 rounded-lg px-3 py-2 mt-2 self-start"
                    >
                      <Text className="text-sm font-medium text-blue-700">Complete on behalf</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function ParentReviewsScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateTasks, setDateTasks] = useState<TaskCompletion[]>([]);
  const [pendingApprovalTasks, setPendingApprovalTasks] = useState<TaskCompletion[]>([]);
  const [rejectedTasks, setRejectedTasks] = useState<TaskCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskCompletion | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Date navigation handlers
  const navigateDate = (direction: "prev" | "next") => {
    const currentDate = new Date(selectedDate);
    const newDate = direction === "prev" 
      ? subDays(currentDate, 1) 
      : addDays(currentDate, 1);
    setSelectedDate(format(newDate, "yyyy-MM-dd"));
  };

  const goToToday = () => {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  };

  // Fetch tasks for selected date
  const fetchTasksForDate = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const tasks = await taskService.getParentReviewTasksByDate(user.id, selectedDate);
      setDateTasks(tasks);
    } catch (err) {
      console.error('Error fetching tasks for date:', err);
      setError('Failed to load tasks');
    }
  }, [user?.id, selectedDate]);

  // Fetch non-date-specific tasks
  const fetchNonDateSpecificTasks = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const [pending, rejected] = await Promise.all([
        taskService.getParentPendingApprovalTasks(user.id),
        taskService.getParentRejectedTasks(user.id)
      ]);
      
      setPendingApprovalTasks(pending);
      setRejectedTasks(rejected);
    } catch (err) {
      console.error('Error fetching non-date specific tasks:', err);
    }
  }, [user?.id]);

  // Load all data
  const loadData = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      await Promise.all([
        fetchTasksForDate(),
        fetchNonDateSpecificTasks()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchTasksForDate, fetchNonDateSpecificTasks]);

  // Load data when screen gains focus or date changes
  useEffect(() => {
    loadData();
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleTaskPress = (task: TaskCompletion) => {
    setSelectedTask(task);
    setIsReviewModalOpen(true);
  };

  const handleApprove = async (taskId: string, feedback?: string) => {
    if (!user?.id) return;
    
    try {
      await taskService.approveTaskCompletion(taskId, user.id, feedback);
      dispatch(decrementPendingCount());
      setIsReviewModalOpen(false);
      loadData(true);
      Alert.alert('Success', 'Task approved successfully!');
    } catch (error) {
      console.error('Error approving task:', error);
      Alert.alert('Error', 'Failed to approve task. Please try again.');
    }
  };

  const handleReject = async (taskId: string, reason: string) => {
    if (!user?.id) return;
    
    try {
      await taskService.rejectTaskCompletion(taskId, user.id, reason);
      dispatch(decrementPendingCount());
      setIsReviewModalOpen(false);
      loadData(true);
      Alert.alert('Success', 'Task sent back for revision');
    } catch (error) {
      console.error('Error rejecting task:', error);
      Alert.alert('Error', 'Failed to reject task. Please try again.');
    }
  };

  const handleCompleteOnBehalf = async (task: TaskCompletion) => {
    if (!user?.id) return;
    
    Alert.alert(
      'Complete on Behalf',
      `Are you sure you want to mark "${task.taskName}" as completed for ${task.childName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await taskService.completeTaskOnBehalf(task.id, user.id);
              loadData(true);
              Alert.alert('Success', `Task approved and ${task.famcoinValue} FAMCOINs awarded!`);
            } catch (error) {
              console.error('Error completing task on behalf:', error);
              Alert.alert('Error', 'Failed to complete task');
            }
          }
        }
      ]
    );
  };

  const handleSelectionChange = (taskId: string, selected: boolean) => {
    const newSelection = new Set(selectedTaskIds);
    if (selected) {
      newSelection.add(taskId);
    } else {
      newSelection.delete(taskId);
    }
    setSelectedTaskIds(newSelection);
  };

  const handleBulkApprove = async () => {
    if (!user?.id) return;
    
    const selectedTasks = pendingApprovalTasks.filter(t => selectedTaskIds.has(t.id));
    const totalValue = selectedTasks.reduce((sum, task) => sum + task.famcoinValue, 0);
    
    Alert.alert(
      'Bulk Approve Tasks',
      `Approve ${selectedTaskIds.size} tasks and award ${totalValue} total FAMCOINs?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve All',
          onPress: async () => {
            try {
              const result = await taskService.bulkApproveTaskCompletions(
                Array.from(selectedTaskIds),
                user.id,
                'Bulk approved'
              );
              
              // Update Redux count
              for (let i = 0; i < result.successful.length; i++) {
                dispatch(decrementPendingCount());
              }
              
              setIsSelectionMode(false);
              setSelectedTaskIds(new Set());
              loadData(true);
              
              if (result.failed.length > 0) {
                Alert.alert(
                  'Partial Success',
                  `Approved ${result.successful.length} tasks. ${result.failed.length} failed.`
                );
              } else {
                Alert.alert('Success', `All ${result.successful.length} tasks approved!`);
              }
            } catch (error) {
              console.error('Error bulk approving:', error);
              Alert.alert('Error', 'Failed to approve tasks');
            }
          }
        }
      ]
    );
  };

  const handleBulkComplete = async () => {
    if (!user?.id) return;
    
    Alert.alert(
      'Bulk Complete Tasks',
      `Mark ${selectedTaskIds.size} tasks as completed on behalf of children?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete All',
          onPress: async () => {
            try {
              const result = await taskService.bulkCompleteTasksOnBehalf(
                Array.from(selectedTaskIds),
                user.id
              );
              
              setIsSelectionMode(false);
              setSelectedTaskIds(new Set());
              loadData(true);
              
              if (result.failed.length > 0) {
                Alert.alert(
                  'Partial Success',
                  `Completed ${result.successful.length} tasks. ${result.failed.length} failed.`
                );
              } else {
                Alert.alert('Success', `All ${result.successful.length} tasks completed!`);
              }
            } catch (error) {
              console.error('Error bulk completing:', error);
              Alert.alert('Error', 'Failed to complete tasks');
            }
          }
        }
      ]
    );
  };

  // Group tasks by status for display
  const pendingTasks = dateTasks.filter(t => t.status === 'pending');
  const approvedTasks = dateTasks.filter(t => t.status === 'parent_approved');
  
  // Calculate bulk action data
  const selectedPendingApprovalTasks = pendingApprovalTasks.filter(t => selectedTaskIds.has(t.id));
  const selectedPendingTasks = pendingTasks.filter(t => selectedTaskIds.has(t.id));
  const selectedTotalValue = selectedPendingApprovalTasks.reduce((sum, task) => sum + task.famcoinValue, 0);
  const showBulkApprove = selectedPendingApprovalTasks.length > 0;
  const showBulkComplete = selectedPendingTasks.length > 0;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900">
            {isSelectionMode ? `${selectedTaskIds.size} selected` : 'Task Reviews'}
          </Text>
          <View className="flex-row items-center">
            {!isSelectionMode ? (
              <>
                <View className="bg-yellow-100 rounded-full px-3 py-1">
                  <Text className="text-sm font-medium text-yellow-800">
                    {pendingApprovalTasks.length} pending
                  </Text>
                </View>
                <View className="bg-orange-100 rounded-full px-3 py-1 ml-2">
                  <Text className="text-sm font-medium text-orange-800">
                    {rejectedTasks.length} to redo
                  </Text>
                </View>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setIsSelectionMode(false);
                  setSelectedTaskIds(new Set());
                }}
                className="px-4 py-2"
              >
                <Text className="text-base font-medium text-indigo-600">Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {(pendingApprovalTasks.length > 0 || pendingTasks.length > 0) && !isSelectionMode && (
          <TouchableOpacity
            onPress={() => setIsSelectionMode(true)}
            className="mt-2 self-start"
          >
            <Text className="text-sm font-medium text-indigo-600">Select Tasks</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Date Navigation */}
      <DateNavigator
        selectedDate={selectedDate}
        onDateChange={navigateDate}
        onGoToToday={goToToday}
      />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
      >
        {error && (
          <View className="bg-red-50 rounded-lg p-4 mb-4">
            <Text className="text-red-800">{error}</Text>
          </View>
        )}

        {/* Stats Summary */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-sm font-medium text-gray-600 mb-2">
            {selectedDate === format(new Date(), "yyyy-MM-dd") ? "Today's" : format(new Date(selectedDate), "MMMM d")} Tasks
          </Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-400">{pendingTasks.length}</Text>
              <Text className="text-xs text-gray-500">Not Done</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-yellow-600">{pendingApprovalTasks.length}</Text>
              <Text className="text-xs text-gray-500">To Review</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-orange-600">{rejectedTasks.length}</Text>
              <Text className="text-xs text-gray-500">Rejected</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-600">{approvedTasks.length}</Text>
              <Text className="text-xs text-gray-500">Approved</Text>
            </View>
          </View>
        </View>

        {/* Awaiting Approval Tasks (All dates) */}
        <TaskAccordion
          title="Awaiting Approval"
          count={pendingApprovalTasks.length}
          tasks={pendingApprovalTasks}
          color="#eab308"
          defaultOpen={true}
          onTaskPress={handleTaskPress}
          selectionMode={isSelectionMode}
          selectedIds={selectedTaskIds}
          onSelectionChange={handleSelectionChange}
        />

        {/* Rejected Tasks (All dates) */}
        <TaskAccordion
          title="Sent to Redo"
          count={rejectedTasks.length}
          tasks={rejectedTasks}
          color="#ea580c"
          defaultOpen={false}
          onTaskPress={handleTaskPress}
          selectionMode={isSelectionMode}
          selectedIds={selectedTaskIds}
          onSelectionChange={handleSelectionChange}
        />

        {/* Not Done Tasks (Date-specific) */}
        <TaskAccordion
          title="Not Done"
          count={pendingTasks.length}
          tasks={pendingTasks}
          color="#6b7280"
          defaultOpen={false}
          onTaskPress={handleTaskPress}
          onCompleteOnBehalf={handleCompleteOnBehalf}
          showCompleteButton={!isSelectionMode}
          selectionMode={isSelectionMode}
          selectedIds={selectedTaskIds}
          onSelectionChange={handleSelectionChange}
        />

        {/* Approved Tasks (Date-specific) */}
        <TaskAccordion
          title="Approved"
          count={approvedTasks.length}
          tasks={approvedTasks}
          color="#10b981"
          defaultOpen={false}
          onTaskPress={handleTaskPress}
          selectionMode={isSelectionMode}
          selectedIds={selectedTaskIds}
          onSelectionChange={handleSelectionChange}
        />

        {/* Empty State */}
        {pendingApprovalTasks.length === 0 && 
         rejectedTasks.length === 0 && 
         pendingTasks.length === 0 &&
         approvedTasks.length === 0 && (
          <View className="flex-1 items-center justify-center py-20">
            <CheckSquare size={48} color="#10b981" />
            <Text className="text-lg font-semibold text-gray-900 mt-4">
              All caught up!
            </Text>
            <Text className="text-gray-600 mt-2">
              No tasks need your attention.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bulk Action Bar */}
      {isSelectionMode && (
        <BulkActionBar
          selectedCount={selectedTaskIds.size}
          totalValue={selectedTotalValue}
          onApprove={showBulkApprove ? handleBulkApprove : undefined}
          onComplete={showBulkComplete ? handleBulkComplete : undefined}
          onCancel={() => {
            setIsSelectionMode(false);
            setSelectedTaskIds(new Set());
          }}
          showApprove={showBulkApprove}
          showComplete={showBulkComplete}
        />
      )}

      {/* Task Review Modal */}
      {selectedTask && (
        <TaskReviewModal
          isVisible={isReviewModalOpen}
          task={{
            id: selectedTask.id,
            taskName: selectedTask.taskName,
            childName: selectedTask.childName,
            childAvatar: selectedTask.childAvatar,
            famcoinValue: selectedTask.famcoinValue,
            effortScore: selectedTask.effortScore,
            completedAt: selectedTask.completedAt || new Date().toISOString(),
            dueDate: selectedTask.dueDate,
            photoUrl: selectedTask.photoUrl,
            photoRequired: selectedTask.photoRequired,
          }}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedTask(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </SafeAreaView>
  );
}