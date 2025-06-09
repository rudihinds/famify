import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { setDeviceType } from "../store/slices/authSlice";
import { StatusBar } from "expo-status-bar";

export default function HomeScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user, session, deviceType, isLoading } = useSelector(
    (state: RootState) => state.auth,
  );
  const { profile: childProfile, isAuthenticated: childAuthenticated } =
    useSelector((state: RootState) => state.child);

  useEffect(() => {
    // Route based on authentication state and device type
    if (!isLoading) {
      if (deviceType === "parent" && session) {
        router.replace("/parent/dashboard");
      } else if (deviceType === "child" && childProfile && childAuthenticated) {
        router.replace("/child");
      } else if (
        deviceType === "child" &&
        childProfile &&
        !childAuthenticated
      ) {
        router.replace("/child/pin-login");
      } else if (deviceType === "unlinked") {
        // Show role selection
        return;
      }
    }
  }, [
    isLoading,
    deviceType,
    session,
    childProfile,
    childAuthenticated,
    router,
  ]);

  const handleParentSelection = () => {
    dispatch(setDeviceType("parent"));
    router.push("/auth/welcome");
  };

  const handleChildSelection = () => {
    dispatch(setDeviceType("child"));
    router.push("/child/scanner");
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-indigo-50 justify-center items-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="mt-4 text-indigo-600 font-medium">Loading...</Text>
      </SafeAreaView>
    );
  }

  // Show role selection for unlinked devices
  return (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <StatusBar style="dark" />
      <View className="flex-1 justify-center items-center px-6">
        <View className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-lg">
          <Text className="text-3xl font-bold text-center mb-2 text-indigo-800">
            Welcome to Famify
          </Text>
          <Text className="text-center mb-8 text-gray-600">
            Choose your role to get started
          </Text>

          <TouchableOpacity
            onPress={handleParentSelection}
            className="bg-indigo-600 py-4 px-6 rounded-xl mb-4"
          >
            <Text className="text-white font-bold text-lg text-center">
              I'm a Parent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleChildSelection}
            className="bg-purple-600 py-4 px-6 rounded-xl"
          >
            <Text className="text-white font-bold text-lg text-center">
              I'm a Child
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
