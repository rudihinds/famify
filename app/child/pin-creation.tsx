import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, Vibration } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { createPin } from "../../store/slices/childSlice";
import { ArrowLeft, Lock } from "lucide-react-native";

const KEYPAD_NUMBERS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

export default function PinCreationScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { profile, isLoading, error } = useSelector(
    (state: RootState) => state.child,
  );

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"create" | "confirm">("create");

  const handleNumberPress = (number: string) => {
    if (number === "⌫") {
      if (step === "create") {
        setPin((prev) => prev.slice(0, -1));
      } else {
        setConfirmPin((prev) => prev.slice(0, -1));
      }
      return;
    }

    if (number === "") return;

    if (step === "create") {
      if (pin.length < 4) {
        const newPin = pin + number;
        setPin(newPin);

        if (newPin.length === 4) {
          // Validate PIN format
          if (!validatePinFormat(newPin)) {
            Vibration.vibrate(500);
            Alert.alert(
              "Invalid PIN",
              "PIN cannot be sequential (like 1234) or all the same digit (like 1111). Please choose a different PIN.",
              [{ text: "OK", onPress: () => setPin("") }],
            );
            return;
          }

          setTimeout(() => setStep("confirm"), 500);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const newConfirmPin = confirmPin + number;
        setConfirmPin(newConfirmPin);

        if (newConfirmPin.length === 4) {
          if (pin === newConfirmPin) {
            handleCreatePin(pin);
          } else {
            Vibration.vibrate(500);
            Alert.alert(
              "PINs Don't Match",
              "The PINs you entered don't match. Please try again.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    setPin("");
                    setConfirmPin("");
                    setStep("create");
                  },
                },
              ],
            );
          }
        }
      }
    }
  };

  const validatePinFormat = (pinToValidate: string): boolean => {
    if (pinToValidate.length !== 4 || !/^\d{4}$/.test(pinToValidate))
      return false;

    // Check for sequential numbers
    const sequential = [
      "1234",
      "2345",
      "3456",
      "4567",
      "5678",
      "6789",
      "7890",
      "0123",
    ];
    const reverseSequential = sequential.map((s) =>
      s.split("").reverse().join(""),
    );

    if (
      sequential.includes(pinToValidate) ||
      reverseSequential.includes(pinToValidate)
    )
      return false;

    // Check for all same digits
    if (pinToValidate === pinToValidate[0].repeat(4)) return false;

    return true;
  };

  const handleCreatePin = async (finalPin: string) => {
    if (!profile?.id) {
      Alert.alert("Error", "Profile not found. Please try again.");
      return;
    }

    try {
      await dispatch(
        createPin({ pin: finalPin, childId: profile.id }),
      ).unwrap();

      Alert.alert(
        "PIN Created!",
        "Your PIN has been created successfully. You can now use it to log in.",
        [{ text: "OK", onPress: () => router.replace("/child") }],
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create PIN");
      setPin("");
      setConfirmPin("");
      setStep("create");
    }
  };

  const handleBack = () => {
    if (step === "confirm") {
      setStep("create");
      setConfirmPin("");
    } else {
      router.back();
    }
  };

  const currentPin = step === "create" ? pin : confirmPin;
  const dots = Array.from({ length: 4 }, (_, i) => (
    <View
      key={i}
      className={`w-4 h-4 rounded-full mx-2 ${
        i < currentPin.length ? "bg-purple-600" : "bg-gray-300"
      }`}
    />
  ));

  return (
    <SafeAreaView className="flex-1 bg-purple-50">
      <StatusBar style="dark" />
      <View className="flex-1 px-6 pt-4">
        <TouchableOpacity onPress={handleBack} className="mb-6">
          <ArrowLeft size={24} color="#7c3aed" />
        </TouchableOpacity>

        <View className="flex-1 justify-center">
          <View className="bg-white rounded-3xl p-8 shadow-lg">
            <View className="items-center mb-8">
              <View className="bg-purple-100 p-4 rounded-full mb-4">
                <Lock size={32} color="#7c3aed" />
              </View>
              <Text className="text-2xl font-bold text-center mb-2 text-purple-800">
                {step === "create" ? "Create Your PIN" : "Confirm Your PIN"}
              </Text>
              <Text className="text-center text-gray-600">
                {step === "create"
                  ? "Choose a 4-digit PIN to secure your account"
                  : "Enter your PIN again to confirm"}
              </Text>
            </View>

            {/* PIN Dots */}
            <View className="flex-row justify-center mb-8">{dots}</View>

            {/* Keypad */}
            <View className="space-y-4">
              {KEYPAD_NUMBERS.map((row, rowIndex) => (
                <View
                  key={rowIndex}
                  className="flex-row justify-center space-x-4"
                >
                  {row.map((number, colIndex) => (
                    <TouchableOpacity
                      key={colIndex}
                      onPress={() => handleNumberPress(number)}
                      className={`w-16 h-16 rounded-full items-center justify-center ${
                        number === ""
                          ? ""
                          : number === "⌫"
                            ? "bg-gray-200"
                            : "bg-purple-100"
                      }`}
                      disabled={number === "" || isLoading}
                    >
                      <Text
                        className={`text-xl font-bold ${
                          number === "⌫" ? "text-gray-600" : "text-purple-700"
                        }`}
                      >
                        {number}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            {error && (
              <Text className="text-red-500 text-center mt-4">{error}</Text>
            )}

            <View className="mt-6 p-4 bg-yellow-50 rounded-xl">
              <Text className="text-sm text-yellow-800 text-center">
                💡 Your PIN cannot be sequential (like 1234) or all the same
                digit (like 1111)
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
