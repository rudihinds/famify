import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CheckCircle, X, Coins } from "lucide-react-native";

interface BulkActionBarProps {
  selectedCount: number;
  totalValue?: number;
  onApprove?: () => void;
  onComplete?: () => void;
  onCancel: () => void;
  showApprove?: boolean;
  showComplete?: boolean;
}

export default function BulkActionBar({
  selectedCount,
  totalValue,
  onApprove,
  onComplete,
  onCancel,
  showApprove = false,
  showComplete = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-medium text-gray-900">
          {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
        </Text>
        {totalValue !== undefined && totalValue > 0 && (
          <View className="flex-row items-center">
            <Coins size={16} color="#10b981" />
            <Text className="text-base font-semibold text-green-700 ml-1">
              {totalValue} FC total
            </Text>
          </View>
        )}
      </View>
      
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={onCancel}
          className="px-4 py-2"
        >
          <Text className="text-base font-medium text-gray-600">Cancel</Text>
        </TouchableOpacity>
        
        <View className="flex-row items-center space-x-2">
          {showComplete && onComplete && (
            <TouchableOpacity
              onPress={onComplete}
              className="bg-blue-500 rounded-lg px-4 py-2 flex-row items-center ml-2"
            >
              <CheckCircle size={16} color="white" />
              <Text className="text-white font-medium ml-2">Complete All</Text>
            </TouchableOpacity>
          )}
          
          {showApprove && onApprove && (
            <TouchableOpacity
              onPress={onApprove}
              className="bg-green-500 rounded-lg px-4 py-2 flex-row items-center ml-2"
            >
              <CheckCircle size={16} color="white" />
              <Text className="text-white font-medium ml-2">Approve All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}