import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../../store";
import { markTaskComplete, uploadTaskPhoto } from "../../../store/slices/taskSlice";
import { 
  ArrowLeft, 
  Camera, 
  CheckCircle, 
  Coins, 
  AlertCircle,
  X
} from "lucide-react-native";
import { taskService } from "../../../services/taskService";
import { TaskDetailView } from "../../../types/task";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { dailyTasks, photoUploadProgress } = useSelector((state: RootState) => state.tasks);
  const [taskDetail, setTaskDetail] = useState<TaskDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find task in Redux store
  const task = dailyTasks.find(t => t.id === id);

  // Load detailed task information
  useEffect(() => {
    loadTaskDetails();
  }, [id]);

  const loadTaskDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
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
    if (!task || task.status !== "pending" && task.status !== "parent_rejected") return;

    if (task.photoProofRequired && !task.photoUrl) {
      setShowPhotoModal(true);
      return;
    }

    try {
      setCompleting(true);
      await dispatch(markTaskComplete(task.id)).unwrap();
      router.back();
    } catch (err) {
      setError("Failed to complete task");
    } finally {
      setCompleting(false);
    }
  };

  const handlePhotoCapture = async (photoUri: string) => {
    if (!task) return;

    try {
      await dispatch(uploadTaskPhoto({ 
        taskCompletionId: task.id, 
        photoUri 
      })).unwrap();
      
      setShowPhotoModal(false);
      // Now complete the task
      handleCompleteTask();
    } catch (err) {
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

  if (!task || !taskDetail) {
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

  const uploadProgress = photoUploadProgress[task.id] || 0;

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
              style={{ backgroundColor: task.categoryColor }}
            />
            <Text className="text-sm text-gray-600">
              {taskDetail.categoryName} • {task.groupName}
            </Text>
          </View>

          {/* Task Name */}
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            {task.taskName}
          </Text>

          {/* Description */}
          {task.customDescription && (
            <Text className="text-base text-gray-700 mb-4">
              {task.customDescription}
            </Text>
          )}

          {/* FAMCOIN Value */}
          <View className="bg-green-50 rounded-xl p-4 mb-4 flex-row items-center justify-between">
            <Text className="text-base text-gray-700">Reward</Text>
            <View className="flex-row items-center">
              <Coins size={20} color="#10b981" />
              <Text className="text-xl font-bold text-green-700 ml-2">
                {task.famcoinValue} FC
              </Text>
            </View>
          </View>

          {/* Photo Requirement */}
          {task.photoProofRequired && (
            <View className="bg-blue-50 rounded-xl p-4 mb-4">
              <View className="flex-row items-center">
                <Camera size={20} color="#3b82f6" />
                <Text className="text-base text-blue-900 ml-2 font-medium">
                  Photo Proof Required
                </Text>
              </View>
              {task.photoUrl && (
                <Image
                  source={{ uri: task.photoUrl }}
                  className="w-full h-48 rounded-lg mt-3"
                  resizeMode="cover"
                />
              )}
            </View>
          )}

          {/* Status */}
          {task.status === "parent_rejected" && task.rejectionReason && (
            <View className="bg-red-50 rounded-xl p-4 mb-4">
              <View className="flex-row items-start">
                <AlertCircle size={20} color="#ef4444" />
                <View className="flex-1 ml-2">
                  <Text className="text-base font-medium text-red-900 mb-1">
                    Task needs revision
                  </Text>
                  <Text className="text-sm text-red-700">
                    {task.rejectionReason}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Completed Status */}
          {task.status === "child_completed" && (
            <View className="bg-yellow-50 rounded-xl p-4 mb-4">
              <View className="flex-row items-center">
                <CheckCircle size={20} color="#f59e0b" />
                <Text className="text-base text-yellow-900 ml-2">
                  Waiting for parent approval
                </Text>
              </View>
            </View>
          )}

          {task.status === "parent_approved" && (
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
      {(task.status === "pending" || task.status === "parent_rejected") && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <TouchableOpacity
            onPress={handleCompleteTask}
            disabled={completing}
            className={`rounded-xl py-4 px-6 flex-row items-center justify-center ${
              completing ? "bg-gray-400" : "bg-green-500"
            }`}
          >
            {completing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <CheckCircle size={20} color="white" />
                <Text className="text-white font-semibold text-lg ml-2">
                  {task.photoProofRequired && !task.photoUrl
                    ? "Add Photo & Complete"
                    : "Mark as Complete"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Photo Capture Modal */}
      <Modal
        visible={showPhotoModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold">Add Photo Proof</Text>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-6">
              Take a photo to show you've completed this task
            </Text>

            {/* Placeholder for PhotoCapture component */}
            <View className="bg-gray-100 rounded-xl p-8 items-center justify-center mb-4">
              <Camera size={48} color="#6b7280" />
              <Text className="text-gray-600 mt-2">Photo capture coming soon</Text>
            </View>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-2">
                  Uploading... {uploadProgress}%
                </Text>
                <View className="bg-gray-200 rounded-full h-2">
                  <View
                    className="bg-green-500 rounded-full h-2"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}