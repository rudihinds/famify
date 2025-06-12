import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, Vibration } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import {
  validatePinLogin,
  incrementPinAttempts,
  resetPinAttempts,
  clearError,
} from "../../store/slices/childSlice";
import { Lock, AlertTriangle } from "lucide-react-native";

const KEYPAD_NUMBERS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

export default function PinLoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { profile, isLoading, error, pinAttempts, isLocked, lockUntil } =
    useSelector((state: RootState) => state.child);

  const [pin, setPin] = useState("");
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isLocked && lockUntil) {
      interval = setInterval(() => {
        const remaining = Math.max(0, lockUntil - Date.now());
        setLockTimeRemaining(remaining);

        if (remaining === 0) {
          dispatch(resetPinAttempts());
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLocked, lockUntil, dispatch]);

  const handleNumberPress = (number: string) => {
    if (isLocked && lockTimeRemaining > 0) {
      Vibration.vibrate(200);
      return;
    }

    if (number === "⌫") {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (number === "" || pin.length >= 4) return;

    const newPin = pin + number;
    setPin(newPin);

    if (newPin.length === 4) {
      handlePinSubmit(newPin);
    }
  };

  const handlePinSubmit = async (submittedPin: string) => {
    try {
      await dispatch(validatePinLogin({ pin: submittedPin })).unwrap();
      dispatch(resetPinAttempts());
      router.replace("/child");
    } catch (error: any) {
      Vibration.vibrate(500);
      dispatch(incrementPinAttempts());
      setPin("");

      const remainingAttempts = 3 - (pinAttempts + 1);

      if (remainingAttempts > 0) {
        Alert.alert(
          "Incorrect PIN",
          `Wrong PIN. You have ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`,
        );
      } else {
        Alert.alert(
          "Account Locked",
          "Too many incorrect attempts. Your account is locked for 5 minutes.",
        );
      }
    }
  };

  const formatLockTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const dots = Array.from({ length: 4 }, (_, i) => (
    <View
      key={i}
      className={`w-4 h-4 rounded-full mx-2 ${
        i < pin.length ? "bg-purple-600" : "bg-gray-300"
      }`}
    />
  ));

  const isAccountLocked = isLocked && lockTimeRemaining > 0;

  return (
    <SafeAreaView className="flex-1 bg-purple-50">
      <StatusBar style="dark" />
      <View className="flex-1 justify-center px-6">
        <View className="bg-white rounded-3xl p-8 shadow-lg">
          <View className="items-center mb-8">
            <View
              className={`p-4 rounded-full mb-4 ${
                isAccountLocked ? "bg-red-100" : "bg-purple-100"
              }`}
            >
              {isAccountLocked ? (
                <AlertTriangle size={32} color="#dc2626" />
              ) : (
                <Lock size={32} color="#7c3aed" />
              )}
            </View>

            <Text className="text-2xl font-bold text-center mb-2 text-purple-800">
              {profile?.name
                ? `Welcome back, ${profile.name}!`
                : "Welcome back!"}
            </Text>

            {isAccountLocked ? (
              <View className="items-center">
                <Text className="text-center text-red-600 font-medium mb-2">
                  Account Locked
                </Text>
                <Text className="text-center text-gray-600">
                  Try again in {formatLockTime(lockTimeRemaining)}
                </Text>
              </View>
            ) : (
              <Text className="text-center text-gray-600">
                Enter your 4-digit PIN to continue
              </Text>
            )}
          </View>

          {/* PIN Dots */}
          <View className="flex-row justify-center mb-8">{dots}</View>

          {/* Attempts Warning */}
          {pinAttempts > 0 && !isAccountLocked && (
            <View className="bg-yellow-50 p-3 rounded-xl mb-6">
              <Text className="text-yellow-800 text-center font-medium">
                ⚠️ {3 - pinAttempts} attempt{3 - pinAttempts === 1 ? "" : "s"}{" "}
                remaining
              </Text>
            </View>
          )}

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
                          : isAccountLocked
                            ? "bg-gray-100"
                            : "bg-purple-100"
                    }`}
                    disabled={number === "" || isLoading || isAccountLocked}
                  >
                    <Text
                      className={`text-xl font-bold ${
                        number === "⌫"
                          ? "text-gray-600"
                          : isAccountLocked
                            ? "text-gray-400"
                            : "text-purple-700"
                      }`}
                    >
                      {number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {error && !isAccountLocked && (
            <Text className="text-red-500 text-center mt-4">{error}</Text>
          )}

          <TouchableOpacity
            onPress={() => {
              dispatch(clearError());
              router.replace("/");
            }}
            className="mt-6 py-2"
          >
            <Text className="text-purple-600 text-center font-medium">
              Switch Account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
