import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react-native";
import { format, isToday } from "date-fns";

interface DateNavigatorProps {
  selectedDate: string;
  onDateChange: (direction: "prev" | "next") => void;
  onGoToToday: () => void;
}

export default function DateNavigator({ 
  selectedDate, 
  onDateChange, 
  onGoToToday 
}: DateNavigatorProps) {
  const currentDate = new Date(selectedDate);
  
  return (
    <View className="bg-white border-b border-gray-200 px-4 py-3">
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => onDateChange("prev")}
          className="p-2"
        >
          <ChevronLeft size={20} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onGoToToday}
          className="flex-row items-center"
        >
          <Calendar size={16} color="#6b7280" />
          <Text className="text-base font-medium text-gray-900 ml-2">
            {isToday(currentDate)
              ? "Today"
              : format(currentDate, "EEEE, MMM d")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onDateChange("next")}
          className="p-2"
        >
          <ChevronRight size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
}