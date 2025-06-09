import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { CircleCheck, ChevronRight, Award } from "lucide-react-native";

interface ChildProgressCardProps {
  name?: string;
  avatar?: string;
  completionPercentage?: number;
  famcoinBalance?: number;
  tasksCompleted?: number;
  totalTasks?: number;
  onPress?: () => void;
}

const ChildProgressCard = ({
  name = "Emma",
  avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
  completionPercentage = 75,
  famcoinBalance = 120,
  tasksCompleted = 6,
  totalTasks = 8,
  onPress = () => console.log("Child card pressed"),
}: ChildProgressCardProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-xl p-4 shadow-md mb-3 w-full flex-row items-center"
    >
      {/* Avatar */}
      <View className="mr-4">
        <Image
          source={{ uri: avatar }}
          className="w-16 h-16 rounded-full bg-gray-200"
          contentFit="cover"
        />
      </View>

      {/* Content */}
      <View className="flex-1">
        <Text className="text-lg font-bold">{name}</Text>

        {/* Progress bar */}
        <View className="mt-2 mb-1">
          <View className="h-2 w-full bg-gray-200 rounded-full">
            <View
              className="h-2 bg-blue-500 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            />
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <CircleCheck size={16} color="#10b981" />
            <Text className="text-sm text-gray-600 ml-1">
              {tasksCompleted}/{totalTasks} tasks
            </Text>
          </View>

          <View className="flex-row items-center">
            <Award size={16} color="#f59e0b" />
            <Text className="text-sm text-gray-600 ml-1">
              {famcoinBalance} FAMCOINS
            </Text>
          </View>
        </View>
      </View>

      {/* Arrow */}
      <ChevronRight size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
};

export default ChildProgressCard;
