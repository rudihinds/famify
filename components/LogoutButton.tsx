import React from "react";
import { TouchableOpacity, Text, Alert } from "react-native";
import { useDispatch } from "react-redux";
import { useRouter } from "expo-router";
import { AppDispatch } from "../store";
import { signOut } from "../store/slices/authSlice";
import { LogOut } from "lucide-react-native";

interface LogoutButtonProps {
  variant?: "text" | "icon" | "button";
  size?: "sm" | "md" | "lg";
  color?: string;
}

export default function LogoutButton({
  variant = "button",
  size = "md",
  color = "#ef4444",
}: LogoutButtonProps = {}) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await dispatch(signOut()).unwrap();
            router.replace("/");
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to sign out");
          }
        },
      },
    ]);
  };

  const iconSize = size === "sm" ? 16 : size === "md" ? 20 : 24;

  if (variant === "icon") {
    return (
      <TouchableOpacity onPress={handleLogout} className="p-2">
        <LogOut size={iconSize} color={color} />
      </TouchableOpacity>
    );
  }

  if (variant === "text") {
    return (
      <TouchableOpacity onPress={handleLogout} className="py-2">
        <Text className="text-red-500 font-medium">Sign Out</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handleLogout}
      className="bg-red-500 py-3 px-6 rounded-xl flex-row items-center justify-center"
    >
      <LogOut size={16} color="white" />
      <Text className="text-white font-medium ml-2">Sign Out</Text>
    </TouchableOpacity>
  );
}
