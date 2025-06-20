import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { signOut } from "../../store/slices/authSlice";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
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
  const { user, devParentId } = useSelector((state: RootState) => state.auth);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [isCreatingTestData, setIsCreatingTestData] = useState(false);

  // Fetch children data from database
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        setIsLoadingChildren(true);
        const parentId = user?.id || devParentId;

        console.log("[DASHBOARD] Fetching children for parent ID:", parentId);
        console.log("[DASHBOARD] User object:", user);
        console.log("[DASHBOARD] Dev parent ID:", devParentId);

        if (!parentId) {
          console.warn("[DASHBOARD] No parent ID available");
          setChildren([]);
          return;
        }

        // First, let's check if there are any children in the database at all
        const { data: allChildren, error: allError } = await supabase
          .from("children")
          .select("*");

        console.log("[DASHBOARD] All children in database:", allChildren);
        console.log("[DASHBOARD] All children error:", allError);

        const { data, error } = await supabase
          .from("children")
          .select("*")
          .eq("parent_id", parentId)
          .order("created_at", { ascending: true });

        console.log("[DASHBOARD] Children query result:", { data, error });
        console.log("[DASHBOARD] Query used parent_id:", parentId);

        if (error) {
          console.error("[DASHBOARD] Error fetching children:", error);
          setChildren([]);
        } else {
          console.log("[DASHBOARD] Found children:", data?.length || 0);
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
          console.log("[DASHBOARD] Transformed children:", transformedChildren);
          setChildren(transformedChildren);
        }
      } catch (error) {
        console.error("[DASHBOARD] Error in fetchChildren:", error);
        setChildren([]);
      } finally {
        setIsLoadingChildren(false);
      }
    };

    fetchChildren();
  }, [user?.id, devParentId]);

  // Function to create test child data
  const createTestChild = async () => {
    try {
      setIsCreatingTestData(true);
      const parentId = user?.id || devParentId;

      if (!parentId) {
        Alert.alert("Error", "No parent ID available");
        return;
      }

      console.log("[DASHBOARD] Creating test child with parent ID:", parentId);

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
        console.error("[DASHBOARD] Error creating test child:", error);
        Alert.alert("Error", `Failed to create test child: ${error.message}`);
      } else {
        console.log("[DASHBOARD] Test child created:", data);
        Alert.alert("Success", "Test child created successfully!");
        // Refresh the children list
        const fetchChildren = async () => {
          const { data: refreshData, error: refreshError } = await supabase
            .from("children")
            .select("*")
            .eq("parent_id", parentId)
            .order("created_at", { ascending: true });

          if (!refreshError && refreshData) {
            const transformedChildren = refreshData.map((child: any) => ({
              id: child.id,
              name: child.name,
              age: child.age,
              avatar: child.avatar_url,
              famcoinBalance: child.famcoin_balance || 0,
              completionPercentage: 75,
              tasksCompleted: 0,
              tasksTotal: 0,
              lastActive: "Recently",
            }));
            setChildren(transformedChildren);
          }
        };
        await fetchChildren();
      }
    } catch (error) {
      console.error("[DASHBOARD] Error in createTestChild:", error);
      Alert.alert("Error", "Failed to create test child");
    } finally {
      setIsCreatingTestData(false);
    }
  };

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
          {isLoadingChildren ? (
            <View className="bg-white rounded-xl p-4 shadow-md mb-3">
              <Text className="text-gray-500 text-center">
                Loading children...
              </Text>
            </View>
          ) : children.length === 0 ? (
            <View className="bg-white rounded-xl p-4 shadow-md mb-3">
              <Text className="text-gray-500 text-center mb-2">
                No children profiles found. Use the QR code to connect a child
                device.
              </Text>
              <Text className="text-xs text-gray-400 text-center mb-3">
                Debug: Parent ID = {user?.id || devParentId || "undefined"}
              </Text>
              <TouchableOpacity
                onPress={createTestChild}
                disabled={isCreatingTestData}
                className="bg-blue-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white text-center font-medium">
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
