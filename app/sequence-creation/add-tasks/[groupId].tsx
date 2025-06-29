import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { 
  setCurrentStep,
  addTaskToGroup,
  removeTaskFromGroup,
  selectGroups,
  selectTasksForGroup,
  selectCanAdvanceStep
} from '../../../store/slices/sequenceCreationSlice';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react-native';
import TaskSearchBar from '../../../components/sequence-creation/TaskSearchBar';
import CategorySection from '../../../components/sequence-creation/CategorySection';
import { taskService } from '../../../services/taskService';
import { TaskCategory, TaskTemplate } from '../../../types/task';
import { useNavigationSafety } from '../../../hooks/useNavigationSafety';
import { errorHandler, withErrorHandling } from '../../../services/errorService';

export default function AddTasksScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { navigate, goBack } = useNavigationSafety();
  const { groupId, groupIndex, totalGroups } = useLocalSearchParams<{
    groupId: string;
    groupIndex: string;
    totalGroups: string;
  }>();
  
  const groups = useSelector(selectGroups);
  const selectedTaskIds = useSelector((state: RootState) => selectTasksForGroup(groupId)(state));
  const canAdvance = useSelector(selectCanAdvanceStep);
  const parentId = useSelector((state: RootState) => state.auth.user?.id);
  
  const currentGroupIndex = parseInt(groupIndex || '0');
  const totalGroupsCount = parseInt(totalGroups || '1');
  const currentGroup = groups.find(g => g.id === groupId);
  const isLastGroup = currentGroupIndex === totalGroupsCount - 1;

  // State for tasks and UI
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomTaskModal, setShowCustomTaskModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [customTaskName, setCustomTaskName] = useState('');

  useEffect(() => {
    // Set current step when screen mounts
    dispatch(setCurrentStep(3));
  }, [dispatch]);

  // Load task data
  useEffect(() => {
    const loadTaskData = async () => {
      try {
        setIsLoading(true);
        const [categoriesData, templatesData] = await Promise.all([
          taskService.getTaskCategories(),
          taskService.getTaskTemplates(parentId || undefined)
        ]);
        setCategories(categoriesData);
        setTemplates(templatesData);
        
        // Auto-expand first category
        if (categoriesData.length > 0) {
          setExpandedCategories(new Set([categoriesData[0].id]));
        }
      } catch (error) {
        console.error('Failed to load task data:', error);
        Alert.alert('Error', 'Failed to load tasks. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTaskData();
  }, [parentId]);

  // Filter templates based on search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    return taskService.filterTemplatesBySearch(templates, searchQuery);
  }, [templates, searchQuery]);

  // Group filtered templates by category
  const templatesByCategory = useMemo(() => {
    const grouped = new Map<string, TaskTemplate[]>();
    
    categories.forEach(category => {
      const categoryTemplates = filteredTemplates.filter(t => t.category_id === category.id);
      if (categoryTemplates.length > 0) {
        grouped.set(category.id, categoryTemplates);
      }
    });
    
    return grouped;
  }, [categories, filteredTemplates]);

  const handleNext = () => {
    if (selectedTaskIds.length > 0) {
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

  const handleBack = useCallback(() => {
    if (currentGroupIndex === 0) {
      // Go back to groups setup
      navigate('/sequence-creation/groups-setup');
    } else {
      // Go to previous group
      goBack();
    }
  }, [currentGroupIndex, navigate, goBack]);

  const handleTaskToggle = useCallback((taskId: string) => {
    if (selectedTaskIds.includes(taskId)) {
      dispatch(removeTaskFromGroup({ groupId, taskId }));
    } else {
      dispatch(addTaskToGroup({ groupId, taskId }));
    }
  }, [selectedTaskIds, dispatch, groupId]);

  const handleCategoryToggle = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  const handleCreateCustomTask = useCallback((categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setCustomTaskName('');
    setShowCustomTaskModal(true);
  }, []);

  const handleSaveCustomTask = useCallback(async () => {
    if (!customTaskName.trim() || !selectedCategoryId || !parentId) return;

    try {
      const newTask = await taskService.createCustomTaskTemplate(parentId, {
        name: customTaskName.trim(),
        category_id: selectedCategoryId,
        effort_score: 2, // Default medium effort
        photo_proof_required: false,
      });
      
      // Add to local state
      setTemplates(prev => [...prev, newTask]);
      
      // Auto-select the new task
      dispatch(addTaskToGroup({ groupId, taskId: newTask.id }));
      
      setShowCustomTaskModal(false);
      setCustomTaskName('');
    } catch (error) {
      console.error('Failed to create custom task:', error);
      Alert.alert('Error', 'Failed to create custom task. Please try again.');
    }
  }, [customTaskName, selectedCategoryId, parentId, dispatch, groupId]);

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView className="flex-1 px-4 pt-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Add Tasks: {currentGroup?.name || 'Unknown Group'}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-gray-600">
              Group {currentGroupIndex + 1} of {totalGroupsCount}
            </Text>
            {selectedTaskIds.length > 0 && (
              <View className="bg-indigo-100 px-3 py-1 rounded-full">
                <Text className="text-indigo-700 font-medium text-sm">
                  {selectedTaskIds.length} selected
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Search Bar */}
        <View className="mb-4">
          <TaskSearchBar 
            onSearch={setSearchQuery}
            placeholder="Search tasks..."
          />
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View className="items-center py-12">
            <Text className="text-gray-500">Loading tasks...</Text>
          </View>
        ) : (
          <>
            {/* Category Sections */}
            {categories.map(category => {
              const categoryTemplates = templatesByCategory.get(category.id) || [];
              if (categoryTemplates.length === 0 && searchQuery) return null;
              
              return (
                <CategorySection
                  key={category.id}
                  category={category}
                  tasks={categoryTemplates}
                  selectedTaskIds={selectedTaskIds}
                  onTaskToggle={handleTaskToggle}
                  onCreateCustomTask={() => handleCreateCustomTask(category.id)}
                  isExpanded={expandedCategories.has(category.id)}
                  onToggleExpand={() => handleCategoryToggle(category.id)}
                />
              );
            })}
            
            {/* No results message */}
            {searchQuery && templatesByCategory.size === 0 && (
              <View className="bg-white rounded-xl p-6 items-center">
                <Text className="text-gray-500 text-center mb-4">
                  No tasks found matching "{searchQuery}"
                </Text>
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  className="py-2 px-4 bg-gray-100 rounded-lg"
                >
                  <Text className="text-gray-700">Clear search</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Custom Task Modal */}
      <Modal
        visible={showCustomTaskModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomTaskModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900">
                Create Custom Task
              </Text>
              <TouchableOpacity
                onPress={() => setShowCustomTaskModal(false)}
                className="p-2"
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              value={customTaskName}
              onChangeText={setCustomTaskName}
              placeholder="Enter task name..."
              placeholderTextColor="#9ca3af"
              className="bg-gray-100 rounded-xl px-4 py-3 text-base mb-4"
              autoFocus
              autoCapitalize="sentences"
            />
            
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setShowCustomTaskModal(false)}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl"
              >
                <Text className="text-center font-semibold text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleSaveCustomTask}
                disabled={!customTaskName.trim()}
                className={`flex-1 py-3 px-4 rounded-xl ${
                  customTaskName.trim() ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <Text className={`text-center font-semibold ${
                  customTaskName.trim() ? 'text-white' : 'text-gray-500'
                }`}>
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Navigation Buttons */}
      <View className="px-4 pb-6 pt-4 bg-white border-t border-gray-200">
        <View className="bg-gray-100 rounded-lg p-3 mb-3">
          <Text className="text-center text-gray-700 font-medium">
            Selected: {selectedTaskIds.length} tasks
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
            disabled={selectedTaskIds.length === 0}
            className={`flex-1 flex-row items-center justify-center py-4 px-6 rounded-xl ${
              selectedTaskIds.length > 0 ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <Text className={`font-semibold mr-2 ${
              selectedTaskIds.length > 0 ? 'text-white' : 'text-gray-500'
            }`}>
              {isLastGroup ? 'Review' : 'Next Group'}
            </Text>
            <ChevronRight size={20} color={selectedTaskIds.length > 0 ? '#ffffff' : '#6b7280'} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}