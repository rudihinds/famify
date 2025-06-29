import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface DayPillSelectorProps {
  selectedDays: number[];
  onDaysChange: (days: number[]) => void;
  error?: boolean;
}

const DayPillSelector: React.FC<DayPillSelectorProps> = ({
  selectedDays,
  onDaysChange,
  error = false,
}) => {
  const days = [
    { id: 1, label: 'Mon', fullName: 'Monday' },
    { id: 2, label: 'Tue', fullName: 'Tuesday' },
    { id: 3, label: 'Wed', fullName: 'Wednesday' },
    { id: 4, label: 'Thu', fullName: 'Thursday' },
    { id: 5, label: 'Fri', fullName: 'Friday' },
    { id: 6, label: 'Sat', fullName: 'Saturday' },
    { id: 7, label: 'Sun', fullName: 'Sunday' },
  ];

  const toggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      onDaysChange(selectedDays.filter(d => d !== dayId));
    } else {
      onDaysChange([...selectedDays, dayId].sort((a, b) => a - b));
    }
  };

  return (
    <View>
      <View className="flex-row flex-wrap gap-2">
        {days.map((day) => {
          const isSelected = selectedDays.includes(day.id);
          return (
            <TouchableOpacity
              key={day.id}
              onPress={() => toggleDay(day.id)}
              className={`px-4 py-2 rounded-full border-2 ${
                isSelected 
                  ? 'bg-indigo-600 border-indigo-600' 
                  : error 
                    ? 'bg-white border-red-300'
                    : 'bg-white border-gray-300'
              }`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${day.fullName} ${isSelected ? 'selected' : 'not selected'}`}
            >
              <Text className={`text-sm font-medium ${
                isSelected ? 'text-white' : error ? 'text-red-600' : 'text-gray-700'
              }`}>
                {day.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error && (
        <Text className="text-red-500 text-sm mt-2">
          Please select at least one day
        </Text>
      )}
    </View>
  );
};

export default DayPillSelector;