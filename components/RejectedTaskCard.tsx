import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { 
  Coins, 
  AlertTriangle, 
  Camera, 
  RefreshCw,
  MessageCircle 
} from "lucide-react-native";
import { TaskCompletionView } from "../types/task";

interface RejectedTaskCardProps {
  task: TaskCompletionView;
  onPress: () => void;
  onQuickPhotoUpdate?: () => void;
}

export default function RejectedTaskCard({ 
  task, 
  onPress, 
  onQuickPhotoUpdate 
}: RejectedTaskCardProps) {
  const hasRejectionFeedback = task.rejectionReason || task.feedback;
  
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-xl mb-3 shadow-sm border-2 border-orange-200 overflow-hidden"
    >
      {/* Orange header banner */}
      <View className="bg-orange-50 px-4 py-2 border-b border-orange-100">
        <View className="flex-row items-center">
          <AlertTriangle size={16} color="#ea580c" />
          <Text className="text-sm font-semibold text-orange-700 ml-2">
            Let's Try Again!
          </Text>
        </View>
      </View>

      <View className="p-4">
        {/* Task info */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <View
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: task.categoryColor }}
              />
              <Text className="text-xs text-gray-600">{task.groupName}</Text>
            </View>
            <Text className="text-base font-semibold text-gray-900 mb-1">
              {task.taskName}
            </Text>
            {task.customDescription && (
              <Text className="text-sm text-gray-600 mb-2">
                {task.customDescription}
              </Text>
            )}
          </View>
          <View className="ml-3">
            <View className="flex-row items-center bg-green-50 rounded-full px-2 py-1">
              <Coins size={14} color="#10b981" />
              <Text className="text-sm font-semibold text-green-600 ml-1">
                {task.famcoinValue} FC
              </Text>
            </View>
          </View>
        </View>

        {/* Rejection feedback */}
        {hasRejectionFeedback && (
          <View className="bg-orange-50 rounded-lg p-3 mb-3">
            <View className="flex-row items-start">
              <MessageCircle size={16} color="#ea580c" className="mt-0.5" />
              <View className="flex-1 ml-2">
                <Text className="text-xs font-medium text-orange-700 mb-1">
                  Parent's Feedback:
                </Text>
                <Text className="text-sm text-orange-900">
                  {task.rejectionReason || task.feedback}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Current photo preview if exists */}
        {task.photoUrl && task.photoProofRequired && (
          <View className="mb-3">
            <Text className="text-xs text-gray-500 mb-1">Your previous photo:</Text>
            <View className="relative">
              <Image 
                source={{ uri: task.photoUrl }} 
                className="w-full h-32 rounded-lg"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/20 rounded-lg items-center justify-center">
                <View className="bg-white/90 rounded-full px-3 py-1">
                  <Text className="text-xs font-medium text-gray-700">
                    Needs update
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            {task.photoProofRequired && (
              <View className="flex-row items-center mr-3">
                <Camera size={14} color="#6b7280" />
                <Text className="text-xs text-gray-600 ml-1">Photo required</Text>
              </View>
            )}
          </View>
          
          {/* Quick photo update button for photo tasks */}
          {task.photoProofRequired && onQuickPhotoUpdate && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onQuickPhotoUpdate();
              }}
              className="bg-orange-500 rounded-full px-3 py-1.5 flex-row items-center"
            >
              <Camera size={14} color="white" />
              <Text className="text-xs font-semibold text-white ml-1">
                Update Photo
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Redo button for non-photo tasks */}
          {!task.photoProofRequired && (
            <TouchableOpacity
              onPress={onPress}
              className="bg-orange-500 rounded-full px-3 py-1.5 flex-row items-center"
            >
              <RefreshCw size={14} color="white" />
              <Text className="text-xs font-semibold text-white ml-1">
                Try Again
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Encouraging message */}
        <View className="mt-3 pt-3 border-t border-gray-100">
          <Text className="text-xs text-gray-600 text-center italic">
            💪 You've got this! Every expert was once a beginner.
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}