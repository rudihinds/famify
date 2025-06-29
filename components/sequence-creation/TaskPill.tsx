import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  interpolateColor,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

interface TaskPillProps {
  task: {
    id: string;
    name: string;
  };
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const TaskPill: React.FC<TaskPillProps> = ({
  task,
  isSelected,
  onToggle,
  disabled = false,
}) => {
  const animatedValue = useSharedValue(isSelected ? 1 : 0);

  React.useEffect(() => {
    animatedValue.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
  }, [isSelected, animatedValue]);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      animatedValue.value,
      [0, 1],
      ['#ffffff', '#4f46e5'] // white to indigo-600
    );

    const borderColor = interpolateColor(
      animatedValue.value,
      [0, 1],
      ['#d1d5db', '#4f46e5'] // gray-300 to indigo-600
    );

    return {
      backgroundColor,
      borderColor,
      borderWidth: 2,
      transform: [
        {
          scale: withSpring(isSelected ? 0.95 : 1, {
            damping: 15,
            stiffness: 400,
          }),
        },
      ],
    };
  });

  return (
    <AnimatedTouchableOpacity
      onPress={onToggle}
      disabled={disabled}
      style={[
        animatedStyle,
        {
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          marginRight: 8,
          marginBottom: 8,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled }}
      accessibilityLabel={`Task: ${task.name}`}
    >
      <Text
        className={`text-sm font-medium ${
          isSelected ? 'text-white' : 'text-gray-700'
        }`}
      >
        {task.name}
      </Text>
    </AnimatedTouchableOpacity>
  );
};

export default TaskPill;