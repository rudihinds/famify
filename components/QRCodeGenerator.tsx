import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { Share, X, Copy, RefreshCw, CheckCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useDispatch, useSelector } from "react-redux";
import {
  generateConnectionToken,
  clearCurrentToken,
} from "../store/slices/connectionSlice";
import { setProfile } from "../store/slices/childSlice";
import { RootState, AppDispatch } from "../store";
import QRCode from "react-native-qrcode-svg";
import { supabase } from "../lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "expo-router";

interface QRCodeGeneratorProps {
  isVisible?: boolean;
  onClose?: () => void;
  onChildCreated?: (childData: any) => void;
}

const QRCodeGenerator = ({
  isVisible = true,
  onClose = () => {},
  onChildCreated = () => {},
}: QRCodeGeneratorProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { currentToken, isGenerating, error } = useSelector(
    (state: RootState) => state.connection,
  );
  const { user, devParentId } = useSelector((state: RootState) => state.auth);

  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [showChildInfoInput, setShowChildInfoInput] = useState(true);
  const [step, setStep] = useState<"info" | "qr" | "success">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [childData, setChildData] = useState<any>(null);

  const FOCUS_AREAS = [
    { id: "health", name: "Health & Fitness", emoji: "💪" },
    { id: "education", name: "Education", emoji: "📚" },
    { id: "chores", name: "Household Chores", emoji: "🏠" },
    { id: "creativity", name: "Arts & Creativity", emoji: "🎨" },
    { id: "social", name: "Social Skills", emoji: "👥" },
    { id: "fun", name: "Fun & Games", emoji: "🎮" },
  ];

  useEffect(() => {
    // Set up timer for QR code expiration
    if (isVisible && currentToken) {
      const expiryTime = new Date(currentToken.expiresAt).getTime();
      const now = Date.now();
      const initialTimeLeft = Math.max(
        0,
        Math.floor((expiryTime - now) / 1000),
      );
      setTimeLeft(initialTimeLeft);

      const timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isVisible, currentToken]);

  useEffect(() => {
    if (!isVisible) {
      setShowChildInfoInput(true);
      setStep("info");
      setChildName("");
      setChildAge("");
      setSelectedFocusAreas([]);
      setIsSubmitting(false);
      dispatch(clearCurrentToken());
    }
  }, [isVisible, dispatch]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleFocusAreaToggle = (areaId: string) => {
    setSelectedFocusAreas((prev) =>
      prev.includes(areaId)
        ? prev.filter((id) => id !== areaId)
        : [...prev, areaId],
    );
  };

  const handleGenerateQR = async () => {
    console.log("Button clicked!", { childName, childAge, selectedFocusAreas });

    if (!childName.trim()) {
      Alert.alert("Error", "Please enter your child's name");
      return;
    }

    if (
      !childAge.trim() ||
      isNaN(Number(childAge)) ||
      Number(childAge) < 2 ||
      Number(childAge) > 18
    ) {
      Alert.alert("Error", "Please enter a valid age between 2 and 18");
      return;
    }

    if (selectedFocusAreas.length === 0) {
      Alert.alert("Error", "Please select at least one focus area");
      return;
    }

    console.log("All validations passed, creating child profile");

    setIsSubmitting(true);

    try {
      console.log("Creating child in database with Supabase");

      // Use the dev parent ID for development, or user ID for production
      let parentId = devParentId || user?.id;

      // If no parent ID is available, use the default dev parent ID
      if (!parentId) {
        parentId = "293847a7-b140-4acc-8729-fa5a7acb8def";
        console.log(
          "No parent ID found, using default dev parent ID:",
          parentId,
        );
      }

      console.log("Using parent ID:", parentId);

      // First, ensure the parent profile exists
      console.log("Checking if parent profile exists...");
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", parentId)
        .single();

      if (profileCheckError && profileCheckError.code !== "PGRST116") {
        console.error("Error checking parent profile:", profileCheckError);
        throw new Error("Failed to check parent profile");
      }

      // If profile doesn't exist, create it
      if (!existingProfile) {
        console.log("Parent profile doesn't exist, creating it...");
        const { data: newProfile, error: profileCreateError } = await supabase
          .from("profiles")
          .insert({
            id: parentId,
            email: user?.email || "dev@example.com",
            first_name: user?.user_metadata?.first_name || "Dev",
            last_name: user?.user_metadata?.last_name || "User",
          })
          .select()
          .single();

        if (profileCreateError) {
          console.error("Error creating parent profile:", profileCreateError);
          throw new Error("Failed to create parent profile");
        }
        console.log("Parent profile created:", newProfile);
      } else {
        console.log("Parent profile already exists");
      }

      console.log("Child data to insert:", {
        name: childName.trim(),
        age: Number(childAge),
        focus_areas: selectedFocusAreas,
        parent_id: parentId,
      });

      // Create child in database
      const { data: childData, error } = await supabase
        .from("children")
        .insert({
          name: childName.trim(),
          age: Number(childAge),
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${childName.trim()}`,
          focus_areas: selectedFocusAreas,
          parent_id: parentId,
          famcoin_balance: 0,
          pin_hash: "temp_pin_hash", // Temporary value, will be updated when child sets PIN
        })
        .select()
        .single();

      if (error) {
        console.error("Database error:", error);
        throw new Error(error.message || "Failed to create child profile");
      }

      console.log("Child data created:", childData);

      // Store the created child data
      setChildData(childData);

      // Store the child profile in Redux store
      dispatch(setProfile(childData));
      console.log("Child profile stored in Redux store");

      // Notify parent component about child creation
      onChildCreated(childData);

      console.log("Moving to success step");
      // Move to success step
      setStep("success");
      console.log("Step set to success:", "success");

      // Trigger haptic feedback
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch (hapticError) {
        console.log("Haptic feedback not available:", hapticError);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      // Use console.error instead of Alert for web compatibility
      console.error(
        "An unexpected error occurred while creating the child:",
        error,
      );
      setStep("info"); // Reset to info step on error
    } finally {
      setIsSubmitting(false);
      console.log("Submission completed, isSubmitting set to false");
    }
  };

  const handleCopyCode = () => {
    if (currentToken) {
      // In a real app, this would copy the token to clipboard
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleShare = () => {
    if (currentToken) {
      // In a real app, this would open the share dialog
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleRefresh = () => {
    if (currentToken) {
      dispatch(
        generateConnectionToken({
          childName: currentToken.childName,
          parentId: user?.id || "",
        }),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleBack = () => {
    if (step === "qr") {
      setStep("info");
      dispatch(clearCurrentToken());
    } else if (step === "success") {
      setStep("info");
    } else {
      onClose();
    }
  };

  const handleFinish = () => {
    onClose();
  };

  if (step === "success") {
    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 h-[500px]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-green-600">
                Success!
              </Text>
              <TouchableOpacity onPress={onClose} className="p-2">
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="items-center justify-center flex-1">
              <View className="bg-green-100 p-6 rounded-full mb-6">
                <CheckCircle size={64} color="#16a34a" />
              </View>

              <Text className="text-xl font-bold text-gray-800 mb-2 text-center">
                {childName} Added Successfully!
              </Text>

              <Text className="text-gray-600 text-center mb-6 px-4">
                Your child's profile has been successfully created and saved to
                the database.
              </Text>

              <View className="bg-green-50 p-4 rounded-xl mb-6 w-full">
                <Text className="text-green-800 font-medium text-center mb-2">
                  ✅ Profile Saved to Database
                </Text>
                <Text className="text-green-700 text-center text-sm">
                  Child profile persisted to Supabase
                </Text>
              </View>
            </View>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  const parentIdToUse = user?.id || devParentId;
                  router.push(
                    `/child/profile-setup?childId=${encodeURIComponent(childData?.id || "")}&childName=${encodeURIComponent(childName)}&parentId=${parentIdToUse}&focusAreas=${encodeURIComponent(JSON.stringify(selectedFocusAreas))}`,
                  );
                }}
                className="flex-1 bg-blue-600 py-4 rounded-lg items-center mr-2"
              >
                <Text className="text-white font-bold text-lg">
                  Setup Profile
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleFinish}
                className="flex-1 bg-green-600 py-4 rounded-lg items-center ml-2"
              >
                <Text className="text-white font-bold text-lg">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (step === "info" || !currentToken) {
    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[90%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-blue-600">
                Add Child Info
              </Text>
              <TouchableOpacity onPress={onClose} className="p-2">
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-lg font-medium mb-4">
                Tell us about your child to get started
              </Text>

              {/* Child Name */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Child's Name
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-4 text-lg"
                  placeholder="Enter child's name"
                  value={childName}
                  onChangeText={setChildName}
                  autoCapitalize="words"
                />
              </View>

              {/* Child Age */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Age</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-4 text-lg"
                  placeholder="Enter age (2-18)"
                  value={childAge}
                  onChangeText={setChildAge}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>

              {/* Focus Areas */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-3">
                  Initial Focus Areas (Select all that apply)
                </Text>
                <View className="space-y-2">
                  {FOCUS_AREAS.map((area) => {
                    const isSelected = selectedFocusAreas.includes(area.id);
                    return (
                      <TouchableOpacity
                        key={area.id}
                        onPress={() => handleFocusAreaToggle(area.id)}
                        className={`flex-row items-center p-3 rounded-lg border ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <Text className="text-2xl mr-3">{area.emoji}</Text>
                        <Text
                          className={`font-medium ${
                            isSelected ? "text-blue-700" : "text-gray-700"
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
                onPress={() => {
                  console.log("TouchableOpacity pressed");
                  handleGenerateQR();
                }}
                className={`py-4 rounded-lg items-center mb-4 ${
                  !childName.trim() ||
                  !childAge.trim() ||
                  selectedFocusAreas.length === 0 ||
                  isSubmitting
                    ? "bg-gray-400"
                    : "bg-blue-600"
                }`}
                disabled={
                  !childName.trim() ||
                  !childAge.trim() ||
                  selectedFocusAreas.length === 0 ||
                  isSubmitting
                }
              >
                <Text
                  className={`font-bold text-lg ${
                    !childName.trim() ||
                    !childAge.trim() ||
                    selectedFocusAreas.length === 0 ||
                    isSubmitting
                      ? "text-gray-600"
                      : "text-white"
                  }`}
                >
                  {isSubmitting ? "Adding Child..." : "Add Child"}
                </Text>
              </TouchableOpacity>

              <Text className="text-gray-500 text-center text-sm">
                Child profile will be saved to database
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6 h-[550px]">
          <View className="flex-row justify-between items-center mb-4">
            <TouchableOpacity onPress={handleBack} className="p-2">
              <Text className="text-blue-600 font-medium">← Back</Text>
            </TouchableOpacity>
            <Text className="text-xl font-bold text-blue-600">
              {currentToken.childName}
            </Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View className="items-center justify-center bg-gray-100 p-6 rounded-xl mb-4">
            {timeLeft > 0 ? (
              <View className="bg-white p-4 rounded-xl">
                <QRCode
                  value={currentToken.token}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
              </View>
            ) : (
              <View className="w-[250px] h-[250px] bg-gray-200 items-center justify-center rounded-xl">
                <Text className="text-gray-500 text-lg font-medium mb-4">
                  QR Code Expired
                </Text>
                <TouchableOpacity
                  onPress={handleRefresh}
                  className="flex-row items-center bg-blue-500 px-4 py-2 rounded-lg"
                >
                  <RefreshCw size={18} color="white" />
                  <Text className="text-white ml-2 font-medium">
                    Generate New Code
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View className="flex-row justify-between items-center bg-gray-100 p-4 rounded-lg mb-4">
            <View>
              <Text className="text-sm text-gray-500">Connection Token</Text>
              <Text className="text-sm font-mono">
                {currentToken.token.substring(0, 8)}...
              </Text>
            </View>
            <View className="flex-row">
              <TouchableOpacity
                onPress={handleCopyCode}
                className="p-2 mr-2 bg-gray-200 rounded-full"
              >
                <Copy size={20} color="#4b5563" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShare}
                className="p-2 bg-gray-200 rounded-full"
              >
                <Share size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row items-center justify-center mb-4">
            <View
              className={`h-2 w-2 rounded-full mr-2 ${timeLeft > 0 ? "bg-green-500" : "bg-red-500"}`}
            />
            <Text className="text-sm text-gray-600">
              {timeLeft > 0
                ? `Expires in ${formatTime(timeLeft)}`
                : "Code expired. Generate a new one."}
            </Text>
          </View>

          <View className="bg-blue-50 p-4 rounded-xl mb-4">
            <Text className="text-blue-800 font-bold text-center mb-2">
              📱 Now hand your phone to your child
            </Text>
            <Text className="text-blue-700 text-center text-sm">
              They'll scan this QR code to complete their setup
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleRefresh}
            className="bg-blue-600 py-3 rounded-lg items-center"
            disabled={isGenerating}
          >
            <Text className="text-white font-bold text-lg">
              {isGenerating ? "Generating..." : "Generate New Code"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default QRCodeGenerator;
