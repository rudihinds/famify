import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../../store";
import { markTaskComplete, uploadTaskPhoto, fetchDailyTasks } from "../../../store/slices/taskSlice";
import { 
  ArrowLeft, 
  Camera, 
  CheckCircle, 
  Coins, 
  AlertCircle,
  Lock,
} from "lucide-react-native";
import { taskService } from "../../../services/taskService";
import { TaskDetailView } from "../../../types/task";
import PhotoCapture from "../../../components/PhotoCapture";
import { isAfter, startOfDay, parseISO } from "date-fns";

export default function TaskDetailScreen() {
  const { id, quickPhoto } = useLocalSearchParams<{ id: string; quickPhoto?: string }>();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { photoUploadProgress } = useSelector((state: RootState) => state.tasks);
  const { profile } = useSelector((state: RootState) => state.child);
  const [taskDetail, setTaskDetail] = useState<TaskDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  // Use task detail as single source of truth
  const currentStatus = taskDetail?.status;

  // Load detailed task information
  useEffect(() => {
    loadTaskDetails();
  }, [id]);

  // Handle quick photo parameter
  useEffect(() => {
    if (quickPhoto === 'true' && taskDetail && taskDetail.photoProofRequired && !loading) {
      setShowPhotoModal(true);
    }
  }, [quickPhoto, taskDetail, loading]);

  const loadTaskDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const details = await taskService.getTaskDetails(id);
      setTaskDetail(details);
    } catch (err) {
      setError("Failed to load task details");
      console.error("Error loading task details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!taskDetail) return;
    
    // Check if task is in the future
    const taskDate = startOfDay(parseISO(taskDetail.dueDate));
    const today = startOfDay(new Date());
    const isFutureTask = isAfter(taskDate, today);
    
    if (isFutureTask) {
      Alert.alert(
        "Cannot Complete Future Task",
        "You can only complete tasks for today or past dates. Please wait until the scheduled date to complete this task.",
        [{ text: "OK" }]
      );
      return;
    }
    
    if (currentStatus !== "pending" && currentStatus !== "parent_rejected") {
      setError("Task has already been completed");
      return;
    }

    if (taskDetail.photoProofRequired && !taskDetail.photoUrl) {
      setShowPhotoModal(true);
      return;
    }

    try {
      setCompleting(true);
      const result = await dispatch(markTaskComplete(taskDetail.id)).unwrap();
      
      // Show success feedback before navigating back
      setCompleting(false);
      setError(null);
      
      // Refresh task details to get updated status
      await loadTaskDetails();
      
      // If task was from today, also refresh daily tasks
      if (profile?.id && taskDetail.dueDate) {
        await dispatch(fetchDailyTasks({ 
          childId: profile.id, 
          date: taskDetail.dueDate 
        }));
      }
      
      // Brief delay to show success state
      setTimeout(() => {
        router.back();
      }, 500);
    } catch (err) {
      console.error("Failed to complete task:", err);
      setError("Failed to complete task");
      setCompleting(false);
    }
  };

  const handlePhotoCapture = async (photoUri: string) => {
    if (!taskDetail) return;

    console.log('[TaskDetail] handlePhotoCapture called with URI:', photoUri);
    console.log('[TaskDetail] URI type:', typeof photoUri);
    console.log('[TaskDetail] URI length:', photoUri.length);

    try {
      await dispatch(uploadTaskPhoto({ 
        taskCompletionId: taskDetail.id, 
        photoUri 
      })).unwrap();
      
      setShowPhotoModal(false);
      // Don't complete the task - just close the modal and show the uploaded photo
      
      // Reload task details to get updated status from server
      await loadTaskDetails();
      
      // Also refresh the daily tasks to ensure Redux has latest data if this is today's task
      if (profile?.id && taskDetail.dueDate) {
        await dispatch(fetchDailyTasks({ 
          childId: profile.id, 
          date: taskDetail.dueDate 
        }));
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      setError("Failed to upload photo");
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  if (!taskDetail) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-lg text-gray-900 mb-4">Task not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-green-500 rounded-lg px-6 py-3"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2 mr-2"
          >
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Task Details</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Main Content */}
        <View className="bg-white m-4 rounded-2xl p-6 shadow-sm">
          {/* Category and Group */}
          <View className="flex-row items-center mb-4">
            <View
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: taskDetail.categoryColor }}
            />
            <Text className="text-sm text-gray-600">
              {taskDetail.categoryName} • {taskDetail.groupName}
            </Text>
          </View>

          {/* Task Name */}
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            {taskDetail.taskName}
          </Text>

          {/* Description */}
          {taskDetail.customDescription && (
            <Text className="text-base text-gray-700 mb-4">
              {taskDetail.customDescription}
            </Text>
          )}

          {/* FAMCOIN Value */}
          <View className="bg-green-50 rounded-xl p-4 mb-4 flex-row items-center justify-between">
            <Text className="text-base text-gray-700">Reward</Text>
            <View className="flex-row items-center">
              <Coins size={20} color="#10b981" />
              <Text className="text-xl font-bold text-green-700 ml-2">
                {taskDetail.famcoinValue} FC
              </Text>
            </View>
          </View>

          {/* Photo Requirement */}
          {taskDetail.photoProofRequired && (
            <View className="bg-blue-50 rounded-xl p-4 mb-4">
              <View className="flex-row items-center">
                <Camera size={20} color="#3b82f6" />
                <Text className="text-base text-blue-900 ml-2 font-medium">
                  Photo Proof Required
                </Text>
              </View>
              {taskDetail.photoUrl && (
                <>
                  {console.log('[TaskDetail] Displaying photo URL:', taskDetail.photoUrl)}
                  <View className="relative">
                    {imageLoading && (
                      <View className="absolute inset-0 w-full h-48 rounded-lg mt-3 bg-gray-200 items-center justify-center">
                        <ActivityIndicator size="small" color="#3b82f6" />
                      </View>
                    )}
                    <Image
                      key={taskDetail.photoUrl} // Force re-render on URL change
                      source={{ 
                        uri: taskDetail.photoUrl,
                        cache: 'reload' // Force cache refresh
                      }}
                      className="w-full h-48 rounded-lg mt-3"
                      resizeMode="cover"
                      onLoadStart={() => setImageLoading(true)}
                      onError={(error) => {
                        console.error('[TaskDetail] Image failed to load:', error.nativeEvent.error);
                        setImageLoading(false);
                      }}
                      onLoad={() => {
                        console.log('[TaskDetail] Image loaded successfully');
                        setImageLoading(false);
                      }}
                    />
                  </View>
                  {/* Show retake photo button if task is not yet approved */}
                  {currentStatus !== "parent_approved" && (
                    <TouchableOpacity
                      onPress={() => setShowPhotoModal(true)}
                      className="mt-3 bg-blue-500 rounded-lg py-2 px-4 flex-row items-center justify-center"
                    >
                      <Camera size={16} color="white" />
                      <Text className="text-white font-medium ml-2">Retake Photo</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          {/* Status */}
          {currentStatus === "parent_rejected" && (
            <View className="bg-orange-50 rounded-xl p-4 mb-4 border border-orange-200">
              <View className="flex-row items-start">
                <AlertCircle size={20} color="#ea580c" />
                <View className="flex-1 ml-2">
                  <Text className="text-base font-semibold text-orange-900 mb-2">
                    Let's Try Again! 💪
                  </Text>
                  {(taskDetail?.rejectionReason || taskDetail?.feedback) && (
                    <>
                      <Text className="text-sm font-medium text-orange-800 mb-1">
                        Parent's Feedback:
                      </Text>
                      <Text className="text-sm text-orange-700 mb-3">
                        {taskDetail.rejectionReason || taskDetail.feedback}
                      </Text>
                    </>
                  )}
                  <View className="bg-orange-100 rounded-lg p-3">
                    <Text className="text-xs font-medium text-orange-900 mb-1">
                      💡 Tips for Success:
                    </Text>
                    {taskDetail.photoProofRequired ? (
                      <Text className="text-xs text-orange-800">
                        • Make sure the photo is clear and well-lit{'\n'}
                        • Show the completed task clearly{'\n'}
                        • Try a different angle if needed
                      </Text>
                    ) : (
                      <Text className="text-xs text-orange-800">
                        • Read the feedback carefully{'\n'}
                        • Take your time to do it right{'\n'}
                        • Ask for help if you're unsure
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Completed Status */}
          {currentStatus === "child_completed" && (
            <View className="bg-yellow-50 rounded-xl p-4 mb-4">
              <View className="flex-row items-center">
                <CheckCircle size={20} color="#f59e0b" />
                <Text className="text-base text-yellow-900 ml-2">
                  Waiting for parent approval
                </Text>
              </View>
            </View>
          )}

          {currentStatus === "parent_approved" && (
            <View className="bg-green-50 rounded-xl p-4 mb-4">
              <View className="flex-row items-center">
                <CheckCircle size={20} color="#10b981" />
                <Text className="text-base text-green-900 ml-2">
                  Task completed and approved!
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Error Message */}
        {error && (
          <View className="mx-4 bg-red-50 rounded-lg p-4 mb-4">
            <Text className="text-red-800">{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Button */}
      {(currentStatus === "pending" || currentStatus === "parent_rejected") && taskDetail && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          {(() => {
            const taskDate = startOfDay(parseISO(taskDetail.dueDate));
            const today = startOfDay(new Date());
            const isFutureTask = isAfter(taskDate, today);
            
            return (
              <TouchableOpacity
                onPress={handleCompleteTask}
                disabled={completing || isFutureTask}
                className={`rounded-xl py-4 px-6 flex-row items-center justify-center ${
                  completing || isFutureTask ? "bg-gray-400" : "bg-green-500"
                }`}
              >
                {completing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : isFutureTask ? (
                  <>
                    <Lock size={20} color="white" />
                    <Text className="text-white font-semibold text-lg ml-2">
                      Available on scheduled date
                    </Text>
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} color="white" />
                    <Text className="text-white font-semibold text-lg ml-2">
                      {taskDetail.photoProofRequired && !taskDetail.photoUrl
                        ? "Add Photo"
                        : "Mark as Complete"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })()}
        </View>
      )}

      {/* Photo Capture Modal */}
      <PhotoCapture
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onPhotoCapture={handlePhotoCapture}
      />
    </SafeAreaView>
  );
}