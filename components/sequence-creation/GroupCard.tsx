import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { X, Edit2, Calendar } from 'lucide-react-native';

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    activeDays: number[];
  };
  onEdit: () => void;
  onDelete: () => void;
  hasAssignedTasks?: boolean;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  onEdit,
  onDelete,
  hasAssignedTasks = false,
}) => {
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const getActiveDaysDisplay = () => {
    if (group.activeDays.length === 0) return 'No days selected';
    if (group.activeDays.length === 7) return 'Every day';
    
    return group.activeDays
      .map(day => dayLabels[day - 1])
      .join(', ');
  };

  const getActiveDaysPills = () => {
    return group.activeDays
      .slice(0, 3)
      .map(day => dayLabels[day - 1]);
  };

  const remainingDaysCount = group.activeDays.length > 3 
    ? group.activeDays.length - 3 
    : 0;

  return (
    <TouchableOpacity
      onPress={onEdit}
      className="bg-white rounded-xl p-4 shadow-sm mb-3"
      accessibilityRole="button"
      accessibilityLabel={`Edit ${group.name} group`}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-2">
            <Calendar size={16} color="#6b7280" />
            <Text className="font-semibold text-gray-900 text-lg ml-2">
              {group.name}
            </Text>
          </View>
          
          {/* Active Days Pills */}
          <View className="flex-row flex-wrap items-center gap-1">
            {getActiveDaysPills().map((day, index) => (
              <View 
                key={`${day}-${index}`}
                className="px-2 py-1 bg-indigo-100 rounded-full"
              >
                <Text className="text-xs font-medium text-indigo-700">
                  {day}
                </Text>
              </View>
            ))}
            {remainingDaysCount > 0 && (
              <View className="px-2 py-1 bg-gray-100 rounded-full">
                <Text className="text-xs font-medium text-gray-600">
                  +{remainingDaysCount} more
                </Text>
              </View>
            )}
          </View>
          
          {hasAssignedTasks && (
            <Text className="text-xs text-gray-500 mt-2">
              Has assigned tasks
            </Text>
          )}
        </View>
        
        {/* Action Buttons */}
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2"
            accessibilityRole="button"
            accessibilityLabel={`Edit ${group.name}`}
          >
            <Edit2 size={18} color="#6b7280" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2"
            accessibilityRole="button"
            accessibilityLabel={`Delete ${group.name}`}
          >
            <X size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default GroupCard;