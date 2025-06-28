import React from 'react';
import { View, Text } from 'react-native';
import RadioButton from './RadioButton';

interface PeriodSelectorProps {
  selectedPeriod: 'weekly' | 'fortnightly' | 'monthly' | null;
  onPeriodChange: (period: 'weekly' | 'fortnightly' | 'monthly') => void;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  const periods = [
    {
      value: 'weekly' as const,
      label: 'Weekly',
      description: '7 day sequence',
    },
    {
      value: 'fortnightly' as const,
      label: 'Fortnightly',
      description: '14 day sequence',
    },
    {
      value: 'monthly' as const,
      label: 'Monthly',
      description: '30 day sequence',
    },
  ];

  return (
    <View className="bg-white rounded-xl p-4">
      {periods.map((period, index) => (
        <View key={period.value}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <RadioButton
                value={period.value}
                label={period.label}
                selected={selectedPeriod === period.value}
                onSelect={() => onPeriodChange(period.value)}
              />
            </View>
            <Text className="text-sm text-gray-500 mr-2">
              {period.description}
            </Text>
          </View>
          {index < periods.length - 1 && (
            <View className="h-px bg-gray-100 ml-9" />
          )}
        </View>
      ))}
    </View>
  );
};

export default PeriodSelector;