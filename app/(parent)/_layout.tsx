import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import {
  Home,
  CheckSquare,
  Gift,
  DollarSign,
  ClipboardCheck,
} from "lucide-react-native";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { fetchPendingReviewCount } from "../../store/slices/parentSlice";

export default function ParentLayout() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { pendingReviewCount } = useSelector((state: RootState) => state.parent);

  // Fetch pending count on mount and poll
  useEffect(() => {
    if (!user?.id) return;

    // Initial fetch
    dispatch(fetchPendingReviewCount(user.id));
    
    // Poll every 30 seconds for sync
    const interval = setInterval(() => {
      dispatch(fetchPendingReviewCount(user.id));
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user?.id, dispatch]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarActiveTintColor: "#4f46e5",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, size }) => (
            <CheckSquare size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: "Reviews",
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <ClipboardCheck size={size} color={color} />
              {pendingReviewCount > 0 && (
                <View
                  className={`absolute -top-1 -right-1 ${
                    focused ? "bg-indigo-600" : "bg-red-500"
                  } rounded-full min-w-[18px] h-[18px] items-center justify-center`}
                >
                  <Text className="text-white text-xs font-bold">
                    {pendingReviewCount > 99 ? "99+" : pendingReviewCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: "Rewards",
          tabBarIcon: ({ color, size }) => (
            <Gift size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: "Budget",
          tabBarIcon: ({ color, size }) => (
            <DollarSign size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}