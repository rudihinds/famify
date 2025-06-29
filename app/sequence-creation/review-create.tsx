import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { 
  setCurrentStep,
  selectSelectedChild,
  selectSequenceSettings,
  selectGroups,
  selectTotalTaskCount,
  selectFamcoinPerTask,
  selectIsLoading,
  selectIsEditing,
  selectEditingSequenceId,
  createSequence
} from '../../store/slices/sequenceCreationSlice';
import { ChevronLeft, Check, Calendar, Coins, Users, ListTodo } from 'lucide-react-native';
import ChildInfoCard from '../../components/sequence-creation/ChildInfoCard';
import ExpandableGroupSection from '../../components/sequence-creation/ExpandableGroupSection';
import SequenceCreationSuccess from '../../components/sequence-creation/SequenceCreationSuccess';
import { childService } from '../../services/childService';
import { useNavigationSafety } from '../../hooks/useNavigationSafety';
import { errorHandler, withErrorHandling } from '../../services/errorService';

export default function ReviewCreateScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { navigate, goBack } = useNavigationSafety();
  
  const selectedChildId = useSelector(selectSelectedChild);
  const sequenceSettings = useSelector(selectSequenceSettings);
  const groups = useSelector(selectGroups);
  const totalTasks = useSelector(selectTotalTaskCount);
  const famcoinPerTask = useSelector(selectFamcoinPerTask);
  const isLoading = useSelector(selectIsLoading);
  const isEditing = useSelector(selectIsEditing);
  const editingSequenceId = useSelector(selectEditingSequenceId);
  const selectedTasksByGroup = useSelector((state: RootState) => state.sequenceCreation.selectedTasksByGroup);
  const user = useSelector((state: RootState) => state.auth.user);

  // Local state for child data
  const [childData, setChildData] = useState<any>(null);
  const [isLoadingChild, setIsLoadingChild] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Set current step when screen mounts
    dispatch(setCurrentStep(4));
    
    // Debug logging
    console.log('Review Screen Data:', {
      sequenceSettings,
      groups: groups.map(g => ({ id: g.id, name: g.name, activeDays: g.activeDays })),
      totalTasks,
      selectedTasksByGroup
    });
  }, [dispatch]);

  // Fetch child details
  useEffect(() => {
    const fetchChildData = async () => {
      if (!selectedChildId || !user?.id) {
        setIsLoadingChild(false);
        return;
      }

      try {
        const children = await childService.getChildrenByParentId(user.id);
        const child = children.find(c => c.id === selectedChildId);
        setChildData(child);
      } catch (error) {
        console.error('Failed to fetch child data:', error);
      } finally {
        setIsLoadingChild(false);
      }
    };

    fetchChildData();
  }, [selectedChildId, user?.id]);

  const handleCreate = useCallback(async () => {
    // Prevent double-creation
    if (isLoading) return;
    
    Alert.alert(
      isEditing ? 'Update Sequence' : 'Create Sequence',
      isEditing ? 'Are you ready to update this sequence?' : 'Are you ready to create this sequence? You can still make changes after creation.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: isEditing ? 'Update' : 'Create',
          style: 'default',
          onPress: async () => {
            const result = await dispatch(createSequence());
            if (createSequence.fulfilled.match(result)) {
              // Show success animation
              setShowSuccess(true);
            } else {
              // Show specific error message
              const errorMessage = result.payload || 'Failed to create sequence. Please try again.';
              Alert.alert(
                'Error',
                errorMessage as string,
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  }, [isLoading, isEditing, dispatch]);

  const handleBack = useCallback(() => {
    goBack();
  }, [goBack]);

  const handleEdit = useCallback((step: string) => {
    navigate(`/sequence-creation/${step}` as any);
  }, [navigate]);

  return (
    <View className="flex-1 bg-gray-100">
      {/* Loading Modal */}
      <Modal
        visible={isLoading}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 items-center justify-center">
          <View className="bg-white rounded-xl p-8 items-center">
            <ActivityIndicator size="large" color="#6366f1" />
            <Text className="mt-4 text-gray-700 font-medium">
              {isEditing ? 'Updating sequence...' : 'Creating sequence...'}
            </Text>
            <Text className="mt-2 text-sm text-gray-500">This may take a moment</Text>
          </View>
        </View>
      </Modal>
      <ScrollView className="flex-1 px-4 pt-6">
        {/* Progress Indicator */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-gray-600">Step 5 of 5</Text>
            <Text className="text-sm font-medium text-indigo-600">Review & Create</Text>
          </View>
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <View className="h-full bg-indigo-600 rounded-full" style={{ width: '100%' }} />
          </View>
        </View>

        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Review Sequence
        </Text>
        <Text className="text-gray-600 mb-6">
          {isEditing ? 'Confirm all details before updating' : 'Confirm all details before creating'}
        </Text>

        {/* Child Info Card */}
        <View className="bg-white rounded-xl p-6 shadow-sm mb-4">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-row items-center">
              <Users size={20} color="#6366f1" />
              <Text className="font-semibold text-gray-900 ml-2">Selected Child</Text>
            </View>
            <TouchableOpacity onPress={() => handleEdit('select-child')}>
              <Text className="text-indigo-600 text-sm">Edit</Text>
            </TouchableOpacity>
          </View>
          {isLoadingChild ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : childData ? (
            <ChildInfoCard child={childData} />
          ) : (
            <Text className="text-gray-500">No child selected</Text>
          )}
        </View>

        <View className="bg-white rounded-xl p-6 shadow-sm mb-4">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-row items-center">
              <Calendar size={20} color="#6366f1" />
              <Text className="font-semibold text-gray-900 ml-2">Sequence Settings</Text>
            </View>
            <TouchableOpacity onPress={() => handleEdit('sequence-settings')}>
              <Text className="text-indigo-600 text-sm">Edit</Text>
            </TouchableOpacity>
          </View>
          
          {/* Period & Dates */}
          <View className="mb-3">
            <Text className="text-sm text-gray-500 mb-1">Duration</Text>
            <Text className="text-base text-gray-900">
              {sequenceSettings.period === 'weekly' ? '1 Week' : 
               sequenceSettings.period === 'fortnightly' ? '2 Weeks' : 
               sequenceSettings.period === 'monthly' ? '1 Month' : 
               'Ongoing'}
            </Text>
          </View>
          
          <View className="mb-3">
            <Text className="text-sm text-gray-500 mb-1">Start Date</Text>
            <Text className="text-base text-gray-900">
              {sequenceSettings.startDate ? 
                new Date(sequenceSettings.startDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Not set'}
            </Text>
          </View>
          
          {sequenceSettings.period && sequenceSettings.startDate && (
            <View className="mb-3">
              <Text className="text-sm text-gray-500 mb-1">End Date</Text>
              <Text className="text-base text-gray-900">
                {(() => {
                  const startDate = new Date(sequenceSettings.startDate);
                  const endDate = new Date(startDate);
                  if (sequenceSettings.period === 'weekly') {
                    endDate.setDate(startDate.getDate() + 7);
                  } else if (sequenceSettings.period === 'fortnightly') {
                    endDate.setDate(startDate.getDate() + 14);
                  } else if (sequenceSettings.period === 'monthly') {
                    // For monthly, preserve the same day of month
                    const nextMonth = startDate.getMonth() + 1;
                    const nextYear = startDate.getFullYear() + Math.floor(nextMonth / 12);
                    const targetMonth = nextMonth % 12;
                    
                    // Set to the same day of the next month
                    endDate.setFullYear(nextYear);
                    endDate.setMonth(targetMonth);
                    endDate.setDate(startDate.getDate());
                    
                    // Handle edge case where the day doesn't exist in the target month
                    // (e.g., Jan 31 -> Feb 31 doesn't exist, so it becomes Feb 28/29)
                    if (endDate.getMonth() !== targetMonth) {
                      // Date rolled over to next month, so use last day of target month
                      endDate.setDate(0); // Sets to last day of previous month
                    }
                  }
                  return endDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                })()}
              </Text>
            </View>
          )}
          
          {/* Budget */}
          <View className="mt-4 pt-4 border-t border-gray-100">
            <Text className="text-sm text-gray-500 mb-2">Budget</Text>
            <View className="flex-row items-baseline">
              <Text className="text-2xl font-bold text-gray-900">
                {sequenceSettings.currencyCode === 'GBP' ? '£' : 
                 sequenceSettings.currencyCode === 'USD' ? '$' : 
                 sequenceSettings.currencyCode === 'EUR' ? '€' : ''}
                {sequenceSettings.budget}
              </Text>
              <Text className="text-lg text-gray-500 ml-3">
                = {sequenceSettings.budgetFamcoins} FAMCOINS
              </Text>
            </View>
          </View>
        </View>

        {/* Groups Summary */}
        <View className="mb-4">
          <View className="flex-row items-center mb-3">
            <ListTodo size={20} color="#6366f1" />
            <Text className="font-semibold text-gray-900 ml-2">Groups & Tasks</Text>
          </View>
          {groups.map((group, index) => (
            <ExpandableGroupSection
              key={group.id}
              group={group}
              selectedTaskIds={selectedTasksByGroup[group.id] || []}
              onEdit={() => navigate(`/sequence-creation/add-tasks/${group.id}?groupIndex=${index}&totalGroups=${groups.length}`)}
            />
          ))}
        </View>


        {/* FAMCOIN Distribution */}
        <View className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
          <View className="flex-row items-center mb-4">
            <Coins size={20} color="#4f46e5" />
            <Text className="font-semibold text-indigo-900 ml-2">
              FAMCOIN Distribution
            </Text>
          </View>
          
          {/* Budget Breakdown */}
          <View className="bg-white/70 rounded-lg p-4 mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Budget Breakdown</Text>
            <View className="flex-row items-baseline mb-1">
              <Text className="text-2xl font-bold text-indigo-900">
                {sequenceSettings.budgetFamcoins}
              </Text>
              <Text className="text-sm text-indigo-700 ml-2">Total FAMCOINS</Text>
            </View>
            <Text className="text-sm text-gray-600 mt-1">
              From {sequenceSettings.currencyCode === 'GBP' ? '£' : 
                    sequenceSettings.currencyCode === 'USD' ? '$' : 
                    sequenceSettings.currencyCode === 'EUR' ? '€' : ''}
              {sequenceSettings.budget} at 10:1 conversion
            </Text>
          </View>
          
          {/* Task Distribution */}
          <View className="bg-white/70 rounded-lg p-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Task Distribution</Text>
            
            <View className="mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-sm text-gray-600">Total Task Completions</Text>
                <Text className="text-sm font-medium text-gray-900">{totalTasks}</Text>
              </View>
              
              <View className="flex-row justify-between mb-1">
                <Text className="text-sm text-gray-600">FAMCOINS per Task</Text>
                <Text className="text-sm font-medium text-indigo-700">{famcoinPerTask}</Text>
              </View>
              
              {/* Calculate daily breakdown */}
              {(() => {
                if (!sequenceSettings.period) return null;
                
                const weeks = sequenceSettings.period === 'weekly' ? 1 : 
                             sequenceSettings.period === 'fortnightly' ? 2 : 
                             sequenceSettings.period === 'monthly' ? 4.34 : 1;
                
                // Calculate total tasks per active day
                // First, get the total number of tasks assigned per week
                let tasksPerWeek = 0;
                groups.forEach(group => {
                  const tasksInGroup = (selectedTasksByGroup[group.id] || []).length;
                  const daysPerWeek = (group.activeDays || []).length;
                  tasksPerWeek += tasksInGroup * daysPerWeek;
                });
                
                // Get unique active days across all groups to know how many days per week have tasks
                const uniqueActiveDays = new Set<number>();
                groups.forEach(group => {
                  (group.activeDays || []).forEach(day => uniqueActiveDays.add(day));
                });
                const activeDaysPerWeek = uniqueActiveDays.size;
                
                // Average tasks per active day (not per calendar day)
                const avgTasksPerDay = activeDaysPerWeek > 0 ? tasksPerWeek / activeDaysPerWeek : 0;
                const avgFamcoinsPerDay = avgTasksPerDay * famcoinPerTask;
                
                return (
                  <>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-sm text-gray-600">Avg Tasks per Day</Text>
                      <Text className="text-sm font-medium text-gray-900">~{Math.round(avgTasksPerDay)}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-gray-600">Avg FAMCOINS per Day</Text>
                      <Text className="text-sm font-medium text-indigo-700">~{Math.round(avgFamcoinsPerDay)}</Text>
                    </View>
                  </>
                );
              })()}
            </View>
            
            <View className="mt-3 pt-3 border-t border-gray-200">
              <Text className="text-xs text-gray-500">
                💡 Tip: Add bonus tasks to allow children to earn extra FAMCOINS
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Create Button */}
      <View className="px-4 pb-6 pt-4 bg-white border-t border-gray-200">
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
            onPress={handleCreate}
            disabled={isLoading}
            className="flex-1 flex-row items-center justify-center py-4 px-6 rounded-xl bg-green-600"
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Check size={20} color="#ffffff" />
                <Text className="font-semibold ml-2 text-white">
                  {isEditing ? 'Update Sequence' : 'Create Sequence'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Success Animation */}
      <SequenceCreationSuccess
        visible={showSuccess}
        childName={childData?.name || 'your child'}
        onComplete={() => {
          // Navigate to tasks tab
          navigate('/(parent)/tasks', { replace: true });
        }}
      />
    </View>
  );
}