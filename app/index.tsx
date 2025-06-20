import React, { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../store";
import { setDeviceType } from "../store/slices/authSlice";
import { StatusBar } from "expo-status-bar";

export default function HomeScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Auto-navigate to parent dashboard for development
    dispatch(setDeviceType("parent"));
    router.replace("/parent/dashboard");
  }, [dispatch, router]);

  const handleParentSelection = () => {
    dispatch(setDeviceType("parent"));
    router.push("/parent/dashboard");
  };

  const handleChildSelection = () => {
    dispatch(setDeviceType("child"));
    router.push("/child/scanner");
  };

  // Show role selection as fallback
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
