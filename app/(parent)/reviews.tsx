import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { useRouter, useFocusEffect } from "expo-router";
import { Check, X, Clock, AlertCircle } from "lucide-react-native";
import { format, formatDistanceToNow } from "date-fns";
import TaskReviewModal from "../../components/TaskReviewModal";
import { taskService } from "../../services/taskService";
import { decrementPendingCount } from "../../store/slices/parentSlice";

interface PendingTaskCompletion {
  id: string;
  taskName: string;
  childName: string;
  childId: string;
  childAvatar?: string;
  famcoinValue: number;
  effortScore: number;
  completedAt: string;
  dueDate: string;
  photoUrl?: string;
  photoRequired: boolean;
  status: 'child_completed';
}

export default function ParentReviewsScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [pendingTasks, setPendingTasks] = useState<PendingTaskCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<PendingTaskCompletion | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Fetch pending task completions
  const fetchPendingCompletions = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const data = await taskService.getPendingCompletions(user.id);
      setPendingTasks(data);
    } catch (err) {
      console.error('Error fetching pending completions:', err);
      setError('Failed to load pending tasks');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  // Load data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchPendingCompletions();
    }, [fetchPendingCompletions])
  );

  const handleTaskPress = (task: PendingTaskCompletion) => {
    setSelectedTask(task);
    setIsReviewModalOpen(true);
  };

  const handleApprove = async (taskId: string, feedback?: string) => {
    if (!user?.id) return;
    
    try {
      await taskService.approveTaskCompletion(taskId, user.id, feedback);
      // Immediately update the count in Redux
      dispatch(decrementPendingCount());
      setIsReviewModalOpen(false);
      // Refresh the list
      fetchPendingCompletions(true);
    } catch (error) {
      console.error('Error approving task:', error);
      setError('Failed to approve task. Please try again.');
    }
  };

  const handleReject = async (taskId: string, reason: string) => {
    if (!user?.id) return;
    
    try {
      await taskService.rejectTaskCompletion(taskId, user.id, reason);
      // Immediately update the count in Redux
      dispatch(decrementPendingCount());
      setIsReviewModalOpen(false);
      // Refresh the list
      fetchPendingCompletions(true);
    } catch (error) {
      console.error('Error rejecting task:', error);
      setError('Failed to reject task. Please try again.');
    }
  };

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Check size={48} color="#10b981" />
      <Text className="text-xl font-semibold text-gray-900 mt-4">
        All caught up!
      </Text>
      <Text className="text-gray-600 text-center mt-2 px-8">
        No tasks waiting for your review. Check back later.
      </Text>
    </View>
  );

  const renderTaskCard = (task: PendingTaskCompletion) => (
    <TouchableOpacity
      key={task.id}
      onPress={() => handleTaskPress(task)}
      className="bg-white rounded-xl p-4 mb-3 shadow-sm"
    >
      <View className="flex-row items-start">
        {/* Child Avatar */}
        <View className="w-12 h-12 rounded-full bg-indigo-100 items-center justify-center mr-3">
          <Text className="text-xl">{task.childAvatar}</Text>
        </View>

        {/* Task Details */}
        <View className="flex-1">
          <Text className="font-semibold text-gray-900 text-lg">
            {task.taskName}
          </Text>
          <Text className="text-gray-600 text-sm mt-1">
            {task.childName} • {formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}
          </Text>
          
          {/* Task Metadata */}
          <View className="flex-row items-center mt-2">
            <View className="bg-green-100 px-2 py-1 rounded-full mr-2">
              <Text className="text-green-700 text-xs font-medium">
                {task.famcoinValue} FC
              </Text>
            </View>
            <View className="bg-indigo-100 px-2 py-1 rounded-full mr-2">
              <Text className="text-indigo-700 text-xs font-medium">
                Effort: {task.effortScore}/5
              </Text>
            </View>
            {task.photoRequired && (
              <View className="bg-gray-100 px-2 py-1 rounded-full">
                <Text className="text-gray-700 text-xs font-medium">
                  📷 Photo
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Photo Preview */}
        {task.photoUrl && (
          <Image
            source={{ uri: task.photoUrl }}
            className="w-16 h-16 rounded-lg ml-2"
            resizeMode="cover"
          />
        )}
      </View>

      {/* Action Hint */}
      <View className="flex-row items-center justify-end mt-3 pt-3 border-t border-gray-100">
        <Text className="text-sm text-gray-500 mr-2">Tap to review</Text>
        <Clock size={16} color="#6b7280" />
      </View>
    </TouchableOpacity>
  );

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text className="text-gray-600 mt-2">Loading pending reviews...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900">Task Reviews</Text>
          <View className="bg-indigo-600 px-3 py-1 rounded-full">
            <Text className="text-white font-medium">
              {pendingTasks.length} pending
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchPendingCompletions(true)}
            tintColor="#4f46e5"
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
      >
        {error && (
          <View className="bg-red-50 rounded-lg p-4 mb-4 flex-row items-center">
            <AlertCircle size={20} color="#dc2626" />
            <Text className="text-red-800 ml-2 flex-1">{error}</Text>
          </View>
        )}

        {pendingTasks.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <Text className="text-sm text-gray-600 mb-4">
              Review and approve completed tasks to award FAMCOINs
            </Text>
            {pendingTasks.map(renderTaskCard)}
          </>
        )}
      </ScrollView>

      {/* Review Modal */}
      {selectedTask && (
        <TaskReviewModal
          isVisible={isReviewModalOpen}
          task={selectedTask}
          onClose={() => setIsReviewModalOpen(false)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </SafeAreaView>
  );
}