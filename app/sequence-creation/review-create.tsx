import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
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
  createSequence
} from '../../store/slices/sequenceCreationSlice';
import { ChevronLeft, Check } from 'lucide-react-native';

export default function ReviewCreateScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  
  const selectedChildId = useSelector(selectSelectedChild);
  const sequenceSettings = useSelector(selectSequenceSettings);
  const groups = useSelector(selectGroups);
  const totalTasks = useSelector(selectTotalTaskCount);
  const famcoinPerTask = useSelector(selectFamcoinPerTask);
  const isLoading = useSelector(selectIsLoading);
  const selectedTasksByGroup = useSelector((state: RootState) => state.sequenceCreation.selectedTasksByGroup);

  useEffect(() => {
    // Set current step when screen mounts
    dispatch(setCurrentStep(4));
  }, [dispatch]);

  const handleCreate = async () => {
    const result = await dispatch(createSequence());
    if (createSequence.fulfilled.match(result)) {
      // Success - navigate back to tasks tab
      router.replace('/(parent)/tasks');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleEdit = (step: string) => {
    router.push(`/sequence-creation/${step}` as any);
  };

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Review Sequence
        </Text>
        <Text className="text-gray-600 mb-6">
          Confirm all details before creating
        </Text>

        {/* Summary Card */}
        <View className="bg-white rounded-xl p-6 shadow-sm mb-4">
          <View className="flex-row justify-between items-start mb-4">
            <Text className="font-semibold text-gray-900">Selected Child</Text>
            <TouchableOpacity onPress={() => handleEdit('select-child')}>
              <Text className="text-indigo-600 text-sm">Edit</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-gray-700">{selectedChildId}</Text>
        </View>

        <View className="bg-white rounded-xl p-6 shadow-sm mb-4">
          <View className="flex-row justify-between items-start mb-4">
            <Text className="font-semibold text-gray-900">Sequence Settings</Text>
            <TouchableOpacity onPress={() => handleEdit('sequence-settings')}>
              <Text className="text-indigo-600 text-sm">Edit</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-gray-700">
            Period: {sequenceSettings.period}
          </Text>
          <Text className="text-gray-700">
            Start Date: {sequenceSettings.startDate ? new Date(sequenceSettings.startDate).toLocaleDateString() : 'Not set'}
          </Text>
          <Text className="text-gray-700">
            Budget: £{sequenceSettings.budget} = {sequenceSettings.budgetFamcoins} FAMCOINS
          </Text>
        </View>

        {/* Groups Summary */}
        <Text className="font-semibold text-gray-900 mb-3">Groups & Tasks</Text>
        {groups.map((group) => (
          <View key={group.id} className="bg-white rounded-xl p-6 shadow-sm mb-4">
            <View className="flex-row justify-between items-start mb-3">
              <Text className="font-semibold text-gray-900">{group.name}</Text>
              <TouchableOpacity onPress={() => handleEdit('groups-setup')}>
                <Text className="text-indigo-600 text-sm">Edit</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-gray-600 text-sm mb-2">
              Active: {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                .filter((_, i) => group.activeDays.includes(i + 1))
                .join(', ')}
            </Text>
            <Text className="text-gray-700">
              Tasks: {selectedTasksByGroup[group.id]?.length || 0}
            </Text>
          </View>
        ))}

        {/* FAMCOIN Distribution */}
        <View className="bg-indigo-50 rounded-xl p-6 mb-6">
          <Text className="font-semibold text-indigo-900 mb-2">
            FAMCOIN Distribution
          </Text>
          <Text className="text-indigo-700">
            Total Tasks: {totalTasks}
          </Text>
          <Text className="text-indigo-700">
            FAMCOINS per Task: {famcoinPerTask}
          </Text>
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
                  Create Sequence
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}