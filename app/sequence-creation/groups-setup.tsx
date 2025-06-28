import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { 
  setCurrentStep,
  addGroup,
  selectGroups,
  selectCanAdvanceStep
} from '../../store/slices/sequenceCreationSlice';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';

export default function GroupsSetupScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const groups = useSelector(selectGroups);
  const canAdvance = useSelector(selectCanAdvanceStep);

  useEffect(() => {
    // Set current step when screen mounts
    dispatch(setCurrentStep(2));
  }, [dispatch]);

  const handleNext = () => {
    if (canAdvance && groups.length > 0) {
      // Navigate to first group's task selection
      router.push(`/sequence-creation/add-tasks/${groups[0].id}?groupIndex=0&totalGroups=${groups.length}`);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const addTestGroup = () => {
    dispatch(addGroup({
      name: `Test Group ${groups.length + 1}`,
      activeDays: [1, 2, 3, 4, 5], // Mon-Fri
    }));
  };

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Create Groups
        </Text>
        <Text className="text-gray-600 mb-6">
          Organize tasks into contextual groups
        </Text>

        {/* Groups List */}
        {groups.length > 0 ? (
          <View className="mb-6">
            {groups.map((group, index) => (
              <View key={group.id} className="bg-white rounded-xl p-4 shadow-sm mb-3">
                <Text className="font-semibold text-gray-900">
                  {group.name}
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Active days: {group.activeDays.length}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <Text className="text-center text-gray-500">
              No groups created yet
            </Text>
            <Text className="text-center text-gray-400 text-sm mt-2">
              Tap the button below to add a group
            </Text>
          </View>
        )}

        {/* Add Group Button */}
        <TouchableOpacity
          onPress={addTestGroup}
          className="flex-row items-center justify-center py-4 px-6 bg-white rounded-xl border-2 border-dashed border-gray-300 mb-4"
        >
          <Plus size={20} color="#6b7280" />
          <Text className="font-semibold ml-2 text-gray-700">
            Add Group (Test)
          </Text>
        </TouchableOpacity>

        <View className="bg-blue-50 rounded-xl p-4 mb-4">
          <Text className="text-blue-700 text-sm">
            Full implementation will include:
          </Text>
          <Text className="text-blue-600 text-sm mt-1">
            • Group name input
          </Text>
          <Text className="text-blue-600 text-sm">
            • Day selector (Mon-Sun)
          </Text>
          <Text className="text-blue-600 text-sm">
            • Edit/Delete functionality
          </Text>
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
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
            onPress={handleNext}
            disabled={!canAdvance}
            className={`flex-1 flex-row items-center justify-center py-4 px-6 rounded-xl ${
              canAdvance ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <Text className={`font-semibold mr-2 ${
              canAdvance ? 'text-white' : 'text-gray-500'
            }`}>
              Next
            </Text>
            <ChevronRight size={20} color={canAdvance ? '#ffffff' : '#6b7280'} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}