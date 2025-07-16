import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Coins, Lock } from "lucide-react-native";
import { TaskCompletionView } from "../types/task";
import { isAfter, startOfDay, parseISO } from "date-fns";

interface TaskCardProps {
  task: TaskCompletionView;
  onPress: () => void;
}

export default function TaskCard({ task, onPress }: TaskCardProps) {
  // Check if task is in the future
  const isFutureTask = task.dueDate ? (() => {
    const taskDate = startOfDay(parseISO(task.dueDate));
    const today = startOfDay(new Date());
    return isAfter(taskDate, today);
  })() : false;
  
  // Determine if the card should be disabled
  const isDisabled = isFutureTask && (task.status === 'pending' || task.status === 'parent_rejected');

  return (
    <TouchableOpacity
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      className={`bg-white rounded-xl p-4 mb-3 shadow-sm ${isDisabled ? 'opacity-50' : ''}`}
    >
      <View className="flex-row items-start justify-between">
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
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center">
              <Coins size={14} color="#10b981" />
              <Text className="text-sm font-semibold text-green-600 ml-1">
                {task.famcoinValue} FC
              </Text>
            </View>
            {task.photoProofRequired && (
              <Text className="text-xs text-gray-500">📷 Photo required</Text>
            )}
          </View>
        </View>
        <View className="ml-3">
          {isDisabled ? (
            <View className="bg-gray-100 rounded-full px-3 py-1 flex-row items-center">
              <Lock size={10} color="#6b7280" />
              <Text className="text-xs font-medium text-gray-500 ml-1">Future</Text>
            </View>
          ) : (
            <>
              {task.status === "pending" && (
                <View className="bg-gray-100 rounded-full px-3 py-1">
                  <Text className="text-xs font-medium text-gray-700">To Do</Text>
                </View>
              )}
              {task.status === "parent_rejected" && (
                <View className="bg-red-100 rounded-full px-3 py-1">
                  <Text className="text-xs font-medium text-red-700">Try Again</Text>
                </View>
              )}
              {task.status === "child_completed" && (
                <View className="bg-yellow-100 rounded-full px-3 py-1">
                  <Text className="text-xs font-medium text-yellow-700">Waiting</Text>
                </View>
              )}
              {task.status === "parent_approved" && (
                <View className="bg-green-100 rounded-full px-3 py-1">
                  <Text className="text-xs font-medium text-green-700">Done!</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}