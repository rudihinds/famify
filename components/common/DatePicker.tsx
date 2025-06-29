import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';

interface DatePickerProps {
  value: string | null;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}

export default function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  error,
  minDate = new Date(),
  maxDate,
  disabled = false,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const dateValue = value ? new Date(value) : new Date();

  const handleDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      onChange(selectedDate.toISOString());
    }
  };

  const handleDone = () => {
    setShowPicker(false);
  };

  return (
    <View className="mb-6">
      {label && (
        <Text className="mb-3 font-semibold text-gray-900">{label}</Text>
      )}
      
      <TouchableOpacity
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
        className={`flex-row justify-between items-center p-4 bg-white rounded-xl border ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <Text className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? dateValue.toLocaleDateString() : placeholder}
        </Text>
        <Calendar size={20} color="#6b7280" />
      </TouchableOpacity>
      
      {error && (
        <Text className="mt-1 ml-1 text-sm text-red-500">{error}</Text>
      )}
      
      {/* iOS Date Picker Modal */}
      {showPicker && Platform.OS === 'ios' && (
        <Modal
          transparent
          animationType="slide"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <TouchableOpacity
            className="flex-1 justify-end bg-black/30"
            activeOpacity={1}
            onPress={() => setShowPicker(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              className="bg-white rounded-t-3xl"
            >
              <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text className="text-indigo-600 text-base">Cancel</Text>
                </TouchableOpacity>
                <Text className="font-semibold text-base">Select Date</Text>
                <TouchableOpacity onPress={handleDone}>
                  <Text className="text-indigo-600 text-base font-semibold">
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={minDate}
                maximumDate={maxDate}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
      
      {/* Android Date Picker */}
      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minDate}
          maximumDate={maxDate}
        />
      )}
      
      {/* Web date picker */}
      {Platform.OS === 'web' && showPicker && (
        <input
          type="date"
          value={value ? dateValue.toISOString().split('T')[0] : ''}
          onChange={(e) => {
            const date = new Date(e.target.value);
            onChange(date.toISOString());
            setShowPicker(false);
          }}
          min={minDate.toISOString().split('T')[0]}
          max={maxDate?.toISOString().split('T')[0]}
          className="mt-2 p-2 border border-gray-300 rounded-lg"
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
          }}
          ref={(input) => input?.click()}
        />
      )}
    </View>
  );
}