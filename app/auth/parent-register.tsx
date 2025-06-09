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
import { signUpParent, clearError } from "../../store/slices/authSlice";
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";

export default function ParentRegisterScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    try {
      await dispatch(
        signUpParent({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      ).unwrap();
      Alert.alert(
        "Success",
        "Account created successfully! Please check your email to verify your account.",
        [{ text: "OK", onPress: () => router.replace("/parent/dashboard") }],
      );
    } catch (error: any) {
      Alert.alert(
        "Registration Failed",
        error.message || "Failed to create account",
      );
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
                Create Account
              </Text>
              <Text className="text-center mb-8 text-gray-600">
                Join Famify to manage your family
              </Text>

              <View className="flex-row mb-4">
                <View className="flex-1 mr-2">
                  <Text className="text-gray-700 font-medium mb-2">
                    First Name
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl p-4 text-lg"
                    placeholder="First name"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-gray-700 font-medium mb-2">
                    Last Name
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl p-4 text-lg"
                    placeholder="Last name"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

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

              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Password</Text>
                <View className="relative">
                  <TextInput
                    className="border border-gray-300 rounded-xl p-4 text-lg pr-12"
                    placeholder="Create a password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
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

              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">
                  Confirm Password
                </Text>
                <View className="relative">
                  <TextInput
                    className="border border-gray-300 rounded-xl p-4 text-lg pr-12"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-4"
                  >
                    {showConfirmPassword ? (
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
                onPress={handleRegister}
                className="bg-indigo-600 py-4 px-6 rounded-xl mb-4"
                disabled={isLoading}
              >
                <Text className="text-white font-bold text-lg text-center">
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/auth/parent-login")}
                className="py-2"
              >
                <Text className="text-indigo-600 text-center font-medium">
                  Already have an account? Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
