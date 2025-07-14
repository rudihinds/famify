import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../../store";
import { fetchDailyTasks, setSelectedDate } from "../../../store/slices/taskSlice";
import { useRouter } from "expo-router";
import { Calendar, ChevronLeft, ChevronRight, Coins } from "lucide-react-native";
import { format, addDays, subDays, isToday } from "date-fns";

export default function ChildTasksScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { profile, currentBalance } = useSelector((state: RootState) => state.child);
  const { dailyTasks, selectedDate, isLoading, isRefreshing, error } = useSelector(
    (state: RootState) => state.tasks
  );

  const [refreshing, setRefreshing] = useState(false);

  // Load tasks when screen mounts or date changes
  useEffect(() => {
    if (profile?.id) {
      dispatch(fetchDailyTasks({ childId: profile.id, date: selectedDate }));
    }
  }, [profile?.id, selectedDate, dispatch]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    if (profile?.id) {
      setRefreshing(true);
      await dispatch(fetchDailyTasks({ childId: profile.id, date: selectedDate }));
      setRefreshing(false);
    }
  }, [profile?.id, selectedDate, dispatch]);

  // Date navigation
  const navigateDate = (direction: "prev" | "next") => {
    const currentDate = new Date(selectedDate);
    const newDate = direction === "prev" 
      ? subDays(currentDate, 1) 
      : addDays(currentDate, 1);
    dispatch(setSelectedDate(format(newDate, "yyyy-MM-dd")));
  };

  const goToToday = () => {
    dispatch(setSelectedDate(format(new Date(), "yyyy-MM-dd")));
  };

  // Group tasks by status
  const pendingTasks = dailyTasks.filter(task => task.status === "pending");
  const rejectedTasks = dailyTasks.filter(task => task.status === "parent_rejected");
  const completedTasks = dailyTasks.filter(
    task => task.status === "child_completed" || task.status === "parent_approved"
  );

  const renderTaskSection = (title: string, tasks: typeof dailyTasks, isEmpty: string) => {
    if (tasks.length === 0) return null;

    return (
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-900 mb-3">{title}</Text>
        {tasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            onPress={() => router.push(`/(child)/tasks/${task.id}`)}
            className="bg-white rounded-xl p-4 mb-3 shadow-sm"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <View
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: task.categoryColor }}
                  />
                  <Text className="text-xs text-gray-600">{task.groupName}</Text>
                </View>
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  {task.taskName}
                </Text>
                {task.customDescription && (
                  <Text className="text-sm text-gray-600 mb-2">
                    {task.customDescription}
                  </Text>
                )}
                <View className="flex-row items-center gap-3">
                  <View className="flex-row items-center">
                    <Coins size={14} color="#10b981" />
                    <Text className="text-sm font-semibold text-green-600 ml-1">
                      {task.famcoinValue} FC
                    </Text>
                  </View>
                  {task.photoProofRequired && (
                    <Text className="text-xs text-gray-500">📷 Photo required</Text>
                  )}
                </View>
              </View>
              <View className="ml-3">
                {task.status === "pending" && (
                  <View className="bg-gray-100 rounded-full px-3 py-1">
                    <Text className="text-xs font-medium text-gray-700">To Do</Text>
                  </View>
                )}
                {task.status === "parent_rejected" && (
                  <View className="bg-red-100 rounded-full px-3 py-1">
                    <Text className="text-xs font-medium text-red-700">Try Again</Text>
                  </View>
                )}
                {task.status === "child_completed" && (
                  <View className="bg-yellow-100 rounded-full px-3 py-1">
                    <Text className="text-xs font-medium text-yellow-700">Waiting</Text>
                  </View>
                )}
                {task.status === "parent_approved" && (
                  <View className="bg-green-100 rounded-full px-3 py-1">
                    <Text className="text-xs font-medium text-green-700">Done!</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-gray-600 mt-2">Loading tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header with balance */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900">My Tasks</Text>
          <View className="flex-row items-center bg-green-50 rounded-full px-3 py-1">
            <Coins size={16} color="#10b981" />
            <Text className="text-sm font-semibold text-green-700 ml-1">
              {currentBalance} FC
            </Text>
          </View>
        </View>
      </View>

      {/* Date Navigation */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigateDate("prev")}
            className="p-2"
          >
            <ChevronLeft size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goToToday}
            className="flex-row items-center"
          >
            <Calendar size={16} color="#6b7280" />
            <Text className="text-base font-medium text-gray-900 ml-2">
              {isToday(new Date(selectedDate))
                ? "Today"
                : format(new Date(selectedDate), "EEEE, MMM d")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigateDate("next")}
            className="p-2"
          >
            <ChevronRight size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
      >
        {error && (
          <View className="bg-red-50 rounded-lg p-4 mb-4">
            <Text className="text-red-800">{error}</Text>
          </View>
        )}

        {dailyTasks.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-2xl mb-2">🎉</Text>
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              No tasks for this day!
            </Text>
            <Text className="text-gray-600 text-center">
              Enjoy your free time or check another day
            </Text>
          </View>
        ) : (
          <>
            {/* Rejected tasks first - need attention */}
            {renderTaskSection(
              "Need Another Try",
              rejectedTasks,
              "No tasks need revision"
            )}

            {/* Pending tasks */}
            {renderTaskSection(
              "To Do",
              pendingTasks,
              "All tasks completed!"
            )}

            {/* Completed tasks */}
            {renderTaskSection(
              "Completed",
              completedTasks,
              "No completed tasks yet"
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}