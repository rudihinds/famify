import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import {
  signInWithGoogle,
  signInWithFacebook,
} from "../../store/slices/authSlice";
import { Image } from "expo-image";

export default function WelcomeScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.auth);

  const handleEmailLogin = () => {
    router.push("/auth/parent-login");
  };

  const handleEmailRegister = () => {
    router.push("/auth/parent-register");
  };

  const handleGoogleAuth = async () => {
    try {
      await dispatch(signInWithGoogle()).unwrap();
      router.replace("/parent/dashboard");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Google sign-in failed");
    }
  };

  const handleFacebookAuth = async () => {
    try {
      await dispatch(signInWithFacebook()).unwrap();
      router.replace("/parent/dashboard");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Facebook sign-in failed");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <StatusBar style="dark" />
      <View className="flex-1 justify-center items-center px-6">
        <View className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-lg">
          <Image
            source="https://api.dicebear.com/7.x/avataaars/svg?seed=Parent"
            className="w-20 h-20 rounded-full self-center mb-6"
          />
          <Text className="text-3xl font-bold text-center mb-2 text-indigo-800">
            Parent Login
          </Text>
          <Text className="text-center mb-8 text-gray-600">
            Manage your family's tasks and rewards
          </Text>

          <TouchableOpacity
            onPress={handleEmailLogin}
            className="bg-indigo-600 py-4 px-6 rounded-xl mb-3"
            disabled={isLoading}
          >
            <Text className="text-white font-bold text-lg text-center">
              Sign In with Email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleEmailRegister}
            className="bg-indigo-100 py-4 px-6 rounded-xl mb-4"
            disabled={isLoading}
          >
            <Text className="text-indigo-600 font-bold text-lg text-center">
              Create Account
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center mb-4">
            <View className="flex-1 h-px bg-gray-300" />
            <Text className="mx-4 text-gray-500">or</Text>
            <View className="flex-1 h-px bg-gray-300" />
          </View>

          <TouchableOpacity
            onPress={handleGoogleAuth}
            className="bg-white border border-gray-300 py-4 px-6 rounded-xl mb-3 flex-row items-center justify-center"
            disabled={isLoading}
          >
            <Text className="text-gray-700 font-medium text-lg">
              Continue with Google
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleFacebookAuth}
            className="bg-blue-600 py-4 px-6 rounded-xl flex-row items-center justify-center"
            disabled={isLoading}
          >
            <Text className="text-white font-medium text-lg">
              Continue with Facebook
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
