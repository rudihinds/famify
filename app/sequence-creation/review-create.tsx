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
  createSequence
} from '../../store/slices/sequenceCreationSlice';
import { Calendar, Coins, Users, ListTodo } from 'lucide-react-native';
import ChildInfoCard from '../../components/sequence-creation/ChildInfoCard';
import ExpandableGroupSection from '../../components/sequence-creation/ExpandableGroupSection';
import SequenceCreationSuccess from '../../components/sequence-creation/SequenceCreationSuccess';
import BottomNavigation from '../../components/sequence-creation/BottomNavigation';
import { childService } from '../../services/childService';
import { useRouter } from 'expo-router';

export default function ReviewCreateScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  
  const selectedChildId = useSelector(selectSelectedChild);
  const sequenceSettings = useSelector(selectSequenceSettings);
  const groups = useSelector(selectGroups);
  const totalTasks = useSelector(selectTotalTaskCount);
  const famcoinPerTask = useSelector(selectFamcoinPerTask);
  const isLoading = useSelector(selectIsLoading);
  const isEditing = useSelector(selectIsEditing);
  const selectedTasksByGroup = useSelector((state: RootState) => state.sequenceCreation.selectedTasksByGroup);
  const user = useSelector((state: RootState) => state.auth.user);

  // Local state for child data
  const [childData, setChildData] = useState<any>(null);
  const [isLoadingChild, setIsLoadingChild] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shouldNavigate, setShouldNavigate] = useState(false);

  useEffect(() => {
    // Set current step when screen mounts
    dispatch(setCurrentStep(4));
  }, [dispatch]);

  // Handle navigation after success
  useEffect(() => {
    if (shouldNavigate) {
      // Just navigate - don't reset state here
      // State will be reset when starting a new sequence
      router.replace('/(parent)/tasks');
    }
  }, [shouldNavigate, router]);

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
    router.back();
  }, [router]);

  const handleEdit = useCallback((step: string) => {
    router.push(`/sequence-creation/${step}` as any);
  }, [router]);

  return (
    <View className="flex-1 bg-gray-100">
      {/* Loading Modal */}
      <Modal
        visible={isLoading}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="items-center p-8 bg-white rounded-xl">
            <ActivityIndicator size="large" color="#6366f1" />
            <Text className="mt-4 font-medium text-gray-700">
              {isEditing ? 'Updating sequence...' : 'Creating sequence...'}
            </Text>
            <Text className="mt-2 text-sm text-gray-500">This may take a moment</Text>
          </View>
        </View>
      </Modal>
      <ScrollView className="flex-1 px-4 pt-6">
        {/* Progress Indicator */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm text-gray-600">Step 5 of 5</Text>
            <Text className="text-sm font-medium text-indigo-600">Review & Create</Text>
          </View>
          <View className="overflow-hidden h-2 bg-gray-200 rounded-full">
            <View className="h-full bg-indigo-600 rounded-full" style={{ width: '100%' }} />
          </View>
        </View>

        <Text className="mb-2 text-2xl font-bold text-gray-900">
          Review Sequence
        </Text>
        <Text className="mb-6 text-gray-600">
          {isEditing ? 'Confirm all details before updating' : 'Confirm all details before creating'}
        </Text>

        {/* Child Info Card */}
        <View className="p-6 mb-4 bg-white rounded-xl shadow-sm">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-row items-center">
              <Users size={20} color="#6366f1" />
              <Text className="ml-2 font-semibold text-gray-900">Selected Child</Text>
            </View>
            <TouchableOpacity onPress={() => handleEdit('select-child')}>
              <Text className="text-sm text-indigo-600">Edit</Text>
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

        <View className="p-6 mb-4 bg-white rounded-xl shadow-sm">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-row items-center">
              <Calendar size={20} color="#6366f1" />
              <Text className="ml-2 font-semibold text-gray-900">Sequence Settings</Text>
            </View>
            <TouchableOpacity onPress={() => handleEdit('sequence-settings')}>
              <Text className="text-sm text-indigo-600">Edit</Text>
            </TouchableOpacity>
          </View>
          
          {/* Period & Dates */}
          <View className="mb-3">
            <Text className="mb-1 text-sm text-gray-500">Duration</Text>
            <Text className="text-base text-gray-900">
              {sequenceSettings.period === 'weekly' ? '1 Week' : 
               sequenceSettings.period === 'fortnightly' ? '2 Weeks' : 
               sequenceSettings.period === 'monthly' ? '1 Month' : 
               'Ongoing'}
            </Text>
          </View>
          
          <View className="mb-3">
            <Text className="mb-1 text-sm text-gray-500">Start Date</Text>
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
              <Text className="mb-1 text-sm text-gray-500">End Date</Text>
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
          <View className="pt-4 mt-4 border-t border-gray-100">
            <Text className="mb-2 text-sm text-gray-500">Budget</Text>
            <View className="flex-row items-baseline">
              <Text className="text-2xl font-bold text-gray-900">
                {sequenceSettings.currencyCode === 'GBP' ? '£' : 
                 sequenceSettings.currencyCode === 'USD' ? '$' : 
                 sequenceSettings.currencyCode === 'EUR' ? '€' : ''}
                {sequenceSettings.budget}
              </Text>
              <Text className="ml-3 text-lg text-gray-500">
                = {sequenceSettings.budgetFamcoins} FAMCOINS
              </Text>
            </View>
          </View>
        </View>

        {/* Groups Summary */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <ListTodo size={20} color="#6366f1" />
              <Text className="ml-2 font-semibold text-gray-900">Groups & Tasks</Text>
            </View>
            <TouchableOpacity onPress={() => handleEdit('groups-setup')}>
              <Text className="text-sm text-indigo-600">Edit</Text>
            </TouchableOpacity>
          </View>
          {groups.map((group) => (
            <ExpandableGroupSection
              key={group.id}
              group={group}
              selectedTaskIds={selectedTasksByGroup[group.id] || []}
            />
          ))}
        </View>


        {/* FAMCOIN Distribution */}
        <View className="p-6 mb-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
          <View className="flex-row items-center mb-4">
            <Coins size={20} color="#4f46e5" />
            <Text className="ml-2 font-semibold text-indigo-900">
              FAMCOIN Distribution
            </Text>
          </View>
          
          {/* Budget Breakdown */}
          <View className="p-4 mb-4 rounded-lg bg-white/70">
            <Text className="mb-2 text-sm font-medium text-gray-700">Budget Breakdown</Text>
            <View className="flex-row items-baseline mb-1">
              <Text className="text-2xl font-bold text-indigo-900">
                {sequenceSettings.budgetFamcoins}
              </Text>
              <Text className="ml-2 text-sm text-indigo-700">Total FAMCOINS</Text>
            </View>
            <Text className="mt-1 text-sm text-gray-600">
              From {sequenceSettings.currencyCode === 'GBP' ? '£' : 
                    sequenceSettings.currencyCode === 'USD' ? '$' : 
                    sequenceSettings.currencyCode === 'EUR' ? '€' : ''}
              {sequenceSettings.budget} at 10:1 conversion
            </Text>
          </View>
          
          {/* Task Distribution */}
          <View className="p-4 rounded-lg bg-white/70">
            <Text className="mb-2 text-sm font-medium text-gray-700">Task Distribution</Text>
            
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
            
            <View className="pt-3 mt-3 border-t border-gray-200">
              <Text className="text-xs text-gray-500">
                💡 Tip: Add bonus tasks to allow children to earn extra FAMCOINS
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        onBack={handleBack}
        onNext={handleCreate}
        nextLabel={isEditing ? 'Update Sequence' : 'Create Sequence'}
        nextDisabled={isLoading}
        nextButtonColor="green"
      />
      
      {/* Success Animation */}
      <SequenceCreationSuccess
        visible={showSuccess}
        childName={childData?.name || 'your child'}
        isEditing={isEditing}
        onComplete={() => {
          // Set flag to trigger navigation in useEffect
          setShouldNavigate(true);
        }}
      />
    </View>
  );
}