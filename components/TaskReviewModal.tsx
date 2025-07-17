import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { X, Check, AlertCircle, Clock, Award } from "lucide-react-native";
import { format } from "date-fns";

interface TaskReviewModalProps {
  isVisible: boolean;
  task: {
    id: string;
    taskName: string;
    childName: string;
    childAvatar?: string;
    famcoinValue: number;
    effortScore: number;
    completedAt: string;
    dueDate: string;
    photoUrl?: string;
    photoRequired: boolean;
  };
  onClose: () => void;
  onApprove: (taskId: string, feedback?: string) => Promise<void>;
  onReject: (taskId: string, reason: string) => Promise<void>;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function TaskReviewModal({
  isVisible,
  task,
  onClose,
  onApprove,
  onReject,
}: TaskReviewModalProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approvalFeedback, setApprovalFeedback] = useState("");
  const [showApprovalFeedback, setShowApprovalFeedback] = useState(false);

  const handleApprove = async () => {
    if (isApproving) return;
    
    setIsApproving(true);
    try {
      await onApprove(task.id, approvalFeedback || undefined);
      // Only reset state if successful
      setApprovalFeedback("");
      setShowApprovalFeedback(false);
    } catch (error) {
      console.error("Error approving task:", error);
      // Re-throw to let parent handle it
      throw error;
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (isRejecting || !rejectReason.trim()) return;
    
    setIsRejecting(true);
    try {
      await onReject(task.id, rejectReason.trim());
      // Only reset state if successful
      setRejectReason("");
      setShowRejectForm(false);
    } catch (error) {
      console.error("Error rejecting task:", error);
      // Re-throw to let parent handle it
      throw error;
    } finally {
      setIsRejecting(false);
    }
  };

  const resetModal = () => {
    setShowRejectForm(false);
    setRejectReason("");
    setApprovalFeedback("");
    setShowApprovalFeedback(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <BlurView intensity={20} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleClose}
              className="flex-1 justify-end"
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {}}
                className="bg-white rounded-t-3xl min-h-[80%] max-h-[90%]"
              >
                {/* Header */}
                <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                  <Text className="text-xl font-bold text-gray-900">
                    Review Task
                  </Text>
                  <TouchableOpacity
                    onPress={handleClose}
                    className="p-2 rounded-full bg-gray-100"
                  >
                    <X size={20} color="#374151" />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView className="flex-1 p-4">
                  {/* Child Info */}
                  <View className="flex-row items-center mb-4">
                    <View className="w-16 h-16 rounded-full bg-indigo-100 items-center justify-center mr-3">
                      <Text className="text-2xl">{task.childAvatar || "👤"}</Text>
                    </View>
                    <View>
                      <Text className="text-lg font-semibold text-gray-900">
                        {task.childName}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        Completed {format(new Date(task.completedAt), "h:mm a")}
                      </Text>
                    </View>
                  </View>

                  {/* Task Details */}
                  <View className="bg-gray-50 rounded-xl p-4 mb-4">
                    <Text className="text-2xl font-bold text-gray-900 mb-2">
                      {task.taskName}
                    </Text>
                    
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center">
                        <Award size={20} color="#4f46e5" />
                        <Text className="text-lg font-semibold text-indigo-600 ml-2">
                          {task.famcoinValue} FAMCOINs
                        </Text>
                      </View>
                      <View className="bg-indigo-100 px-3 py-1 rounded-full">
                        <Text className="text-indigo-700 font-medium">
                          Effort: {task.effortScore}/5
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center">
                      <Clock size={16} color="#6b7280" />
                      <Text className="text-sm text-gray-600 ml-2">
                        Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </Text>
                    </View>
                  </View>

                  {/* Photo Proof */}
                  {task.photoUrl && (
                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 mb-2">
                        Photo Proof
                      </Text>
                      <Image
                        source={{ uri: task.photoUrl }}
                        className="w-full h-64 rounded-xl"
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {/* Approval Feedback Form */}
                  {showApprovalFeedback && (
                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 mb-2">
                        Add encouraging feedback (optional)
                      </Text>
                      <TextInput
                        className="bg-white border border-gray-300 rounded-lg p-3 text-gray-900"
                        placeholder="Great job! Keep it up!"
                        value={approvalFeedback}
                        onChangeText={setApprovalFeedback}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </View>
                  )}

                  {/* Rejection Form */}
                  {showRejectForm && (
                    <View className="mb-4">
                      <View className="bg-yellow-50 rounded-lg p-3 mb-3">
                        <View className="flex-row items-start">
                          <AlertCircle size={20} color="#f59e0b" />
                          <Text className="text-sm text-yellow-800 ml-2 flex-1">
                            Please provide constructive feedback to help {task.childName} improve
                          </Text>
                        </View>
                      </View>
                      
                      <Text className="text-sm font-medium text-gray-700 mb-2">
                        What needs improvement?
                      </Text>
                      <TextInput
                        className="bg-white border border-gray-300 rounded-lg p-3 text-gray-900"
                        placeholder="The photo doesn't clearly show the completed task..."
                        value={rejectReason}
                        onChangeText={setRejectReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        autoFocus
                      />
                    </View>
                  )}
                </ScrollView>

                {/* Action Buttons */}
                <View className="p-4 border-t border-gray-200">
                  {!showRejectForm ? (
                    <View className="flex-row space-x-3">
                      <TouchableOpacity
                        onPress={() => setShowRejectForm(true)}
                        className="flex-1 bg-red-50 rounded-xl py-4 items-center"
                        disabled={isApproving || isRejecting}
                      >
                        <View className="flex-row items-center">
                          <X size={20} color="#dc2626" />
                          <Text className="text-red-600 font-semibold ml-2">
                            Request Redo
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          if (showApprovalFeedback) {
                            handleApprove();
                          } else {
                            setShowApprovalFeedback(true);
                          }
                        }}
                        className="flex-1 bg-green-500 rounded-xl py-4 items-center"
                        disabled={isApproving || isRejecting}
                      >
                        {isApproving ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <View className="flex-row items-center">
                            <Check size={20} color="white" />
                            <Text className="text-white font-semibold ml-2">
                              {showApprovalFeedback ? "Confirm" : "Approve"}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View className="flex-row space-x-3">
                      <TouchableOpacity
                        onPress={() => {
                          setShowRejectForm(false);
                          setRejectReason("");
                        }}
                        className="flex-1 bg-gray-200 rounded-xl py-4 items-center"
                        disabled={isRejecting}
                      >
                        <Text className="text-gray-700 font-semibold">Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleReject}
                        className={`flex-1 rounded-xl py-4 items-center ${
                          rejectReason.trim() ? "bg-red-500" : "bg-gray-300"
                        }`}
                        disabled={!rejectReason.trim() || isRejecting}
                      >
                        {isRejecting ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text className="text-white font-semibold">
                            Send Feedback
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
}