import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { createChildProfile } from "../../store/slices/childSlice";
import {
  ArrowLeft,
  User,
  Heart,
  BookOpen,
  Home,
  Gamepad2,
  Palette,
} from "lucide-react-native";
import * as Device from "expo-constants";

const AVATARS = [
  "👦",
  "👧",
  "🧒",
  "👶",
  "🦸‍♂️",
  "🦸‍♀️",
  "🧙‍♂️",
  "🧙‍♀️",
  "🐶",
  "🐱",
  "🦊",
  "🐻",
  "🦁",
  "🐸",
  "🐧",
  "🦄",
];

const FOCUS_AREAS = [
  {
    id: "health",
    name: "Health & Fitness",
    icon: Heart,
    color: "bg-red-100 text-red-600",
  },
  {
    id: "education",
    name: "Education",
    icon: BookOpen,
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "chores",
    name: "Household Chores",
    icon: Home,
    color: "bg-green-100 text-green-600",
  },
  {
    id: "creativity",
    name: "Arts & Creativity",
    icon: Palette,
    color: "bg-purple-100 text-purple-600",
  },
  {
    id: "social",
    name: "Social Skills",
    icon: User,
    color: "bg-yellow-100 text-yellow-600",
  },
  {
    id: "fun",
    name: "Fun & Games",
    icon: Gamepad2,
    color: "bg-pink-100 text-pink-600",
  },
];

export default function ChildProfileSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.child);

  const [name, setName] = useState((params.childName as string) || "");
  const [age, setAge] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);

  const handleFocusAreaToggle = (areaId: string) => {
    setSelectedFocusAreas((prev) =>
      prev.includes(areaId)
        ? prev.filter((id) => id !== areaId)
        : [...prev, areaId],
    );
  };

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    if (
      !age.trim() ||
      isNaN(Number(age)) ||
      Number(age) < 3 ||
      Number(age) > 18
    ) {
      Alert.alert("Error", "Please enter a valid age between 3 and 18");
      return;
    }

    if (selectedFocusAreas.length === 0) {
      Alert.alert("Error", "Please select at least one focus area");
      return;
    }

    try {
      const deviceId =
        Device.default.sessionId || Device.default.installationId || "unknown";

      await dispatch(
        createChildProfile({
          name: name.trim(),
          age: Number(age),
          avatar: selectedAvatar,
          focusAreas: selectedFocusAreas,
          parentId: params.parentId as string,
          deviceId,
        }),
      ).unwrap();

      router.push("/child/pin-creation");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create profile");
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-purple-50">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-4">
            <TouchableOpacity onPress={handleBack} className="mb-6">
              <ArrowLeft size={24} color="#7c3aed" />
            </TouchableOpacity>

            <View className="bg-white rounded-3xl p-8 shadow-lg">
              <Text className="text-3xl font-bold text-center mb-2 text-purple-800">
                Let's Set Up Your Profile!
              </Text>
              <Text className="text-center mb-8 text-gray-600">
                Tell us a bit about yourself
              </Text>

              {/* Name Input */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">
                  What's your name?
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-xl p-4 text-lg"
                  placeholder="Enter your name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              {/* Age Input */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">
                  How old are you?
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-xl p-4 text-lg"
                  placeholder="Enter your age"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>

              {/* Avatar Selection */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-3">
                  Choose your avatar:
                </Text>
                <View className="flex-row flex-wrap justify-between">
                  {AVATARS.map((avatar, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setSelectedAvatar(avatar)}
                      className={`w-12 h-12 rounded-xl items-center justify-center mb-3 ${
                        selectedAvatar === avatar
                          ? "bg-purple-200 border-2 border-purple-500"
                          : "bg-gray-100"
                      }`}
                    >
                      <Text className="text-2xl">{avatar}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Focus Areas */}
              <View className="mb-8">
                <Text className="text-gray-700 font-medium mb-3">
                  What would you like to focus on? (Select all that apply)
                </Text>
                <View className="space-y-3">
                  {FOCUS_AREAS.map((area) => {
                    const IconComponent = area.icon;
                    const isSelected = selectedFocusAreas.includes(area.id);

                    return (
                      <TouchableOpacity
                        key={area.id}
                        onPress={() => handleFocusAreaToggle(area.id)}
                        className={`flex-row items-center p-4 rounded-xl border-2 ${
                          isSelected
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <View className={`p-2 rounded-lg mr-3 ${area.color}`}>
                          <IconComponent size={20} />
                        </View>
                        <Text
                          className={`font-medium ${
                            isSelected ? "text-purple-700" : "text-gray-700"
                          }`}
                        >
                          {area.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {error && (
                <Text className="text-red-500 text-center mb-4">{error}</Text>
              )}

              <TouchableOpacity
                onPress={handleContinue}
                className="bg-purple-600 py-4 px-6 rounded-xl"
                disabled={isLoading}
              >
                <Text className="text-white font-bold text-lg text-center">
                  {isLoading ? "Creating Profile..." : "Continue"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
