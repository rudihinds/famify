import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChildRewardsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Rewards</Text>
        <Text className="text-gray-600 text-center">
          Your rewards and wishlist will appear here
        </Text>
      </View>
    </SafeAreaView>
  );
}