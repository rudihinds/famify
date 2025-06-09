import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { Share, X, Copy, RefreshCw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useDispatch, useSelector } from "react-redux";
import {
  generateConnectionToken,
  clearCurrentToken,
} from "../store/slices/connectionSlice";
import { RootState, AppDispatch } from "../store";
import QRCode from "react-native-qrcode-svg";

interface QRCodeGeneratorProps {
  isVisible?: boolean;
  onClose?: () => void;
}

const QRCodeGenerator = ({
  isVisible = true,
  onClose = () => {},
}: QRCodeGeneratorProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentToken, isGenerating, error } = useSelector(
    (state: RootState) => state.connection,
  );
  const { user } = useSelector((state: RootState) => state.auth);

  const [childName, setChildName] = useState("");
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [showNameInput, setShowNameInput] = useState(true);

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
      setShowNameInput(true);
      setChildName("");
      dispatch(clearCurrentToken());
    }
  }, [isVisible, dispatch]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleGenerateQR = () => {
    if (!childName.trim()) {
      Alert.alert("Error", "Please enter your child's name");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    dispatch(
      generateConnectionToken({
        childName: childName.trim(),
        parentId: user.id,
      }),
    ).then(() => {
      setShowNameInput(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
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
    setShowNameInput(true);
    dispatch(clearCurrentToken());
  };

  if (showNameInput || !currentToken) {
    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 h-[400px]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-blue-600">
                Connect Child Device
              </Text>
              <TouchableOpacity onPress={onClose} className="p-2">
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text className="text-lg font-medium mb-4">
              Enter your child's name to generate a QR code
            </Text>

            <TextInput
              className="border border-gray-300 rounded-lg p-4 text-lg mb-6"
              placeholder="Child's name"
              value={childName}
              onChangeText={setChildName}
              autoFocus
            />

            {error && (
              <Text className="text-red-500 text-center mb-4">{error}</Text>
            )}

            <TouchableOpacity
              onPress={handleGenerateQR}
              className="bg-blue-600 py-4 rounded-lg items-center"
              disabled={isGenerating || !childName.trim()}
            >
              <Text className="text-white font-bold text-lg">
                {isGenerating ? "Generating..." : "Generate QR Code"}
              </Text>
            </TouchableOpacity>

            <Text className="text-gray-500 text-center mt-4 text-sm">
              The QR code will be valid for 10 minutes
            </Text>
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

          <Text className="text-gray-600 text-center mb-4">
            Have your child scan this QR code using the Famify app to connect
            their device to your account.
          </Text>

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
