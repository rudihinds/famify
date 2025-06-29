import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useDebouncedCallback } from 'use-debounce';

interface TaskSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const TaskSearchBar: React.FC<TaskSearchBarProps> = ({
  onSearch,
  placeholder = 'Search tasks',
}) => {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Debounced search callback
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      onSearch(value);
    },
    300
  );

  const handleChangeText = useCallback((text: string) => {
    setSearchText(text);
    debouncedSearch(text);
  }, [debouncedSearch]);

  const handleClear = useCallback(() => {
    setSearchText('');
    onSearch('');
  }, [onSearch]);

  return (
    <View className={`bg-white rounded-xl border-2 ${
      isFocused ? 'border-indigo-600' : 'border-gray-200'
    }`}>
      <View className="flex-row items-center px-4 py-3">
        <Search size={20} color="#6b7280" />
        <TextInput
          value={searchText}
          onChangeText={handleChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          className="flex-1 ml-3 text-base text-gray-900"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Search tasks"
          accessibilityHint="Type to search across all task categories"
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            className="ml-2 p-1"
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <X size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default TaskSearchBar;