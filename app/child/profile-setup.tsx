import React, { useState, useEffect } from "react";
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
import { createChildProfile, setProfile } from "../../store/slices/childSlice";
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
import { supabase } from "../../lib/supabase";

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
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>(() => {
    try {
      return params.focusAreas ? JSON.parse(params.focusAreas as string) : [];
    } catch {
      return [];
    }
  });
  const [showFocusAreaSelection, setShowFocusAreaSelection] = useState(() => {
    try {
      return params.focusAreas
        ? JSON.parse(params.focusAreas as string).length === 0
        : true;
    } catch {
      return true;
    }
  });
  const [childData, setChildData] = useState<any>(null);
  const [isLoadingChild, setIsLoadingChild] = useState(false);

  // Load child data from database if childId is provided
  useEffect(() => {
    const loadChildData = async () => {
      if (params.childId) {
        setIsLoadingChild(true);
        try {
          const { data, error } = await supabase
            .from("children")
            .select("*")
            .eq("id", params.childId)
            .single();

          if (error) {
            console.error("Error loading child data:", error);
            Alert.alert("Error", "Failed to load child data");
          } else if (data) {
            setChildData(data);
            setName(data.name);
            setAge(data.age.toString());
            if (data.focus_areas) {
              setSelectedFocusAreas(data.focus_areas);
            }
            // Set avatar from avatar_url if it's an emoji
            if (data.avatar_url && AVATARS.includes(data.avatar_url)) {
              setSelectedAvatar(data.avatar_url);
            }
          }
        } catch (error) {
          console.error("Unexpected error loading child:", error);
          Alert.alert("Error", "Failed to load child data");
        } finally {
          setIsLoadingChild(false);
        }
      }
    };

    loadChildData();
  }, [params.childId]);

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
      let result;

      if (params.childId && childData) {
        // Update existing child in database
        const { data, error } = await supabase
          .from("children")
          .update({
            name: name.trim(),
            age: Number(age),
            avatar_url: selectedAvatar,
            focus_areas: selectedFocusAreas,
            updated_at: new Date().toISOString(),
          })
          .eq("id", params.childId)
          .select()
          .single();

        if (error) {
          throw new Error(error.message || "Failed to update profile");
        }

        result = data;
      } else {
        // Create new child profile using Redux action (fallback)
        result = await dispatch(
          createChildProfile({
            name: name.trim(),
            age: Number(age),
            avatar: selectedAvatar,
            focusAreas: selectedFocusAreas,
            parentId: params.parentId as string,
          }),
        ).unwrap();
      }

      // Store the profile in Redux
      dispatch(setProfile(result));

      router.push("/child/pin-creation");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save profile");
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

            {isLoadingChild ? (
              <View className="bg-white rounded-3xl p-8 shadow-lg items-center justify-center">
                <Text className="text-lg text-gray-600">
                  Loading profile...
                </Text>
              </View>
            ) : (
              <View className="bg-white rounded-3xl p-8 shadow-lg">
                <Text className="text-3xl font-bold text-center mb-2 text-purple-800">
                  Make It Yours!
                </Text>
                <Text className="text-center mb-8 text-gray-600">
                  Choose your avatar and what YOU want to focus on
                </Text>

                {/* Name Display (read-only) */}
                <View className="mb-6">
                  <Text className="text-gray-700 font-medium mb-2">
                    Your Name
                  </Text>
                  <View className="border border-gray-300 rounded-xl p-4 bg-gray-50">
                    <Text className="text-lg text-gray-700">{name}</Text>
                  </View>
                </View>

                {/* Age Input (still editable) */}
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

                {/* Focus Areas Selection */}
                <View className="mb-8">
                  {!showFocusAreaSelection && selectedFocusAreas.length > 0 ? (
                    <>
                      <Text className="text-gray-700 font-medium mb-3">
                        Your selected focus areas:
                      </Text>
                      <View className="space-y-3">
                        {FOCUS_AREAS.filter((area) =>
                          selectedFocusAreas.includes(area.id),
                        ).map((area) => {
                          const IconComponent = area.icon;

                          return (
                            <View
                              key={area.id}
                              className="flex-row items-center p-4 rounded-xl border-2 border-purple-500 bg-purple-50"
                            >
                              <View
                                className={`p-2 rounded-lg mr-3 ${area.color}`}
                              >
                                <IconComponent size={20} />
                              </View>
                              <Text className="font-medium text-purple-700">
                                {area.name}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowFocusAreaSelection(true)}
                        className="mt-3 p-2"
                      >
                        <Text className="text-purple-600 text-center font-medium">
                          Want to change these? Tap here to reselect
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text className="text-gray-700 font-medium mb-3">
                        What do YOU want to work on? (Select all that apply)
                      </Text>
                      <View className="space-y-3">
                        {FOCUS_AREAS.map((area) => {
                          const IconComponent = area.icon;
                          const isSelected = selectedFocusAreas.includes(
                            area.id,
                          );

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
                              <View
                                className={`p-2 rounded-lg mr-3 ${area.color}`}
                              >
                                <IconComponent size={20} />
                              </View>
                              <Text
                                className={`font-medium ${
                                  isSelected
                                    ? "text-purple-700"
                                    : "text-gray-700"
                                }`}
                              >
                                {area.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {selectedFocusAreas.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setShowFocusAreaSelection(false)}
                          className="mt-3 p-2"
                        >
                          <Text className="text-purple-600 text-center font-medium">
                            Done selecting? Tap here to confirm
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
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
                    {isLoading ? "Saving Profile..." : "Continue"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
