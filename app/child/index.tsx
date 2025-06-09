import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Camera,
  CheckCircle2,
  Gift,
  Home,
  List,
  Settings,
  Star,
} from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

export default function ChildDashboard() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Mock data
  const childName = "Alex";
  const famcoinBalance = 250;
  const completionPercentage = 65;
  const dailyTasks = [
    {
      id: 1,
      name: "Make bed",
      points: 10,
      completed: true,
      group: "Morning Routine",
    },
    {
      id: 2,
      name: "Brush teeth",
      points: 5,
      completed: true,
      group: "Morning Routine",
    },
    {
      id: 3,
      name: "Pack school bag",
      points: 15,
      completed: false,
      group: "Morning Routine",
    },
    {
      id: 4,
      name: "Feed the dog",
      points: 20,
      completed: false,
      group: "After School",
    },
    {
      id: 5,
      name: "Homework",
      points: 30,
      completed: false,
      group: "After School",
      requiresPhoto: true,
    },
  ];

  // PIN authentication
  const handlePinSubmit = () => {
    if (pin.length === 4) {
      // In a real app, this would validate against stored PIN
      setIsAuthenticated(true);
    }
  };

  const renderPinScreen = () => (
    <View className="flex-1 justify-center items-center bg-indigo-50 px-6">
      <View className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-md">
        <Image
          source="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
          className="w-24 h-24 rounded-full self-center mb-6"
        />
        <Text className="text-2xl font-bold text-center mb-6 text-indigo-800">
          Welcome back, {childName}!
        </Text>
        <Text className="text-center mb-4 text-gray-600">
          Enter your 4-digit PIN to continue
        </Text>

        <View className="flex-row justify-center space-x-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              className={`w-5 h-5 rounded-full ${pin.length > i ? "bg-indigo-600" : "bg-gray-300"}`}
            />
          ))}
        </View>

        <View className="flex-row flex-wrap justify-center">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
            <TouchableOpacity
              key={num}
              className="w-20 h-20 justify-center items-center m-1"
              onPress={() => {
                if (pin.length < 4) {
                  setPin((prev) => prev + num);
                  if (pin.length === 3) {
                    // Auto-submit when 4 digits entered
                    setTimeout(handlePinSubmit, 300);
                  }
                }
              }}
            >
              <Text className="text-3xl font-semibold text-indigo-800">
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          className="mt-4 self-center"
          onPress={() => setPin((prev) => prev.slice(0, -1))}
        >
          <Text className="text-indigo-600 font-medium">Delete</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className="mt-8 p-4"
        onPress={() => setShowScanner(true)}
      >
        <Text className="text-indigo-600 font-medium text-center">
          Connect to parent account
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderQRScanner = () => (
    <View className="flex-1 justify-center items-center bg-indigo-50 px-6">
      <View className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-md">
        <Text className="text-2xl font-bold text-center mb-6 text-indigo-800">
          Scan QR Code
        </Text>
        <Text className="text-center mb-6 text-gray-600">
          Ask your parent to show you their QR code to connect your account
        </Text>

        {/* Placeholder for camera view */}
        <View className="w-full aspect-square bg-gray-200 rounded-xl mb-6 items-center justify-center">
          <Camera size={48} color="#4f46e5" />
          <Text className="mt-2 text-gray-500">Camera permission required</Text>
        </View>

        <TouchableOpacity
          className="bg-indigo-600 py-3 px-6 rounded-full"
          onPress={() => setShowScanner(false)}
        >
          <Text className="text-white font-medium text-center">Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDashboard = () => (
    <SafeAreaView className="flex-1 bg-indigo-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-4 pt-2 pb-4 bg-indigo-600">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <Image
              source="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
              className="w-10 h-10 rounded-full bg-white"
            />
            <Text className="text-xl font-bold text-white ml-2">
              Hi, {childName}!
            </Text>
          </View>
          <Text className="text-white font-bold">
            {famcoinBalance} FAMCOINS
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Progress Section */}
        <View className="m-4 bg-white rounded-2xl p-6 shadow-sm">
          <Text className="text-lg font-semibold text-gray-800 mb-2">
            {completionPercentage < 30
              ? "Let's get started!"
              : completionPercentage < 70
                ? "Nearly there!"
                : completionPercentage < 100
                  ? "Oh so close!"
                  : "All done! Great job!"}
          </Text>

          {/* Progress Ring */}
          <View className="items-center justify-center my-4">
            <View className="w-40 h-40 rounded-full border-8 border-indigo-100 items-center justify-center">
              <View
                className="absolute top-0 left-0 right-0 bottom-0 rounded-full border-8 border-indigo-600"
                style={{
                  borderTopColor: "transparent",
                  borderRightColor: "transparent",
                  borderBottomColor:
                    completionPercentage >= 50 ? "#4f46e5" : "transparent",
                  transform: [{ rotate: `${completionPercentage * 3.6}deg` }],
                }}
              />
              <Text className="text-3xl font-bold text-indigo-800">
                {completionPercentage}%
              </Text>
              <Text className="text-sm text-gray-500">Complete</Text>
            </View>
          </View>

          {/* FAMCOIN Balance */}
          <View className="bg-indigo-100 rounded-xl p-4 flex-row justify-between items-center">
            <View>
              <Text className="text-sm text-indigo-800">
                Your FAMCOIN Balance
              </Text>
              <Text className="text-2xl font-bold text-indigo-800">
                {famcoinBalance}
              </Text>
            </View>
            <Star size={32} color="#4f46e5" fill="#c7d2fe" />
          </View>
        </View>

        {/* Today's Tasks */}
        <View className="m-4 bg-white rounded-2xl p-6 shadow-sm">
          <Text className="text-xl font-bold text-gray-800 mb-4">
            Today's Tasks
          </Text>

          {dailyTasks.map((task, index) => (
            <View
              key={task.id}
              className={`flex-row items-center justify-between py-3 ${index < dailyTasks.length - 1 ? "border-b border-gray-100" : ""}`}
            >
              <View className="flex-1">
                <Text className="text-sm text-gray-500">{task.group}</Text>
                <Text className="text-base font-medium">{task.name}</Text>
              </View>

              <View className="flex-row items-center">
                {task.requiresPhoto && (
                  <Camera size={16} color="#6b7280" className="mr-2" />
                )}
                <Text className="text-indigo-600 font-medium mr-3">
                  {task.points}
                </Text>
                <TouchableOpacity>
                  <View
                    className={`w-6 h-6 rounded-full border ${task.completed ? "bg-green-500 border-green-500" : "border-gray-300"} items-center justify-center`}
                  >
                    {task.completed && <CheckCircle2 size={16} color="white" />}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View className="flex-row justify-around items-center py-3 bg-white border-t border-gray-200">
        <TouchableOpacity className="items-center">
          <Home size={24} color="#4f46e5" />
          <Text className="text-xs text-indigo-600 mt-1">Home</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <List size={24} color="#6b7280" />
          <Text className="text-xs text-gray-500 mt-1">Tasks</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Gift size={24} color="#6b7280" />
          <Text className="text-xs text-gray-500 mt-1">Rewards</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Star size={24} color="#6b7280" />
          <Text className="text-xs text-gray-500 mt-1">Budget</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Settings size={24} color="#6b7280" />
          <Text className="text-xs text-gray-500 mt-1">Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (showScanner) {
    return renderQRScanner();
  }

  if (!isAuthenticated) {
    return renderPinScreen();
  }

  return renderDashboard();
}
