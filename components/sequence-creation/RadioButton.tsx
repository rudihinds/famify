import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface RadioButtonProps {
  value: string;
  label: string;
  selected: boolean;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

const RadioButton: React.FC<RadioButtonProps> = ({
  value,
  label,
  selected,
  onSelect,
  disabled = false,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{
        scale: withSpring(selected ? 1 : 0, {
          damping: 15,
          stiffness: 300,
        })
      }]
    };
  });

  return (
    <TouchableOpacity
      onPress={() => !disabled && onSelect(value)}
      disabled={disabled}
      className={`flex-row items-center py-3 ${disabled ? 'opacity-50' : ''}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
    >
      <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${
        selected ? 'border-indigo-600' : 'border-gray-300'
      }`}>
        <Animated.View 
          style={animatedStyle}
          className="w-3 h-3 rounded-full bg-indigo-600"
        />
      </View>
      <Text className={`text-base ${
        selected ? 'text-gray-900 font-semibold' : 'text-gray-700'
      } ${disabled ? 'text-gray-400' : ''}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default RadioButton;