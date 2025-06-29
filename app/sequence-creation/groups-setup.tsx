import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { 
  setCurrentStep,
  addGroup,
  updateGroup,
  deleteGroup,
  selectGroups,
  selectIsStepValid
} from '../../store/slices/sequenceCreationSlice';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import GroupCard from '../../components/sequence-creation/GroupCard';
import GroupEditModal from '../../components/sequence-creation/GroupEditModal';
import { useRouter } from 'expo-router';

export default function GroupsSetupScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const groups = useSelector(selectGroups);
  const canAdvance = useSelector((state: RootState) => selectIsStepValid(2)(state));
  const selectedTasksByGroup = useSelector((state: RootState) => state.sequenceCreation.selectedTasksByGroup);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<typeof groups[0] | undefined>(undefined);

  useEffect(() => {
    // Set current step when screen mounts
    dispatch(setCurrentStep(2));
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (canAdvance && groups.length > 0) {
      // Navigate to first group's task selection
      router.push(`/sequence-creation/add-tasks/${groups[0].id}?groupIndex=0&totalGroups=${groups.length}`);
    }
  }, [canAdvance, groups, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleAddGroup = useCallback(() => {
    setEditingGroup(undefined);
    setModalVisible(true);
  }, []);

  const handleEditGroup = useCallback((group: typeof groups[0]) => {
    setEditingGroup(group);
    setModalVisible(true);
  }, []);

  const handleSaveGroup = useCallback((groupData: { name: string; activeDays: number[] }) => {
    if (editingGroup) {
      dispatch(updateGroup({
        id: editingGroup.id,
        updates: groupData,
      }));
    } else {
      dispatch(addGroup(groupData));
    }
    setModalVisible(false);
  }, [dispatch, editingGroup]);

  const handleDeleteGroup = useCallback((groupId: string, hasTasks: boolean) => {
    const doDelete = () => {
      dispatch(deleteGroup(groupId));
    };
    
    if (hasTasks) {
      Alert.alert(
        'Delete Group',
        'This group has tasks assigned. Are you sure you want to delete it?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    } else {
      Alert.alert(
        'Delete Group',
        'Are you sure you want to delete this group?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  }, [dispatch]);

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
            {groups.map((group) => {
              const hasTasks = (selectedTasksByGroup[group.id] || []).length > 0;
              
              return (
                <GroupCard
                  key={group.id}
                  group={group}
                  onEdit={() => handleEditGroup(group)}
                  onDelete={() => handleDeleteGroup(group.id, hasTasks)}
                  hasAssignedTasks={hasTasks}
                />
              );
            })}
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
          onPress={handleAddGroup}
          className="flex-row items-center justify-center py-4 px-6 bg-white rounded-xl border-2 border-dashed border-gray-300 mb-4"
        >
          <Plus size={20} color="#6b7280" />
          <Text className="font-semibold ml-2 text-gray-700">
            Add Group
          </Text>
        </TouchableOpacity>
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

      {/* Group Edit Modal */}
      <GroupEditModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveGroup}
        existingGroup={editingGroup}
        existingGroupNames={groups.map(g => g.name)}
      />
    </View>
  );
}
