import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { Check, X, Clock, Gift, ShoppingBag } from "lucide-react-native";

interface PendingAction {
  id: string;
  type: "task" | "wishlist" | "redemption";
  title: string;
  childName: string;
  timestamp: string;
  imageUrl?: string;
  famcoins?: number;
}

interface PendingActionsSectionProps {
  pendingActions?: PendingAction[];
  onApprove?: (id: string, type: string) => void;
  onReject?: (id: string, type: string) => void;
  isLoading?: boolean;
}

const PendingActionsSection = ({
  pendingActions = [],
  onApprove = (id, type) => console.log(`Approved ${type} with id ${id}`),
  onReject = (id, type) => console.log(`Rejected ${type} with id ${id}`),
  isLoading = false,
}: PendingActionsSectionProps) => {
  // Helper function to get the appropriate icon based on action type
  const getActionIcon = (type: string) => {
    switch (type) {
      case "task":
        return <Clock size={18} color="#6366F1" />;
      case "wishlist":
        return <ShoppingBag size={18} color="#8B5CF6" />;
      case "redemption":
        return <Gift size={18} color="#EC4899" />;
      default:
        return <Clock size={18} color="#6366F1" />;
    }
  };

  // Helper function to get the action type label
  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case "task":
        return "Task Approval";
      case "wishlist":
        return "Wishlist Review";
      case "redemption":
        return "Redemption Request";
      default:
        return "Pending Action";
    }
  };

  return (
    <View className="mx-4 mb-4">
      <View
        className="bg-white p-4 rounded-2xl shadow-sm"
        style={{ backgroundColor: "#FFFFFF" }}
      >
      <Text className="text-lg font-bold mb-3">Pending Actions</Text>

      {isLoading ? (
        <View className="py-6 items-center justify-center">
          <Text className="text-gray-500">Loading pending tasks...</Text>
        </View>
      ) : pendingActions.length === 0 ? (
        <View className="py-6 items-center justify-center">
          <Text className="text-gray-500">No pending actions</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-1"
        >
          {pendingActions.map((action) => (
            <View
              key={action.id}
              className="bg-gray-50 rounded-lg p-3 mr-3 w-64 shadow-sm"
              style={{ backgroundColor: "#F9FAFB" }}
            >
              <View className="flex-row items-center mb-2">
                {getActionIcon(action.type)}
                <Text className="text-xs font-medium ml-1 text-gray-500">
                  {getActionTypeLabel(action.type)}
                </Text>
              </View>

              <Text className="text-base font-semibold mb-1">
                {action.title}
              </Text>

              <View className="flex-row items-center mb-2">
                <Text className="text-sm text-gray-600">
                  By {action.childName}
                </Text>
                <Text className="text-xs text-gray-400 ml-2">
                  • {action.timestamp}
                </Text>
              </View>

              {action.imageUrl && (
                <Image
                  source={{ uri: action.imageUrl }}
                  className="w-full h-24 rounded-md mb-2"
                  resizeMode="cover"
                />
              )}

              <View className="flex-row items-center justify-between mt-1">
                <View className="flex-row items-center">
                  <Text className="text-amber-500 font-bold">
                    {action.famcoins}
                  </Text>
                  <Text className="text-gray-600 ml-1">FAMCOINS</Text>
                </View>

                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => onReject(action.id, action.type)}
                    className="bg-gray-200 rounded-full p-2 mr-2"
                    style={{ backgroundColor: "#E5E7EB" }}
                  >
                    <X size={16} color="#4B5563" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => onApprove(action.id, action.type)}
                    className="bg-indigo-100 rounded-full p-2"
                    style={{ backgroundColor: "#E0E7FF" }}
                  >
                    <Check size={16} color="#4F46E5" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      </View>
    </View>
  );
};

export default PendingActionsSection;
