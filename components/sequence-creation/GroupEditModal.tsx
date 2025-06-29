import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import DayPillSelector from './DayPillSelector';

interface GroupEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (group: { name: string; activeDays: number[] }) => void;
  existingGroup?: {
    id: string;
    name: string;
    activeDays: number[];
  };
  existingGroupNames: string[];
}

const GroupEditModal: React.FC<GroupEditModalProps> = ({
  visible,
  onClose,
  onSave,
  existingGroup,
  existingGroupNames,
}) => {
  const [groupName, setGroupName] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [errors, setErrors] = useState<{ name?: string; days?: boolean }>({});
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      // Reset or populate form
      if (existingGroup) {
        setGroupName(existingGroup.name);
        setSelectedDays(existingGroup.activeDays);
      } else {
        setGroupName('');
        setSelectedDays([]);
      }
      setErrors({});
      
      // Focus input after modal animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [visible, existingGroup]);

  const validateAndSave = () => {
    const newErrors: typeof errors = {};
    const trimmedName = groupName.trim();
    
    // Validate name
    if (!trimmedName) {
      newErrors.name = 'Group name is required';
    } else if (
      existingGroupNames.includes(trimmedName) && 
      trimmedName !== existingGroup?.name
    ) {
      newErrors.name = 'A group with this name already exists';
    }
    
    // Validate days
    if (selectedDays.length === 0) {
      newErrors.days = true;
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onSave({
        name: trimmedName,
        activeDays: selectedDays,
      });
    }
  };

  const handleCancel = () => {
    setGroupName('');
    setSelectedDays([]);
    setErrors({});
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleCancel}
    >
      <TouchableOpacity 
        className="flex-1 justify-end bg-black/30"
        activeOpacity={1}
        onPress={handleCancel}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="bg-white rounded-t-3xl">
              {/* Header */}
              <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-200">
                <TouchableOpacity onPress={handleCancel}>
                  <Text className="text-indigo-600 text-base">Cancel</Text>
                </TouchableOpacity>
                <Text className="font-semibold text-base">
                  {existingGroup ? 'Edit Group' : 'New Group'}
                </Text>
                <TouchableOpacity onPress={validateAndSave}>
                  <Text className="text-indigo-600 text-base font-semibold">Save</Text>
                </TouchableOpacity>
              </View>
              
              {/* Content */}
              <View className="p-4">
                {/* Group Name Input */}
                <View className="mb-6">
                  <Text className="font-semibold text-gray-900 mb-2">Group Name</Text>
                  <TextInput
                    ref={inputRef}
                    value={groupName}
                    onChangeText={(text) => {
                      setGroupName(text);
                      if (errors.name) {
                        setErrors({ ...errors, name: undefined });
                      }
                    }}
                    placeholder="e.g., Morning Routine"
                    placeholderTextColor="#9ca3af"
                    className={`px-4 py-3 bg-gray-50 rounded-xl text-base ${
                      errors.name ? 'border-2 border-red-500' : ''
                    }`}
                    maxLength={30}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  {errors.name && (
                    <Text className="text-red-500 text-sm mt-1 ml-1">{errors.name}</Text>
                  )}
                </View>
                
                {/* Day Selection */}
                <View className="mb-6">
                  <Text className="font-semibold text-gray-900 mb-3">Active Days</Text>
                  <DayPillSelector
                    selectedDays={selectedDays}
                    onDaysChange={(days) => {
                      setSelectedDays(days);
                      if (errors.days) {
                        setErrors({ ...errors, days: false });
                      }
                    }}
                    error={errors.days}
                  />
                </View>
                
                {/* Summary */}
                {groupName.trim() && selectedDays.length > 0 && (
                  <View className="bg-indigo-50 rounded-xl p-3">
                    <Text className="text-sm text-indigo-700">
                      "{groupName.trim()}" will be active {selectedDays.length === 7 ? 'every day' : `${selectedDays.length} days per week`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

export default GroupEditModal;