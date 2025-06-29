import React, { useEffect } from 'react';
import { View, Text, Modal, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface SequenceCreationSuccessProps {
  visible: boolean;
  childName: string;
  isEditing?: boolean;
  onComplete: () => void;
}

export default function SequenceCreationSuccess({
  visible,
  childName,
  isEditing = false,
  onComplete,
}: SequenceCreationSuccessProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback on iOS
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Start animations
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 200,
      });
      checkScale.value = withDelay(
        200,
        withSpring(1, {
          damping: 10,
          stiffness: 180,
        })
      );

      // Auto dismiss after 2 seconds
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onComplete)();
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-8">
        <Animated.View
          style={containerAnimatedStyle}
          className="bg-white rounded-3xl p-8 items-center w-full max-w-sm shadow-2xl"
        >
          {/* Success Icon */}
          <Animated.View
            style={checkAnimatedStyle}
            className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-6"
          >
            <CheckCircle size={48} color="#10b981" strokeWidth={3} />
          </Animated.View>

          {/* Success Text */}
          <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Success!
          </Text>
          <Text className="text-gray-600 text-center">
            Sequence {isEditing ? 'updated' : 'created'} for {childName}
          </Text>
          
          {/* Loading dots animation */}
          <View className="flex-row mt-6">
            <View className="w-2 h-2 bg-gray-400 rounded-full mx-1" />
            <View className="w-2 h-2 bg-gray-400 rounded-full mx-1" />
            <View className="w-2 h-2 bg-gray-400 rounded-full mx-1" />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}