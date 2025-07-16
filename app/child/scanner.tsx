import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import {
  validateConnectionToken,
  clearError,
} from "../../store/slices/connectionSlice";
// import { BarCodeScanner } from "expo-barcode-scanner";
// TODO: Uncomment when running on device with camera
import { ArrowLeft, Camera, Heart, Code } from "lucide-react-native";
import { isDevMode, DEV_CONFIG, getTestChildren } from "../../config/development";
import * as Haptics from "expo-haptics";

export default function QRScannerScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isScanning, error } = useSelector(
    (state: RootState) => state.connection,
  );

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [connectionData, setConnectionData] = useState<any>(null);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      // TODO: Uncomment when running on device with camera
      // const { status } = await BarCodeScanner.requestPermissionsAsync();
      // setHasPermission(status === "granted");
      setHasPermission(false); // Temporary: disable scanner
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      // Parse QR code data
      const qrData = JSON.parse(data);
      
      // Validate the connection
      const result = await dispatch(validateConnectionToken({
        token: qrData.token,
        childName: qrData.childName,
      })).unwrap();
      
      setConnectionData(result);
      setShowWelcome(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("QR scan error:", error);
      Alert.alert("Error", "Invalid QR code. Please try again.");
      setScanned(false);
    }
  };

  const handleMockConnection = () => {
    const testChildren = getTestChildren();
    const mockConnectionData = {
      token: "mock-token-123",
      child_name: testChildren[0].name,
      parent_id: testChildren[0].parent_id,
      parent_name: "Dev Parent",
    };

    setConnectionData(mockConnectionData);
    setShowWelcome(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleContinueToSetup = () => {
    if (connectionData) {
      router.push({
        pathname: "/child/profile-setup",
        params: {
          token: connectionData.token,
          childName: connectionData.child_name,
          parentId: connectionData.parent_id,
        },
      });
    }
  };

  const handleBack = () => {
    if (showWelcome) {
      setShowWelcome(false);
      setScanned(false);
      setConnectionData(null);
    } else {
      dispatch(clearError());
      // Navigate to home screen instead of using back
      router.replace("/");
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView className="flex-1 bg-purple-50 justify-center items-center">
        <StatusBar style="dark" />
        <Text className="text-purple-600 font-medium">
          Requesting camera permission...
        </Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView className="flex-1 bg-purple-50">
        <StatusBar style="dark" />
        <View className="flex-1 px-6 pt-4">
          <TouchableOpacity onPress={handleBack} className="mb-6">
            <ArrowLeft size={24} color="#7c3aed" />
          </TouchableOpacity>

          <View className="flex-1 justify-center items-center">
            <View className="bg-white rounded-3xl p-8 shadow-lg">
              <Camera size={64} color="#7c3aed" className="self-center mb-4" />
              <Text className="text-2xl font-bold text-center mb-4 text-purple-800">
                Camera Permission Required
              </Text>
              <Text className="text-center mb-6 text-gray-600">
                We need camera access to scan QR codes from your parent
              </Text>
              <TouchableOpacity
                onPress={() => {
                  // TODO: Uncomment when running on device
                  // BarCodeScanner.requestPermissionsAsync()
                  Alert.alert('Scanner Disabled', 'Scanner requires a physical device with camera');
                }}
                className="bg-purple-600 py-4 px-6 rounded-xl"
              >
                <Text className="text-white font-bold text-lg text-center">
                  Grant Permission
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (showWelcome && connectionData) {
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
                <View className="bg-green-100 p-6 rounded-full mb-4">
                  <Heart size={48} color="#10b981" fill="#10b981" />
                </View>
                <Text className="text-3xl font-bold text-center mb-4 text-purple-800">
                  Welcome {connectionData.child_name}!
                </Text>
                <Text className="text-xl text-center mb-2 text-gray-700">
                  Successfully connected to
                </Text>
                <Text className="text-2xl font-bold text-center text-green-600">
                  {connectionData.parent_name || "Your Parent"}'s Account
                </Text>
              </View>

              <View className="bg-green-50 p-4 rounded-xl mb-6">
                <Text className="text-green-800 text-center font-medium">
                  🎉 Connection successful! Let's finish setting up your
                  profile.
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleContinueToSetup}
                className="bg-purple-600 py-4 px-6 rounded-xl"
              >
                <Text className="text-white font-bold text-lg text-center">
                  Continue Setup
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />

      <View className="absolute top-12 left-6 z-10">
        <TouchableOpacity
          onPress={handleBack}
          className="bg-black/50 p-3 rounded-full"
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* TODO: Uncomment when running on device with camera
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      /> */}
      <View style={StyleSheet.absoluteFillObject} className="bg-gray-900" />

      <View className="absolute bottom-0 left-0 right-0 bg-black/80 p-6">
        <Text className="text-white text-xl font-bold text-center mb-2">
          Scan QR Code
        </Text>
        <Text className="text-white/80 text-center mb-4">
          Point your camera at the QR code shown by your parent
        </Text>

        {scanned && !showWelcome && (
          <TouchableOpacity
            onPress={() => setScanned(false)}
            className="bg-purple-600 py-3 px-6 rounded-xl mb-3"
          >
            <Text className="text-white font-bold text-center">Scan Again</Text>
          </TouchableOpacity>
        )}
        
        {/* Dev Mode Mock Connection */}
        {isDevMode() && !scanned && (
          <TouchableOpacity
            onPress={handleMockConnection}
            className="bg-indigo-600 py-3 px-6 rounded-xl flex-row items-center justify-center"
          >
            <Code size={20} color="white" className="mr-2" />
            <Text className="text-white font-bold text-center">
              Dev: Mock Connection
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Scanning overlay */}
      <View className="absolute inset-0 justify-center items-center pointer-events-none">
        <View className="w-64 h-64 border-2 border-white rounded-2xl" />
      </View>
    </SafeAreaView>
  );
}
