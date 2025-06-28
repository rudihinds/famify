import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Gift, Trophy, Star, Target, Plus } from "lucide-react-native";

export default function RewardsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-4 pt-2 pb-4 bg-indigo-600">
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-white">Rewards</Text>
          <TouchableOpacity className="p-2">
            <Plus size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Rewards Stats */}
        <View className="p-6 m-4 bg-white rounded-2xl shadow-sm">
          <Text className="mb-4 text-xl font-bold text-gray-800">
            Rewards Overview
          </Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Trophy size={24} color="#f59e0b" />
              <Text className="mt-1 text-2xl font-bold text-yellow-600">8</Text>
              <Text className="text-sm text-gray-500">Earned</Text>
            </View>
            <View className="items-center">
              <Target size={24} color="#4f46e5" />
              <Text className="mt-1 text-2xl font-bold text-indigo-600">3</Text>
              <Text className="text-sm text-gray-500">In Progress</Text>
            </View>
            <View className="items-center">
              <Star size={24} color="#10b981" />
              <Text className="mt-1 text-2xl font-bold text-green-600">250</Text>
              <Text className="text-sm text-gray-500">Total Famcoins</Text>
            </View>
          </View>
        </View>

        {/* Coming Soon Message */}
        <View className="p-6 m-4 bg-white rounded-2xl shadow-sm">
          <Text className="mb-4 text-2xl font-bold text-center text-gray-800">
            Reward System
          </Text>
          <Text className="mb-6 text-center text-gray-600">
            Set up rewards and wishlist items that your children can work towards. Track their progress and redeem earned Famcoins.
          </Text>
          <Text className="mb-6 text-lg font-semibold text-center text-indigo-600">
            Coming Soon!
          </Text>
          
          {/* Add Reward Button */}
          <TouchableOpacity className="flex-row items-center justify-center p-4 bg-indigo-600 rounded-xl">
            <Gift size={20} color="white" className="mr-2" />
            <Text className="font-bold text-white">Create New Reward</Text>
          </TouchableOpacity>
        </View>

        {/* Reward Categories Preview */}
        <View className="mx-4 mb-4">
          <Text className="mb-3 text-xl font-bold text-gray-800">
            Popular Rewards
          </Text>
          <View className="space-y-3">
            <View className="p-4 bg-white rounded-xl shadow-sm">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-semibold text-gray-800">🎮 Extra Screen Time</Text>
                  <Text className="text-sm text-gray-500">30 minutes gaming time</Text>
                </View>
                <Text className="font-bold text-indigo-600">50 FC</Text>
              </View>
            </View>
            <View className="p-4 bg-white rounded-xl shadow-sm">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-semibold text-gray-800">🍦 Ice Cream Treat</Text>
                  <Text className="text-sm text-gray-500">Choice of favorite flavor</Text>
                </View>
                <Text className="font-bold text-indigo-600">30 FC</Text>
              </View>
            </View>
            <View className="p-4 bg-white rounded-xl shadow-sm">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-semibold text-gray-800">🎬 Movie Night</Text>
                  <Text className="text-sm text-gray-500">Pick the family movie</Text>
                </View>
                <Text className="font-bold text-indigo-600">75 FC</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}