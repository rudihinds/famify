import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Plus, Calendar, CheckCircle, Clock, Filter } from "lucide-react-native";
import { useRouter, useIsFocused } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { childService } from "../../services/childService";
import { resetWizard } from "../../store/slices/sequenceCreationSlice";
import { fetchActiveSequences, refreshSequences, selectActiveSequences, selectIsLoadingSequences, selectIsRefreshingSequences } from "../../store/slices/sequencesSlice";

export default function TasksScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [hasChildren, setHasChildren] = useState(false);
  const [isCheckingChildren, setIsCheckingChildren] = useState(true);
  
  const isFocused = useIsFocused();
  const activeSequences = useSelector(selectActiveSequences);
  const isLoadingSequences = useSelector(selectIsLoadingSequences);
  const isRefreshing = useSelector(selectIsRefreshingSequences);
  
  useEffect(() => {
    checkForChildren();
  }, [user?.id]);
  
  // Fetch sequences when tab gains focus or user changes
  useEffect(() => {
    if (isFocused && user?.id) {
      dispatch(fetchActiveSequences(user.id));
    }
  }, [isFocused, user?.id, dispatch]);
  
  const checkForChildren = async () => {
    if (!user?.id) {
      setIsCheckingChildren(false);
      return;
    }
    
    try {
      const hasKids = await childService.hasChildren(user.id);
      setHasChildren(hasKids);
    } catch (error) {
      console.error('Error checking for children:', error);
    } finally {
      setIsCheckingChildren(false);
    }
  };
  
  const handleCreateSequence = () => {
    dispatch(resetWizard()); // Clear any previous state
    router.push('/sequence-creation/select-child');
  };
  
  const handleRefresh = () => {
    if (user?.id) {
      dispatch(refreshSequences(user.id));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-4 pt-2 pb-4 bg-indigo-600">
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-white">Tasks</Text>
          <TouchableOpacity className="p-2">
            <Filter size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#4f46e5"
          />
        }
      >
        {/* Quick Stats */}
        <View className="p-6 m-4 bg-white rounded-2xl shadow-sm">
          <Text className="mb-4 text-xl font-bold text-gray-800">
            Task Overview
          </Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <CheckCircle size={24} color="#10b981" />
              <Text className="mt-1 text-2xl font-bold text-green-600">12</Text>
              <Text className="text-sm text-gray-500">Completed</Text>
            </View>
            <View className="items-center">
              <Clock size={24} color="#f59e0b" />
              <Text className="mt-1 text-2xl font-bold text-yellow-600">5</Text>
              <Text className="text-sm text-gray-500">Pending</Text>
            </View>
            <View className="items-center">
              <Calendar size={24} color="#4f46e5" />
              <Text className="mt-1 text-2xl font-bold text-indigo-600">3</Text>
              <Text className="text-sm text-gray-500">Scheduled</Text>
            </View>
          </View>
        </View>

        {/* Create Sequence Button Section */}
        {isCheckingChildren && (
          <View className="px-4 mb-4">
            <View className="h-14 bg-gray-200 rounded-xl animate-pulse" />
          </View>
        )}
        
        {!isCheckingChildren && hasChildren && (
          <View className="px-4 mb-4">
            <TouchableOpacity
              onPress={handleCreateSequence}
              className="flex-row items-center justify-center py-4 px-6 bg-indigo-600 rounded-xl"
              accessibilityLabel="Create new sequence"
              accessibilityHint="Opens sequence creation wizard"
            >
              <Plus size={20} color="white" className="mr-2" />
              <Text className="font-bold text-white text-lg">Create Sequence</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {!isCheckingChildren && !hasChildren && (
          <View className="px-4 mb-4">
            <View className="bg-yellow-50 rounded-xl p-4">
              <Text className="text-yellow-700 text-center">
                Connect a child device first to start creating sequences
              </Text>
            </View>
          </View>
        )}
        
        {/* Active Sequences */}
        {activeSequences.length > 0 && (
          <View className="px-4 mb-4">
            <Text className="text-xl font-bold text-gray-800 mb-3">Active Sequences</Text>
            {isLoadingSequences ? (
              <View className="bg-white rounded-xl p-6">
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : (
              activeSequences.map((sequence) => (
                <View key={sequence.id} className="bg-white rounded-xl p-4 shadow-sm mb-3">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-gray-900">
                        {sequence.childName}'s Sequence
                      </Text>
                      <Text className="text-sm text-gray-600 mt-1">
                        {sequence.period === '1week' ? 'Weekly' :
                         sequence.period === '2weeks' ? 'Fortnightly' :
                         sequence.period === '1month' ? 'Monthly' : 'Ongoing'}
                        {' • '}
                        {sequence.todaysTasks.length} tasks today
                      </Text>
                    </View>
                    <View className="bg-indigo-100 px-3 py-1 rounded-full">
                      <Text className="text-indigo-700 font-medium">
                        {sequence.completedTasks}/{sequence.totalTasks}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Today's Tasks Summary */}
                  {sequence.todaysTasks.length > 0 && (
                    <View className="mt-3 pt-3 border-t border-gray-100">
                      <Text className="text-sm font-medium text-gray-700 mb-2">Today's Tasks:</Text>
                      {sequence.todaysTasks.slice(0, 3).map((task) => (
                        <View key={task.id} className="flex-row items-center mb-1">
                          <View className={`w-4 h-4 rounded-full mr-2 ${
                            task.completedAt ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                          <Text className={`text-sm flex-1 ${
                            task.completedAt ? 'text-gray-500 line-through' : 'text-gray-700'
                          }`}>
                            {task.taskName}
                          </Text>
                          <Text className="text-xs text-indigo-600">
                            {task.famcoinsEarned} FC
                          </Text>
                        </View>
                      ))}
                      {sequence.todaysTasks.length > 3 && (
                        <Text className="text-sm text-gray-500 mt-1">
                          +{sequence.todaysTasks.length - 3} more tasks
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Coming Soon Message */}
        <View className="p-6 m-4 bg-white rounded-2xl shadow-sm">
          <Text className="mb-4 text-2xl font-bold text-center text-gray-800">
            Task Management
          </Text>
          <Text className="mb-6 text-center text-gray-600">
            Create, schedule, and manage tasks for your children. Track their progress and approve completed tasks.
          </Text>
          <Text className="mb-6 text-lg font-semibold text-center text-indigo-600">
            Coming Soon!
          </Text>
          
          {/* Add Task Button */}
          <TouchableOpacity className="flex-row items-center justify-center p-4 bg-indigo-600 rounded-xl">
            <Plus size={20} color="white" className="mr-2" />
            <Text className="font-bold text-white">Create New Task</Text>
          </TouchableOpacity>
        </View>

        {/* Task Categories Preview */}
        <View className="mx-4 mb-4">
          <Text className="mb-3 text-xl font-bold text-gray-800">
            Task Categories
          </Text>
          <View className="space-y-3">
            <View className="p-4 bg-white rounded-xl shadow-sm">
              <Text className="font-semibold text-gray-800">🏠 Household Chores</Text>
              <Text className="text-sm text-gray-500">Clean room, dishes, laundry</Text>
            </View>
            <View className="p-4 bg-white rounded-xl shadow-sm">
              <Text className="font-semibold text-gray-800">📚 Education</Text>
              <Text className="text-sm text-gray-500">Homework, reading, practice</Text>
            </View>
            <View className="p-4 bg-white rounded-xl shadow-sm">
              <Text className="font-semibold text-gray-800">🎯 Personal Goals</Text>
              <Text className="text-sm text-gray-500">Exercise, hobbies, skills</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}