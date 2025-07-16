import React, { useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { fetchTodayTasks } from "../../store/slices/taskSlice";
import { Coins, CheckCircle2, Calendar, Trophy } from "lucide-react-native";
import { useRouter } from "expo-router";
import DevModeMenu from "../../components/DevModeMenu";
import { isDevMode } from "../../config/development";

export default function ChildHomeScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { profile, currentBalance = 0 } = useSelector((state: RootState) => state.child);
  const { todayTasks = [] } = useSelector((state: RootState) => state.tasks);

  // Fetch today's tasks when the screen loads
  useEffect(() => {
    if (profile?.id) {
      dispatch(fetchTodayTasks({ childId: profile.id }));
    }
  }, [profile?.id, dispatch]);

  const pendingTasksCount = todayTasks.filter(task => task.status === 'pending').length;
  const completedTasksCount = todayTasks.filter(task => task.status === 'child_completed' || task.status === 'parent_approved').length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {isDevMode() && <DevModeMenu />}
      
      <ScrollView className="flex-1 px-4">
        {/* Header */}
        <View className="mt-6 mb-8">
          <Text className="text-3xl font-bold text-gray-900">
            Hi, {profile?.name}! 👋
          </Text>
          <Text className="text-lg text-gray-600 mt-1">
            Let's see what's on today
          </Text>
        </View>

        {/* FAMCOIN Balance Card */}
        <TouchableOpacity
          onPress={() => router.push("/(child)/rewards")}
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 mb-6 shadow-lg"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white text-sm opacity-90">Your Balance</Text>
              <Text className="text-white text-4xl font-bold mt-1">
                {currentBalance} FC
              </Text>
            </View>
            <View className="bg-white/20 rounded-full p-4">
              <Coins size={32} color="white" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Stats */}
        <View className="flex-row gap-4 mb-6">
          <TouchableOpacity
            onPress={() => router.push("/(child)/tasks")}
            className="flex-1 bg-white rounded-xl p-4 shadow-sm"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Calendar size={20} color="#10b981" />
              <Text className="text-2xl font-bold text-gray-900">
                {pendingTasksCount}
              </Text>
            </View>
            <Text className="text-sm text-gray-600">Tasks Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(child)/tasks")}
            className="flex-1 bg-white rounded-xl p-4 shadow-sm"
          >
            <View className="flex-row items-center justify-between mb-2">
              <CheckCircle2 size={20} color="#10b981" />
              <Text className="text-2xl font-bold text-gray-900">
                {completedTasksCount}
              </Text>
            </View>
            <Text className="text-sm text-gray-600">Completed</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </Text>
          
          <TouchableOpacity
            onPress={() => router.push("/(child)/tasks")}
            className="bg-green-50 rounded-lg p-4 mb-3"
          >
            <View className="flex-row items-center">
              <View className="bg-green-100 rounded-full p-2 mr-3">
                <CheckCircle2 size={20} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900">View Today's Tasks</Text>
                <Text className="text-sm text-gray-600">
                  {pendingTasksCount > 0 ? `${pendingTasksCount} tasks waiting` : 'All done for today!'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(child)/rewards")}
            className="bg-purple-50 rounded-lg p-4"
          >
            <View className="flex-row items-center">
              <View className="bg-purple-100 rounded-full p-2 mr-3">
                <Trophy size={20} color="#9333ea" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900">Check Rewards</Text>
                <Text className="text-sm text-gray-600">See what you can earn</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}