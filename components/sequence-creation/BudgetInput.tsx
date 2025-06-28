import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Coins } from 'lucide-react-native';

interface BudgetInputProps {
  value: number | null;
  currencyCode: string;
  conversionRate: number;
  onChange: (value: number) => void;
  error?: string;
}

const BudgetInput: React.FC<BudgetInputProps> = ({
  value,
  currencyCode,
  conversionRate,
  onChange,
  error,
}) => {
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (value !== null && !isFocused) {
      setInputValue(value.toString());
    }
  }, [value, isFocused]);

  const getCurrencySymbol = () => {
    switch (currencyCode) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '£';
    }
  };

  const handleChangeText = (text: string) => {
    // Allow only numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    
    // Ensure only one decimal point and max 2 decimal places
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    
    setInputValue(cleaned);
    
    const numValue = parseFloat(cleaned);
    if (!isNaN(numValue) && numValue >= 0) {
      onChange(numValue);
    } else if (cleaned === '' || cleaned === '.') {
      onChange(0);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format to 2 decimal places on blur if needed
    if (value !== null && value > 0) {
      setInputValue(value.toFixed(2).replace(/\.00$/, ''));
    }
  };

  const famcoins = value ? Math.floor(value * conversionRate) : 0;

  // Quick amount buttons
  const quickAmounts = [20, 50, 100];

  return (
    <View>
      {/* Input Container */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        className={`bg-white rounded-xl border-2 ${
          error ? 'border-red-500' : isFocused ? 'border-indigo-600' : 'border-gray-300'
        }`}
      >
        <View className="flex-row items-center px-4 py-3">
          <View className="pt-1">
            <Text className="mr-1 text-lg font-semibold text-gray-700">
              {getCurrencySymbol()}
            </Text>
          </View>
          <TextInput
            ref={inputRef}
            value={inputValue}
            onChangeText={handleChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            placeholder="0"
            placeholderTextColor="#9ca3af"
            keyboardType={Platform.OS === 'web' ? 'numeric' : 'decimal-pad'}
            className="flex-1 text-2xl font-semibold text-gray-900"
            accessibilityLabel="Budget amount"
            accessibilityHint={`Enter budget in ${currencyCode}`}
            style={Platform.OS === 'web' ? { outline: 'none' } : {}}
          />
        </View>
        
        {/* FAMCOIN Conversion Display */}
        <View className="flex-row items-center px-4 py-3 border-t border-gray-100">
          <Coins size={16} color="#4f46e5" />
          <Text className="ml-2 text-sm text-gray-600">
            = {famcoins.toLocaleString()} FAMCOINS
          </Text>
          <Text className="ml-2 text-xs text-gray-400">
            ({conversionRate} per {getCurrencySymbol()}1)
          </Text>
        </View>
      </TouchableOpacity>

      {/* Error Message */}
      {error && (
        <Text className="mt-1 ml-1 text-sm text-red-500">{error}</Text>
      )}

      {/* Quick Amount Buttons */}
      <View className="flex-row mt-3 space-x-2">
        {quickAmounts.map((amount) => (
          <TouchableOpacity
            key={amount}
            onPress={() => {
              setInputValue(amount.toString());
              onChange(amount);
            }}
            className="flex-1 px-3 py-2 bg-gray-100 rounded-lg"
          >
            <Text className="font-medium text-center text-gray-700">
              {getCurrencySymbol()}{amount}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default BudgetInput;