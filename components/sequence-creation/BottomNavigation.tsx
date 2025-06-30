import React from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react-native';

interface BottomNavigationProps {
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  showBack?: boolean;
  showNext?: boolean;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  children?: React.ReactNode;
  nextButtonColor?: 'indigo' | 'green';
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  onBack,
  onNext,
  backLabel = 'Back',
  nextLabel = 'Next',
  showBack = true,
  showNext = true,
  nextDisabled = false,
  backDisabled = false,
  children,
  nextButtonColor = 'indigo',
}) => {
  return (
    <View className="bg-white border-t border-gray-200">
      <SafeAreaView edges={['bottom']}>
        <View className="px-4 py-3">
        {children}
        
        <View className="flex-row gap-3">
          {showBack && (
            <TouchableOpacity
              onPress={onBack}
              disabled={backDisabled}
              className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl border ${
                backDisabled ? 'border-gray-200' : 'border-gray-300'
              }`}
            >
              <ChevronLeft size={20} color={backDisabled ? '#d1d5db' : '#6b7280'} />
              <Text className={`font-semibold ml-2 ${
                backDisabled ? 'text-gray-400' : 'text-gray-700'
              }`}>
                {backLabel}
              </Text>
            </TouchableOpacity>
          )}
          
          {showNext && (
            <TouchableOpacity
              onPress={onNext}
              disabled={nextDisabled}
              className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl ${
                nextDisabled ? 'bg-gray-300' : nextButtonColor === 'green' ? 'bg-green-600' : 'bg-indigo-600'
              }`}
            >
              <Text className={`font-semibold mr-2 ${
                nextDisabled ? 'text-gray-500' : 'text-white'
              }`}>
                {nextLabel}
              </Text>
              {nextButtonColor === 'green' ? (
                <Check size={20} color={nextDisabled ? '#6b7280' : '#ffffff'} />
              ) : (
                <ChevronRight size={20} color={nextDisabled ? '#6b7280' : '#ffffff'} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      </SafeAreaView>
    </View>
  );
};

export default BottomNavigation;