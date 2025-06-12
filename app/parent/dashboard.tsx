import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { signOut } from "../../store/slices/authSlice";
import { useRouter } from "expo-router";
import {
  Plus,
  QrCode,
  Settings,
  Users,
  TrendingUp,
  Clock,
  ChevronDown,
} from "lucide-react-native";
import QRCodeGenerator from "../../components/QRCodeGenerator";
import ChildProgressCard from "../../components/ChildProgressCard";
import PendingActionsSection from "../../components/PendingActionsSection";
import LogoutButton from "../../components/LogoutButton";

export default function ParentDashboard() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  // Mock data - in real app this would come from API
  const children = [
    {
      id: "1",
      name: "Alex",
      age: 8,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      famcoinBalance: 250,
      completionPercentage: 65,
      tasksCompleted: 4,
      tasksTotal: 7,
      lastActive: "2 hours ago",
    },
    {
      id: "2",
      name: "Emma",
      age: 12,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
      famcoinBalance: 180,
      completionPercentage: 80,
      tasksCompleted: 6,
      tasksTotal: 8,
      lastActive: "30 minutes ago",
    },
  ];

  const pendingActions = [
    {
      id: "1",
      type: "task_approval",
      childName: "Alex",
      taskName: "Clean bedroom",
      timestamp: "5 minutes ago",
      requiresPhoto: true,
    },
    {
      id: "2",
      type: "reward_request",
      childName: "Emma",
      rewardName: "Extra screen time",
      cost: 50,
      timestamp: "1 hour ago",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-4 pt-2 pb-4 bg-indigo-600">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-white text-lg font-medium">
              Good morning,
            </Text>
            <Text className="text-white text-2xl font-bold">
              {user?.user_metadata?.first_name || "Parent"}
            </Text>
          </View>
          <View className="relative">
            <TouchableOpacity
              onPress={() => setShowSettingsDropdown(!showSettingsDropdown)}
              className="p-2 flex-row items-center"
            >
              <Settings size={24} color="white" />
              <ChevronDown size={16} color="white" className="ml-1" />
            </TouchableOpacity>

            {showSettingsDropdown && (
              <View className="absolute top-12 right-0 bg-white rounded-lg shadow-lg py-2 min-w-[150px] z-10">
                <View className="px-4 py-2">
                  <LogoutButton variant="text" />
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Quick Stats */}
        <View className="m-4 bg-white rounded-2xl p-6 shadow-sm">
          <Text className="text-xl font-bold text-gray-800 mb-4">
            Family Overview
          </Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Users size={24} color="#4f46e5" />
              <Text className="text-2xl font-bold text-indigo-600 mt-1">
                {children.length}
              </Text>
              <Text className="text-sm text-gray-500">Children</Text>
            </View>
            <View className="items-center">
              <TrendingUp size={24} color="#10b981" />
              <Text className="text-2xl font-bold text-green-600 mt-1">
                {Math.round(
                  children.reduce(
                    (acc, child) => acc + child.completionPercentage,
                    0,
                  ) / children.length,
                )}
                %
              </Text>
              <Text className="text-sm text-gray-500">Avg Progress</Text>
            </View>
            <View className="items-center">
              <Clock size={24} color="#f59e0b" />
              <Text className="text-2xl font-bold text-yellow-600 mt-1">
                {pendingActions.length}
              </Text>
              <Text className="text-sm text-gray-500">Pending</Text>
            </View>
          </View>
        </View>

        {/* Children Progress Cards */}
        <View className="mx-4 mb-4">
          <Text className="text-xl font-bold text-gray-800 mb-3">
            Children Progress
          </Text>
          {children.map((child) => (
            <ChildProgressCard key={child.id} child={child} />
          ))}
        </View>

        {/* Pending Actions */}
        <PendingActionsSection actions={pendingActions} />

        {/* Quick Actions */}
        <View className="m-4 bg-white rounded-2xl p-6 shadow-sm">
          <Text className="text-xl font-bold text-gray-800 mb-4">
            Quick Actions
          </Text>
          <View className="flex-row justify-between">
            <TouchableOpacity
              onPress={() => setShowQRGenerator(true)}
              className="bg-indigo-100 p-4 rounded-xl flex-1 mr-2 items-center"
            >
              <QrCode size={24} color="#4f46e5" />
              <Text className="text-indigo-600 font-medium mt-2 text-center">
                Connect Child
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-green-100 p-4 rounded-xl flex-1 ml-2 items-center">
              <Plus size={24} color="#10b981" />
              <Text className="text-green-600 font-medium mt-2 text-center">
                Add Task
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* QR Code Generator Modal */}
      <QRCodeGenerator
        isVisible={showQRGenerator}
        onClose={() => setShowQRGenerator(false)}
      />
    </SafeAreaView>
  );
}
