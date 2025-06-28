import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { 
  setCurrentStep,
  addTaskToGroup,
  selectGroups,
  selectTasksForGroup,
  selectCanAdvanceStep
} from '../../../store/slices/sequenceCreationSlice';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

export default function AddTasksScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { groupId, groupIndex, totalGroups } = useLocalSearchParams<{
    groupId: string;
    groupIndex: string;
    totalGroups: string;
  }>();
  
  const groups = useSelector(selectGroups);
  const selectedTasks = useSelector(selectTasksForGroup(groupId));
  const canAdvance = useSelector(selectCanAdvanceStep);
  
  const currentGroupIndex = parseInt(groupIndex || '0');
  const totalGroupsCount = parseInt(totalGroups || '1');
  const currentGroup = groups.find(g => g.id === groupId);
  const isLastGroup = currentGroupIndex === totalGroupsCount - 1;

  useEffect(() => {
    // Set current step when screen mounts
    dispatch(setCurrentStep(3));
  }, [dispatch]);

  const handleNext = () => {
    if (canAdvance) {
      if (isLastGroup) {
        // Go to review screen
        router.push('/sequence-creation/review-create');
      } else {
        // Go to next group
        const nextGroupIndex = currentGroupIndex + 1;
        const nextGroup = groups[nextGroupIndex];
        if (nextGroup) {
          router.push(`/sequence-creation/add-tasks/${nextGroup.id}?groupIndex=${nextGroupIndex}&totalGroups=${totalGroupsCount}`);
        }
      }
    }
  };

  const handleBack = () => {
    if (currentGroupIndex === 0) {
      // Go back to groups setup
      router.push('/sequence-creation/groups-setup');
    } else {
      // Go to previous group
      router.back();
    }
  };

  const addTestTask = (taskId: string) => {
    dispatch(addTaskToGroup({ groupId, taskId }));
  };

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Add Tasks: {currentGroup?.name || 'Unknown Group'}
        </Text>
        <Text className="text-gray-600 mb-6">
          {currentGroupIndex + 1} of {totalGroupsCount} groups
        </Text>

        {/* Selected Tasks */}
        {selectedTasks.length > 0 && (
          <View className="bg-green-50 rounded-xl p-4 mb-4">
            <Text className="font-semibold text-green-700 mb-2">
              Selected Tasks ({selectedTasks.length})
            </Text>
            {selectedTasks.map((taskId) => (
              <Text key={taskId} className="text-green-600 text-sm">
                • Task ID: {taskId}
              </Text>
            ))}
          </View>
        )}

        {/* Task Categories Placeholder */}
        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <Text className="font-semibold text-gray-900 mb-4">
            Task Categories
          </Text>
          <Text className="text-gray-500 mb-4">
            Collapsible categories with task pills will go here
          </Text>
          
          {/* Test Task Buttons */}
          <View className="space-y-2">
            <TouchableOpacity
              onPress={() => addTestTask('task-1')}
              className="py-2 px-4 bg-gray-100 rounded-lg"
            >
              <Text className="text-gray-700">Add Test Task 1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => addTestTask('task-2')}
              className="py-2 px-4 bg-gray-100 rounded-lg"
            >
              <Text className="text-gray-700">Add Test Task 2</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => addTestTask('task-3')}
              className="py-2 px-4 bg-gray-100 rounded-lg"
            >
              <Text className="text-gray-700">Add Test Task 3</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="bg-blue-50 rounded-xl p-4 mb-4">
          <Text className="text-blue-700 text-sm">
            Full implementation will include:
          </Text>
          <Text className="text-blue-600 text-sm mt-1">
            • Search bar
          </Text>
          <Text className="text-blue-600 text-sm">
            • Category sections from database
          </Text>
          <Text className="text-blue-600 text-sm">
            • Flowing pills layout
          </Text>
          <Text className="text-blue-600 text-sm">
            • Custom task creation
          </Text>
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View className="px-4 pb-6 pt-4 bg-white border-t border-gray-200">
        <View className="bg-gray-100 rounded-lg p-3 mb-3">
          <Text className="text-center text-gray-700 font-medium">
            Selected: {selectedTasks.length} tasks
          </Text>
        </View>
        
        <View className="flex-row space-x-3">
          <TouchableOpacity
            onPress={handleBack}
            className="flex-1 flex-row items-center justify-center py-4 px-6 rounded-xl border border-gray-300"
          >
            <ChevronLeft size={20} color="#6b7280" />
            <Text className="font-semibold ml-2 text-gray-700">
              Back
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleNext}
            disabled={selectedTasks.length === 0}
            className={`flex-1 flex-row items-center justify-center py-4 px-6 rounded-xl ${
              selectedTasks.length > 0 ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <Text className={`font-semibold mr-2 ${
              selectedTasks.length > 0 ? 'text-white' : 'text-gray-500'
            }`}>
              {isLastGroup ? 'Review' : 'Next Group'}
            </Text>
            <ChevronRight size={20} color={selectedTasks.length > 0 ? '#ffffff' : '#6b7280'} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}