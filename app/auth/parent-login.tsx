import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { signInParent, clearError } from "../../store/slices/authSlice";
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";

export default function ParentLoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      await dispatch(signInParent({ email: email.trim(), password })).unwrap();
      router.replace("/parent/dashboard");
    } catch (error: any) {
      Alert.alert("Login Failed", error.message || "Invalid credentials");
    }
  };

  const handleBack = () => {
    dispatch(clearError());
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-4">
            <TouchableOpacity onPress={handleBack} className="mb-6">
              <ArrowLeft size={24} color="#4f46e5" />
            </TouchableOpacity>

            <View className="bg-white rounded-3xl p-8 shadow-lg">
              <Text className="text-3xl font-bold text-center mb-2 text-indigo-800">
                Welcome Back
              </Text>
              <Text className="text-center mb-8 text-gray-600">
                Sign in to your parent account
              </Text>

              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Email</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl p-4 text-lg"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">Password</Text>
                <View className="relative">
                  <TextInput
                    className="border border-gray-300 rounded-xl p-4 text-lg pr-12"
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4"
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#6b7280" />
                    ) : (
                      <Eye size={20} color="#6b7280" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {error && (
                <Text className="text-red-500 text-center mb-4">{error}</Text>
              )}

              <TouchableOpacity
                onPress={handleLogin}
                className="bg-indigo-600 py-4 px-6 rounded-xl mb-4"
                disabled={isLoading}
              >
                <Text className="text-white font-bold text-lg text-center">
                  {isLoading ? "Signing In..." : "Sign In"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/auth/parent-register")}
                className="py-2"
              >
                <Text className="text-indigo-600 text-center font-medium">
                  Don't have an account? Sign up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
