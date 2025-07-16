import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { Camera, CameraType, CameraView } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
// TODO: Install expo-image-picker when needed
// import * as ImagePicker from "expo-image-picker";
import { Camera as CameraIcon, Images, X, RotateCcw } from "lucide-react-native";

interface PhotoCaptureProps {
  visible: boolean;
  onClose: () => void;
  onPhotoCapture: (photoUri: string) => void;
  maxSizeMB?: number;
}

export default function PhotoCapture({
  visible,
  onClose,
  onPhotoCapture,
  maxSizeMB = 2,
}: PhotoCaptureProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView>(null);

  // Request camera permission
  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
    if (status === "granted") {
      setShowCamera(true);
    } else {
      Alert.alert(
        "Camera Permission",
        "Camera permission is required to take photos for task completion."
      );
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    // TODO: Implement when expo-image-picker is installed
    Alert.alert(
      "Coming Soon",
      "Gallery selection will be available after installing expo-image-picker"
    );
  };

  // Take photo with camera
  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: Platform.OS === 'ios' ? true : false, // iOS simulator fix
        base64: false,
        exif: false,
      });
      
      if (photo && photo.uri) {
        console.log('[PhotoCapture] Photo captured:', {
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          // Log all properties to see what we get
          allProperties: Object.keys(photo)
        });
        await processImage(photo.uri);
        setShowCamera(false);
      } else {
        throw new Error('No photo URI returned from camera');
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  // Process and compress image
  const processImage = async (uri: string) => {
    setIsProcessing(true);
    
    try {
      // Validate the URI
      if (!uri || uri.length === 0) {
        throw new Error('Invalid photo URI');
      }
      
      console.log('[PhotoCapture] Processing image URI:', uri);
      
      // Use ImageManipulator to process the image
      // This ensures the image is properly loaded and formatted
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [
          // Resize if needed (max 2048px on longest side)
          { resize: { width: 2048 } }
        ],
        {
          compress: 0.8, // 80% quality
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false, // We don't need base64
        }
      );
      
      console.log('[PhotoCapture] Image processed:', {
        uri: manipResult.uri,
        width: manipResult.width,
        height: manipResult.height,
      });
      
      setCapturedPhoto(manipResult.uri);
    } catch (error) {
      console.error("Error processing image:", error);
      Alert.alert("Error", "Failed to process image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm and send photo
  const confirmPhoto = () => {
    if (capturedPhoto) {
      console.log('[PhotoCapture] Confirming photo with URI:', capturedPhoto);
      onPhotoCapture(capturedPhoto);
      resetState();
      onClose();
    }
  };

  // Reset component state
  const resetState = () => {
    setCapturedPhoto(null);
    setShowCamera(false);
  };

  // Toggle camera facing
  const toggleCameraFacing = () => {
    setFacing(current => current === "back" ? "front" : "back");
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black">
        {/* Camera View */}
        {showCamera && !capturedPhoto ? (
          <View className="flex-1">
            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing={facing}
            >
              {/* Camera Controls */}
              <View className="absolute top-0 left-0 right-0 p-4 z-10">
                <TouchableOpacity
                  onPress={() => {
                    setShowCamera(false);
                    onClose();
                  }}
                  className="self-start bg-black/50 rounded-full p-2"
                >
                  <X size={24} color="white" />
                </TouchableOpacity>
              </View>

              <View className="absolute bottom-0 left-0 right-0 pb-8">
                <View className="flex-row items-center justify-center gap-8">
                  <TouchableOpacity
                    onPress={toggleCameraFacing}
                    className="bg-black/50 rounded-full p-4"
                  >
                    <RotateCcw size={24} color="white" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={takePhoto}
                    className="bg-white rounded-full p-6"
                  >
                    <View className="w-16 h-16 bg-white rounded-full border-4 border-black" />
                  </TouchableOpacity>

                  <View className="w-14 h-14" />
                </View>
              </View>
            </CameraView>
          </View>
        ) : capturedPhoto ? (
          // Photo Preview
          <View className="flex-1">
            <View className="absolute top-0 left-0 right-0 p-4 z-10">
              <TouchableOpacity
                onPress={() => {
                  setCapturedPhoto(null);
                  onClose();
                }}
                className="self-start bg-black/50 rounded-full p-2"
              >
                <X size={24} color="white" />
              </TouchableOpacity>
            </View>

            <Image
              source={{ uri: capturedPhoto }}
              className="flex-1"
              resizeMode="contain"
            />

            <View className="absolute bottom-0 left-0 right-0 bg-black/80 p-6">
              <View className="flex-row gap-4">
                <TouchableOpacity
                  onPress={() => setCapturedPhoto(null)}
                  className="flex-1 bg-gray-600 rounded-xl py-4"
                >
                  <Text className="text-white text-center font-semibold">
                    Retake
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmPhoto}
                  className="flex-1 bg-green-500 rounded-xl py-4"
                >
                  <Text className="text-white text-center font-semibold">
                    Use Photo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          // Option Selection
          <View className="flex-1 bg-white">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-900">Add Photo Proof</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View className="flex-1 p-6 justify-center">
              <Text className="text-gray-600 text-center mb-8">
                Take a photo to show you've completed this task
              </Text>

              <View className="gap-4">
                <TouchableOpacity
                  onPress={requestCameraPermission}
                  className="bg-green-500 rounded-xl p-6 flex-row items-center justify-center gap-3"
                >
                  <CameraIcon size={24} color="white" />
                  <Text className="text-white text-lg font-semibold">
                    Take Photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={pickImage}
                  className="bg-gray-100 rounded-xl p-6 flex-row items-center justify-center gap-3"
                >
                  <Images size={24} color="#374151" />
                  <Text className="text-gray-900 text-lg font-semibold">
                    Choose from Gallery
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <View className="absolute inset-0 bg-black/70 items-center justify-center">
            <ActivityIndicator size="large" color="white" />
            <Text className="text-white mt-2">Processing image...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}