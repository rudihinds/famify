import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../../store";
import { fetchDailyTasks, setSelectedDate } from "../../../store/slices/taskSlice";
import { useRouter } from "expo-router";
import { Coins } from "lucide-react-native";
import { format, addDays, subDays } from "date-fns";
import TaskCard from "../../../components/TaskCard";
import DateNavigator from "../../../components/DateNavigator";

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
    console.log('[ChildTasksScreen] Profile:', profile);
    console.log('[ChildTasksScreen] Selected date:', selectedDate);
    
    if (profile?.id) {
      console.log('[ChildTasksScreen] Fetching tasks for child:', profile.id);
      dispatch(fetchDailyTasks({ childId: profile.id, date: selectedDate }));
    } else {
      console.log('[ChildTasksScreen] No profile ID available');
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
          <TaskCard
            key={task.id}
            task={task}
            onPress={() => router.push(`/(child)/tasks/${task.id}`)}
          />
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
      <DateNavigator
        selectedDate={selectedDate}
        onDateChange={navigateDate}
        onGoToToday={goToToday}
      />

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