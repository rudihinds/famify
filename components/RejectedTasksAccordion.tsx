import React, { useState } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { ChevronDown, AlertTriangle } from "lucide-react-native";
import RejectedTaskCard from "./RejectedTaskCard";
import { TaskCompletionView } from "../types/task";

interface RejectedTasksAccordionProps {
  rejectedTasks: TaskCompletionView[];
  onTaskPress: (taskId: string) => void;
  onQuickPhotoUpdate?: (taskId: string) => void;
}

export default function RejectedTasksAccordion({
  rejectedTasks,
  onTaskPress,
  onQuickPhotoUpdate,
}: RejectedTasksAccordionProps) {
  const [isOpen, setIsOpen] = useState(false); // Default to closed, user can click to expand
  const [animation] = useState(new Animated.Value(0)); // Start at 0 for closed state

  const toggleAccordion = () => {
    const toValue = isOpen ? 0 : 1;
    
    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setIsOpen(!isOpen);
  };

  if (rejectedTasks.length === 0) {
    return null;
  }

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const heightInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View className="mb-6">
      {/* Accordion Header */}
      <TouchableOpacity
        onPress={toggleAccordion}
        className="bg-orange-100 rounded-xl p-4 flex-row items-center justify-between border border-orange-200"
      >
        <View className="flex-row items-center flex-1">
          <View className="bg-orange-500 rounded-full w-8 h-8 items-center justify-center mr-3">
            <AlertTriangle size={16} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-orange-900">
              Tasks to Redo
            </Text>
            <Text className="text-sm text-orange-700">
              {rejectedTasks.length} task{rejectedTasks.length !== 1 ? 's' : ''} need{rejectedTasks.length === 1 ? 's' : ''} your attention
            </Text>
          </View>
        </View>
        
        <View className="flex-row items-center">
          <View className="bg-orange-500 rounded-full px-2 py-1 mr-2">
            <Text className="text-white font-bold text-sm">{rejectedTasks.length}</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <ChevronDown size={20} color="#ea580c" />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Accordion Content */}
      <Animated.View
        style={{
          opacity: heightInterpolate,
          transform: [{
            scaleY: heightInterpolate
          }],
        }}
      >
        {isOpen && (
          <View className="mt-3">
            {rejectedTasks.map((task) => (
              <RejectedTaskCard
                key={task.id}
                task={task}
                onPress={() => onTaskPress(task.id)}
                onQuickPhotoUpdate={
                  task.photoProofRequired && onQuickPhotoUpdate
                    ? () => onQuickPhotoUpdate(task.id)
                    : undefined
                }
              />
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
}