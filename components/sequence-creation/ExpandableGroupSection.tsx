import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming,
  useSharedValue
} from 'react-native-reanimated';
import { ChevronDown, Camera, Clock } from 'lucide-react-native';
import { taskService } from '../../services/taskService';
import { TaskTemplate } from '../../types/task';

interface ExpandableGroupSectionProps {
  group: {
    id: string;
    name: string;
    activeDays: number[];
  };
  selectedTaskIds: string[];
  onEdit: () => void;
}

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ExpandableGroupSection: React.FC<ExpandableGroupSectionProps> = ({ 
  group, 
  selectedTaskIds,
  onEdit 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const rotateValue = useSharedValue(isExpanded ? 180 : 0);
  const heightValue = useSharedValue(isExpanded ? 1 : 0);

  useEffect(() => {
    rotateValue.value = withTiming(isExpanded ? 180 : 0, { duration: 200 });
    heightValue.value = withTiming(isExpanded ? 1 : 0, { duration: 200 });
  }, [isExpanded, rotateValue, heightValue]);

  const animatedArrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: heightValue.value,
    maxHeight: heightValue.value * 500,
  }));

  // Fetch task details when expanded
  useEffect(() => {
    const fetchTaskDetails = async () => {
      if (!isExpanded || selectedTaskIds.length === 0) return;
      
      setIsLoading(true);
      try {
        const templates = await taskService.getTaskTemplates();
        const selectedTasks = templates.filter(t => selectedTaskIds.includes(t.id));
        setTasks(selectedTasks);
      } catch (error) {
        console.error('Failed to fetch task details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTaskDetails();
  }, [isExpanded, selectedTaskIds]);

  const totalEffortScore = tasks.reduce((sum, task) => sum + (task.effort_score || 0), 0);
  const estimatedMinutes = totalEffortScore * 5; // Estimate 5 minutes per effort point

  return (
    <View className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
      {/* Header */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="p-6"
      >
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <Text className="font-semibold text-gray-900 text-lg">{group.name}</Text>
            <View className="flex-row flex-wrap mt-2">
              {dayNames.map((day, index) => {
                const isActive = group.activeDays.includes(index + 1);
                return (
                  <View
                    key={day}
                    className={`px-2 py-1 rounded-full mr-1 mb-1 ${
                      isActive ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}
                  >
                    <Text className={`text-xs font-medium ${
                      isActive ? 'text-indigo-700' : 'text-gray-400'
                    }`}>
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text className="text-sm text-gray-600 mt-2">
              {selectedTaskIds.length} tasks selected
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <TouchableOpacity onPress={onEdit} className="mr-3">
              <Text className="text-indigo-600 text-sm">Edit</Text>
            </TouchableOpacity>
            <Animated.View style={animatedArrowStyle}>
              <ChevronDown size={20} color="#6b7280" />
            </Animated.View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      <Animated.View style={[animatedContentStyle, { overflow: 'hidden' }]}>
        <View className="px-6 pb-6 border-t border-gray-100">
          {isLoading ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#6366f1" />
            </View>
          ) : (
            <>
              {/* Task List */}
              <View className="mt-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">Tasks</Text>
                {tasks.map((task, index) => (
                  <View key={task.id} className="flex-row items-center py-2">
                    <Text className="text-gray-600 mr-2">{index + 1}.</Text>
                    <Text className="flex-1 text-gray-900">{task.name}</Text>
                    {task.photo_proof_required && (
                      <Camera size={16} color="#6b7280" />
                    )}
                  </View>
                ))}
              </View>

              {/* Summary Stats */}
              <View className="mt-4 pt-4 border-t border-gray-100">
                <View className="flex-row items-center">
                  <Clock size={16} color="#6b7280" />
                  <Text className="text-sm text-gray-600 ml-2">
                    Estimated time: {Math.round(estimatedMinutes)} min/day
                  </Text>
                </View>
                <Text className="text-sm text-gray-600 mt-1">
                  Total effort score: {totalEffortScore}
                </Text>
              </View>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

export default ExpandableGroupSection;