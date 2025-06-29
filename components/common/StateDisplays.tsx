import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RefreshCw, AlertCircle, FileX } from 'lucide-react-native';

interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const EmptyState = React.memo<EmptyStateProps>(({
  title = 'No Data Found',
  message,
  icon,
  action,
}) => (
  <View className="bg-white rounded-xl p-8 items-center">
    {icon || <FileX size={48} color="#9ca3af" />}
    <Text className="text-lg font-semibold text-gray-900 mb-2 mt-4">
      {title}
    </Text>
    <Text className="text-gray-600 text-center">
      {message}
    </Text>
    {action && (
      <TouchableOpacity
        onPress={action.onPress}
        className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg"
      >
        <Text className="text-white font-medium">{action.label}</Text>
      </TouchableOpacity>
    )}
  </View>
));

EmptyState.displayName = 'EmptyState';

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  title?: string;
}

export const ErrorState = React.memo<ErrorStateProps>(({
  error,
  onRetry,
  title = 'Error',
}) => (
  <View className="bg-red-50 rounded-xl p-4">
    <View className="flex-row items-center mb-2">
      <AlertCircle size={20} color="#dc2626" />
      <Text className="text-red-700 font-semibold ml-2">{title}</Text>
    </View>
    <Text className="text-red-700 text-center mb-2">{error}</Text>
    {onRetry && (
      <TouchableOpacity
        onPress={onRetry}
        className="flex-row items-center justify-center mt-2"
      >
        <RefreshCw size={16} color="#b91c1c" />
        <Text className="text-red-700 text-center font-semibold ml-2">
          Tap to retry
        </Text>
      </TouchableOpacity>
    )}
  </View>
));

ErrorState.displayName = 'ErrorState';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export const LoadingState = React.memo<LoadingStateProps>(({
  message = 'Loading...',
  size = 'large',
  fullScreen = false,
}) => (
  <View className={`items-center justify-center ${fullScreen ? 'flex-1' : 'py-20'}`}>
    <ActivityIndicator 
      size={size} 
      color="#4f46e5" 
    />
    <Text className="mt-4 text-gray-600">{message}</Text>
  </View>
));

LoadingState.displayName = 'LoadingState';

interface StateContainerProps {
  isLoading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onPress: () => void;
  };
  children: React.ReactNode;
}

/**
 * Container component that handles loading, error, and empty states
 */
export const StateContainer = React.memo<StateContainerProps>(({
  isLoading,
  error,
  isEmpty,
  onRetry,
  loadingMessage,
  emptyTitle,
  emptyMessage = 'No data available',
  emptyAction,
  children,
}) => {
  if (isLoading) {
    return <LoadingState message={loadingMessage} />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (isEmpty) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        action={emptyAction}
      />
    );
  }

  return <>{children}</>;
});

StateContainer.displayName = 'StateContainer';