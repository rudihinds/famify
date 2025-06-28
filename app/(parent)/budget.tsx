import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { DollarSign, TrendingUp, PieChart, Calendar, Settings } from "lucide-react-native";

export default function BudgetScreen() {
  return (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-4 pt-2 pb-4 bg-indigo-600">
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-white">Budget</Text>
          <TouchableOpacity className="p-2">
            <Settings size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Budget Overview */}
        <View className="p-6 m-4 bg-white rounded-2xl shadow-sm">
          <Text className="mb-4 text-xl font-bold text-gray-800">
            Budget Overview
          </Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <DollarSign size={24} color="#10b981" />
              <Text className="mt-1 text-2xl font-bold text-green-600">$50</Text>
              <Text className="text-sm text-gray-500">Monthly</Text>
            </View>
            <View className="items-center">
              <TrendingUp size={24} color="#4f46e5" />
              <Text className="mt-1 text-2xl font-bold text-indigo-600">$35</Text>
              <Text className="text-sm text-gray-500">Allocated</Text>
            </View>
            <View className="items-center">
              <PieChart size={24} color="#f59e0b" />
              <Text className="mt-1 text-2xl font-bold text-yellow-600">70%</Text>
              <Text className="text-sm text-gray-500">Used</Text>
            </View>
          </View>
        </View>

        {/* Coming Soon Message */}
        <View className="p-6 m-4 bg-white rounded-2xl shadow-sm">
          <Text className="mb-4 text-2xl font-bold text-center text-gray-800">
            Budget Management
          </Text>
          <Text className="mb-6 text-center text-gray-600">
            Set and manage your family's Famcoin budget. Track spending, allocate funds to children, and monitor reward redemptions.
          </Text>
          <Text className="mb-6 text-lg font-semibold text-center text-indigo-600">
            Coming Soon!
          </Text>
          
          {/* Configure Budget Button */}
          <TouchableOpacity className="flex-row items-center justify-center p-4 bg-indigo-600 rounded-xl">
            <Calendar size={20} color="white" className="mr-2" />
            <Text className="font-bold text-white">Configure Budget</Text>
          </TouchableOpacity>
        </View>

        {/* Budget Features Preview */}
        <View className="mx-4 mb-4">
          <Text className="mb-3 text-xl font-bold text-gray-800">
            Budget Features
          </Text>
          <View className="space-y-3">
            <View className="p-4 bg-white rounded-xl shadow-sm">
              <Text className="font-semibold text-gray-800">💰 Famcoin Conversion</Text>
              <Text className="text-sm text-gray-500">Set your currency to Famcoin rate</Text>
            </View>
            <View className="p-4 bg-white rounded-xl shadow-sm">
              <Text className="font-semibold text-gray-800">📊 Spending Analytics</Text>
              <Text className="text-sm text-gray-500">Track reward redemptions by child</Text>
            </View>
            <View className="p-4 bg-white rounded-xl shadow-sm">
              <Text className="font-semibold text-gray-800">🎯 Budget Goals</Text>
              <Text className="text-sm text-gray-500">Set monthly spending limits</Text>
            </View>
          </View>
        </View>

        {/* Famcoin Info */}
        <View className="p-4 m-4 bg-indigo-100 rounded-xl">
          <Text className="mb-2 text-lg font-bold text-indigo-800">
            About Famcoins
          </Text>
          <Text className="text-sm text-indigo-700">
            Famcoins are your family's virtual currency. Children earn them by completing tasks and can redeem them for rewards you set up.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}