import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming,
  useSharedValue
} from 'react-native-reanimated';
import { ChevronDown, Plus, Home, Sun, Backpack, Heart, Book, Moon } from 'lucide-react-native';
import TaskPill from './TaskPill';
import { TaskTemplate, TaskCategory } from '../../types/task';

interface CategorySectionProps {
  category: TaskCategory;
  tasks: TaskTemplate[];
  selectedTaskIds: string[];
  onTaskToggle: (taskId: string) => void;
  onCreateCustomTask: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

// Map icon names to components
const iconMap: Record<string, any> = {
  home: Home,
  sun: Sun,
  backpack: Backpack,
  heart: Heart,
  book: Book,
  moon: Moon,
};

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  tasks,
  selectedTaskIds,
  onTaskToggle,
  onCreateCustomTask,
  isExpanded,
  onToggleExpand,
}) => {
  const rotateValue = useSharedValue(isExpanded ? 180 : 0);
  const heightValue = useSharedValue(isExpanded ? 1 : 0);

  React.useEffect(() => {
    rotateValue.value = withTiming(isExpanded ? 180 : 0, { duration: 200 });
    heightValue.value = withTiming(isExpanded ? 1 : 0, { duration: 200 });
  }, [isExpanded, rotateValue, heightValue]);

  const animatedArrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: heightValue.value,
    maxHeight: heightValue.value * 500, // Adjust based on content
  }));

  const IconComponent = iconMap[category.icon] || Home;
  const selectedCount = tasks.filter(task => selectedTaskIds.includes(task.id)).length;

  return (
    <View className="mb-4">
      {/* Category Header */}
      <TouchableOpacity
        onPress={onToggleExpand}
        className="bg-white rounded-xl p-4 shadow-sm"
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={`${category.name} category, ${tasks.length} tasks, ${selectedCount} selected`}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View 
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: category.color + '20' }}
            >
              <IconComponent size={20} color={category.color} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {category.name}
              </Text>
              <Text className="text-sm text-gray-500">
                {tasks.length} tasks • {selectedCount} selected
              </Text>
            </View>
          </View>
          <Animated.View style={animatedArrowStyle}>
            <ChevronDown size={20} color="#6b7280" />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      <Animated.View style={[animatedContentStyle, { overflow: 'hidden' }]}>
        <View className="bg-gray-50 rounded-b-xl p-4 -mt-2">
          {tasks.length === 0 ? (
            <Text className="text-gray-500 text-center py-4">
              No tasks in this category
            </Text>
          ) : (
            <View className="flex-row flex-wrap">
              {tasks.map((task) => (
                <TaskPill
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskIds.includes(task.id)}
                  onToggle={() => onTaskToggle(task.id)}
                />
              ))}
            </View>
          )}
          
          {/* Create Custom Task Button */}
          <TouchableOpacity
            onPress={onCreateCustomTask}
            className="flex-row items-center justify-center mt-3 py-2 px-4 border-2 border-dashed border-gray-300 rounded-full"
          >
            <Plus size={16} color="#6b7280" />
            <Text className="ml-2 text-sm font-medium text-gray-600">
              Create Custom Task
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

export default CategorySection;