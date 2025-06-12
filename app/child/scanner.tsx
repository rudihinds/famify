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
import { BarCodeScanner } from "expo-barcode-scanner";
import { ArrowLeft, Camera } from "lucide-react-native";

export default function QRScannerScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isScanning, error } = useSelector(
    (state: RootState) => state.connection,
  );

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const tokenData = await dispatch(
        validateConnectionToken({ token: data }),
      ).unwrap();

      // Navigate to profile setup with token data
      router.push({
        pathname: "/child/profile-setup",
        params: {
          token: data,
          childName: tokenData.child_name,
          parentId: tokenData.parent_id,
        },
      });
    } catch (error: any) {
      Alert.alert(
        "Invalid QR Code",
        error.message || "This QR code is invalid or has expired",
        [
          {
            text: "Try Again",
            onPress: () => setScanned(false),
          },
        ],
      );
    }
  };

  const handleBack = () => {
    dispatch(clearError());
    router.back();
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
                onPress={() => BarCodeScanner.requestPermissionsAsync()}
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

      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />

      <View className="absolute bottom-0 left-0 right-0 bg-black/80 p-6">
        <Text className="text-white text-xl font-bold text-center mb-2">
          Scan QR Code
        </Text>
        <Text className="text-white/80 text-center mb-4">
          Point your camera at the QR code shown by your parent
        </Text>

        {scanned && (
          <TouchableOpacity
            onPress={() => setScanned(false)}
            className="bg-purple-600 py-3 px-6 rounded-xl"
          >
            <Text className="text-white font-bold text-center">Scan Again</Text>
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
