import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import { logout } from "../../store/slices/childSlice";
import { useRouter } from "expo-router";
import { User } from "lucide-react-native";

export default function ChildProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { profile } = useSelector((state: RootState) => state.child);

  const handleLogout = () => {
    dispatch(logout());
    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-6">My Profile</Text>
        
        <View className="bg-white rounded-xl p-6 shadow-sm mb-4">
          <View className="items-center mb-6">
            <View className="bg-green-100 rounded-full p-6 mb-4">
              <User size={48} color="#10b981" />
            </View>
            <Text className="text-xl font-semibold text-gray-900">{profile?.name}</Text>
            <Text className="text-gray-600">Age {profile?.age}</Text>
          </View>

          <View className="border-t border-gray-100 pt-4">
            <Text className="text-sm text-gray-600 mb-2">Focus Areas</Text>
            <View className="flex-row flex-wrap gap-2">
              {profile?.focus_areas.map((area, index) => (
                <View key={index} className="bg-green-50 rounded-full px-3 py-1">
                  <Text className="text-green-700 text-sm">{area}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-500 rounded-lg p-4 mt-auto"
        >
          <Text className="text-white text-center font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}