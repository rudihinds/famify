import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Alert } from "../../lib/alert";
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
import DevModeMenu from "../../components/DevModeMenu";
import { isDevMode } from "../../config/development";

export default function ParentHome() {
  const { user } = useSelector((state: RootState) => state.auth);
  const devModeEnabled = isDevMode();
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [isCreatingTestData, setIsCreatingTestData] = useState(false);

  // Fetch children data from database - extracted to reusable function
  const fetchChildrenData = async () => {
    try {
      setIsLoadingChildren(true);
      const parentId = user?.id;

      console.log("[HOME] Fetching children for parent ID:", parentId);
      console.log("[HOME] User object:", user);

      if (!parentId) {
        console.warn("[HOME] No parent ID available");
        setChildren([]);
        return;
      }

      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", parentId)
        .order("created_at", { ascending: true });

      console.log("[HOME] Children query result:", { data, error });
      console.log("[HOME] Query used parent_id:", parentId);

      if (error) {
        console.error("[HOME] Error fetching children:", error);
        setChildren([]);
      } else {
        console.log("[HOME] Found children:", data?.length || 0);
        // Transform data to match expected format
        const transformedChildren = (data || []).map((child: any) => ({
          id: child.id,
          name: child.name,
          age: child.age,
          avatar: child.avatar_url,
          famcoinBalance: child.famcoin_balance || 0,
          completionPercentage: 75, // TODO: Calculate from actual tasks
          tasksCompleted: 0, // TODO: Calculate from actual tasks
          tasksTotal: 0, // TODO: Calculate from actual tasks
          lastActive: "Recently", // TODO: Calculate from actual activity
        }));
        console.log("[HOME] Transformed children:", transformedChildren);
        setChildren(transformedChildren);
      }
    } catch (error) {
      console.error("[HOME] Error in fetchChildren:", error);
      setChildren([]);
    } finally {
      setIsLoadingChildren(false);
    }
  };

  // Fetch children on mount and when user changes
  useEffect(() => {
    fetchChildrenData();
  }, [user?.id]);
  
  // Refresh children data when screen comes into focus
  // This ensures data is fresh when navigating back from other screens
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchChildrenData();
      }
    }, [user?.id])
  );

  // Function to create test child data
  const createTestChild = async () => {
    try {
      setIsCreatingTestData(true);
      const parentId = user?.id;

      if (!parentId) {
        Alert.alert("Error", "No parent ID available");
        return;
      }

      console.log("[HOME] Creating test child with parent ID:", parentId);

      const { data, error } = await supabase
        .from("children")
        .insert({
          name: "Test Child",
          age: 8,
          avatar_url:
            "https://api.dicebear.com/7.x/avataaars/svg?seed=testchild",
          parent_id: parentId,
          famcoin_balance: 25,
          focus_areas: ["chores", "education"],
          pin_hash: "test_hash_123",
        })
        .select()
        .single();

      if (error) {
        console.error("[HOME] Error creating test child:", error);
        Alert.alert("Error", `Failed to create test child: ${error.message}`);
      } else {
        console.log("[HOME] Test child created:", data);
        Alert.alert("Success", "Test child created successfully!");
        // Refresh the children list using the shared function
        await fetchChildrenData();
      }
    } catch (error) {
      console.error("[HOME] Error in createTestChild:", error);
      Alert.alert("Error", "Failed to create test child");
    } finally {
      setIsCreatingTestData(false);
    }
  };

  const pendingActions = [
    {
      id: "1",
      type: "task" as const,
      title: "Clean bedroom",
      childName: "Alex",
      timestamp: "5 minutes ago",
      famcoins: 10,
    },
    {
      id: "2",
      type: "wishlist" as const,
      title: "Extra screen time",
      childName: "Emma",
      timestamp: "1 hour ago",
      famcoins: 50,
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-4 pt-2 pb-4 bg-indigo-600">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-lg font-medium text-white">
              Good morning,
            </Text>
            <Text className="text-2xl font-bold text-white">
              {user?.user_metadata?.first_name || "Parent"}
            </Text>
          </View>
          <View className="flex-row items-center">
            {/* Dev Mode Button - handled by DevModeMenu component */}

            <TouchableOpacity
              onPress={() => setShowSettingsDropdown(!showSettingsDropdown)}
              className="flex-row items-center p-2"
            >
              <Settings size={24} color="white" />
              <ChevronDown size={16} color="white" className="ml-1" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <View className="p-6 m-4 bg-white rounded-2xl shadow-sm">
          <Text className="mb-4 text-xl font-bold text-gray-800">
            Family Overview
          </Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Users size={24} color="#4f46e5" />
              <Text className="mt-1 text-2xl font-bold text-indigo-600">
                {children.length}
              </Text>
              <Text className="text-sm text-gray-500">Children</Text>
            </View>
            <View className="items-center">
              <TrendingUp size={24} color="#10b981" />
              <Text className="mt-1 text-2xl font-bold text-green-600">
                {Math.round(
                  children.reduce(
                    (acc, child) => acc + child.completionPercentage,
                    0
                  ) / children.length
                )}
                %
              </Text>
              <Text className="text-sm text-gray-500">Avg Progress</Text>
            </View>
            <View className="items-center">
              <Clock size={24} color="#f59e0b" />
              <Text className="mt-1 text-2xl font-bold text-yellow-600">
                {pendingActions.length}
              </Text>
              <Text className="text-sm text-gray-500">Pending</Text>
            </View>
          </View>
        </View>

        {/* Children Progress Cards */}
        <View className="mx-4 mb-4">
          <Text className="mb-3 text-xl font-bold text-gray-800">
            Children Progress
          </Text>
          {isLoadingChildren ? (
            <View className="p-4 mb-3 bg-white rounded-xl shadow-md">
              <Text className="text-center text-gray-500">
                Loading children...
              </Text>
            </View>
          ) : children.length === 0 ? (
            <View className="p-4 mb-3 bg-white rounded-xl shadow-md">
              <Text className="mb-2 text-center text-gray-500">
                No children profiles found. Use the QR code to connect a child
                device.
              </Text>
              <Text className="mb-3 text-xs text-center text-gray-400">
                Debug: Parent ID = {user?.id || "undefined"}
              </Text>
              <TouchableOpacity
                onPress={createTestChild}
                disabled={isCreatingTestData}
                className="px-4 py-2 bg-blue-500 rounded-lg"
              >
                <Text className="font-medium text-center text-white">
                  {isCreatingTestData ? "Creating..." : "Create Test Child"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            children.map((child) => (
              <ChildProgressCard
                key={child.id}
                name={child.name}
                avatar={child.avatar}
                completionPercentage={child.completionPercentage}
                famcoinBalance={child.famcoinBalance}
                tasksCompleted={child.tasksCompleted}
                totalTasks={child.tasksTotal}
                onPress={() => console.log(`Viewing ${child.name}'s profile`)}
              />
            ))
          )}
        </View>

        {/* Pending Actions */}
        <PendingActionsSection pendingActions={pendingActions} />

        {/* Quick Actions */}
        <View className="p-6 m-4 bg-white rounded-2xl shadow-sm">
          <Text className="mb-4 text-xl font-bold text-gray-800">
            Quick Actions
          </Text>
          <View className="flex-row justify-between">
            <TouchableOpacity
              onPress={() => setShowQRGenerator(true)}
              className="flex-1 items-center p-4 mr-2 bg-indigo-100 rounded-xl"
            >
              <QrCode size={24} color="#4f46e5" />
              <Text className="mt-2 font-medium text-center text-indigo-600">
                Connect Child
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 items-center p-4 ml-2 bg-green-100 rounded-xl">
              <Plus size={24} color="#10b981" />
              <Text className="mt-2 font-medium text-center text-green-600">
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

      {/* Dev Mode Menu */}
      {devModeEnabled && <DevModeMenu onDataChanged={fetchChildrenData} />}
      
      {/* Settings Dropdown - Only show menu without full-screen backdrop */}
      {showSettingsDropdown && (
        <View 
          className="absolute top-20 right-4 bg-white rounded-lg shadow-2xl py-2 min-w-[150px]"
          onStartShouldSetResponder={() => true}
        >
          <TouchableOpacity
            onPress={() => {
              setShowSettingsDropdown(false);
              // Let LogoutButton handle the actual logout
            }}
          >
            <LogoutButton variant="text" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}