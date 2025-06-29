import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Check, Calendar, Coins, BarChart3, CheckCircle } from 'lucide-react-native';
import { Child } from '../../services/childService';

interface ActiveSequenceInfo {
  id: string;
  period: 'weekly' | 'fortnightly' | 'monthly';
  startDate: string;
  endDate: string | null;
  budgetCurrency: number;
  budgetFamcoins: number;
  status: string;
  totalTasks: number;
  completedTasks: number;
  avgTasksPerDay: number;
  progress: number;
}

interface ChildSelectionCardProps {
  child: Child;
  isSelected: boolean;
  onSelect: (childId: string) => void;
  activeSequence?: ActiveSequenceInfo;
}

const ChildSelectionCard = React.memo<ChildSelectionCardProps>(({ 
  child, 
  isSelected, 
  onSelect,
  activeSequence 
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{
        scale: withSpring(isSelected ? 0.98 : 1, {
          damping: 15,
          stiffness: 150,
        })
      }]
    };
  });

  const generateAvatarUrl = (name: string) => {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
  };

  return (
    <TouchableOpacity 
      onPress={() => onSelect(child.id)}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`Select ${child.name}, age ${child.age}`}
      accessibilityHint="Tap to select this child for the sequence"
    >
      <Animated.View style={animatedStyle}>
        <View className={`
          bg-white rounded-xl p-4 mb-3 border-2 shadow-sm
          ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}
        `}>
          <View className="flex-row items-center">
            {/* Avatar */}
            <View className="mr-4">
              <Image 
                source={{ uri: child.avatar_url || generateAvatarUrl(child.name) }}
                className="w-16 h-16 rounded-full bg-gray-200"
                contentFit="cover"
                transition={200}
              />
            </View>
            
            {/* Child Info */}
            <View className="flex-1">
              <Text className={`text-lg font-semibold ${
                isSelected ? 'text-indigo-900' : 'text-gray-900'
              }`}>
                {child.name}
              </Text>
              <Text className={`text-sm ${
                isSelected ? 'text-indigo-700' : 'text-gray-500'
              }`}>
                Age {child.age}
              </Text>
              
              {/* Focus Areas */}
              {child.focus_areas && child.focus_areas.length > 0 && (
                <View className="flex-row flex-wrap mt-2">
                  {child.focus_areas.slice(0, 2).map((area, index) => (
                    <View 
                      key={index} 
                      className={`px-2 py-1 rounded-full mr-2 mb-1 ${
                        isSelected ? 'bg-indigo-200' : 'bg-gray-100'
                      }`}
                    >
                      <Text className={`text-xs ${
                        isSelected ? 'text-indigo-800' : 'text-gray-600'
                      }`}>
                        {area}
                      </Text>
                    </View>
                  ))}
                  {child.focus_areas.length > 2 && (
                    <Text className={`text-xs ${
                      isSelected ? 'text-indigo-700' : 'text-gray-500'
                    }`}>
                      +{child.focus_areas.length - 2} more
                    </Text>
                  )}
                </View>
              )}
            </View>
            
            {/* Selection Indicator */}
            {isSelected && (
              <View className="w-8 h-8 bg-indigo-600 rounded-full items-center justify-center ml-3">
                <Check size={16} color="white" strokeWidth={3} />
              </View>
            )}
          </View>
          
          {/* FAMCOIN Balance */}
          <View className={`mt-3 pt-3 border-t ${
            isSelected ? 'border-indigo-200' : 'border-gray-100'
          }`}>
            <Text className={`text-sm ${
              isSelected ? 'text-indigo-700' : 'text-gray-600'
            }`}>
              Balance: {child.famcoin_balance} FAMCOINS
            </Text>
          </View>
          
          {/* Active Sequence Section */}
          {activeSequence && (
            <View className="mt-3 p-3 bg-blue-50 rounded-lg">
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <Text className="text-sm font-semibold text-blue-900">Active Sequence</Text>
              </View>
              
              {/* Period and Start Date */}
              <View className="flex-row items-center mb-2">
                <Calendar size={14} color="#4f46e5" />
                <Text className="text-xs text-gray-700 ml-1">
                  {activeSequence.period === 'weekly' ? 'Weekly' :
                   activeSequence.period === 'fortnightly' ? 'Fortnightly' :
                   activeSequence.period === 'monthly' ? 'Monthly' : 'Ongoing'}
                  {' • Started '}
                  {new Date(activeSequence.startDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
              
              {/* Budget */}
              <View className="flex-row items-center mb-2">
                <Coins size={14} color="#4f46e5" />
                <Text className="text-xs text-gray-700 ml-1">
                  £{activeSequence.budgetCurrency} budget ({activeSequence.budgetFamcoins} FC)
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                {/* Tasks Info */}
                <View className="flex-row items-center">
                  <BarChart3 size={14} color="#4f46e5" />
                  <Text className="text-xs text-gray-700 ml-1">
                    {activeSequence.totalTasks} tasks • ~{activeSequence.avgTasksPerDay}/day
                  </Text>
                </View>
                
                {/* Progress */}
                <View className="flex-row items-center">
                  <CheckCircle size={14} color="#10b981" />
                  <Text className="text-xs text-gray-700 ml-1">
                    {activeSequence.completedTasks}/{activeSequence.totalTasks}
                  </Text>
                </View>
              </View>
              
              {/* Progress Bar */}
              <View className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
                <View 
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${activeSequence.progress}%` }}
                />
              </View>
              
              {/* Edit Sequence Text */}
              <Text className="text-xs text-indigo-600 font-medium mt-2 text-center">
                Tap to Edit Sequence →
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

ChildSelectionCard.displayName = 'ChildSelectionCard';

export default ChildSelectionCard;