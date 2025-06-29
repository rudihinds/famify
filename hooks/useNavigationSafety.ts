import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

interface NavigationSafetyOptions {
  /**
   * Custom confirmation message
   */
  message?: string;
  /**
   * Whether navigation is currently allowed (e.g., no unsaved changes)
   */
  canNavigate?: boolean;
}

/**
 * Hook to safely navigate with navigation context checks
 * Prevents navigation context errors and optionally confirms navigation
 * 
 * IMPORTANT: This hook should only be used inside components that are
 * guaranteed to have navigation context (i.e., inside the navigation stack)
 */
export function useNavigationSafety(options: NavigationSafetyOptions = {}) {
  const {
    message = 'You have unsaved changes. Are you sure you want to leave?',
    canNavigate = true,
  } = options;

  // This will throw if navigation context is not available
  // The error should be caught by the component using this hook
  const router = useRouter();

  /**
   * Safe navigation with context check
   */
  const navigate = useCallback((
    path: string,
    options?: { replace?: boolean }
  ) => {
    const performNavigation = () => {
      try {
        if (options?.replace) {
          router.replace(path as any);
        } else {
          router.push(path as any);
        }
      } catch (error) {
        console.error('Navigation error:', error);
        // If navigation fails, try again after a delay
        setTimeout(() => performNavigation(), 100);
      }
    };

    // If canNavigate is false, show confirmation dialog
    if (!canNavigate) {
      Alert.alert(
        'Unsaved Changes',
        message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: performNavigation,
          },
        ]
      );
    } else {
      performNavigation();
    }
  }, [canNavigate, message, router]);

  /**
   * Safe back navigation
   */
  const goBack = useCallback(() => {
    const performBack = () => {
      try {
        router.back();
      } catch (error) {
        console.error('Back navigation error:', error);
      }
    };

    if (!canNavigate) {
      Alert.alert(
        'Unsaved Changes',
        message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: performBack,
          },
        ]
      );
    } else {
      performBack();
    }
  }, [canNavigate, message, router]);

  /**
   * Check if navigation is ready
   * Since we always call useRouter, navigation is always "ready"
   */
  const isNavigationReady = useCallback(() => {
    return true;
  }, []);

  return {
    navigate,
    goBack,
    isNavigationReady,
  };
}

