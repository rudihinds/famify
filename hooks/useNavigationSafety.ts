import { useCallback, useRef, useEffect } from 'react';
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
 */
export function useNavigationSafety(options: NavigationSafetyOptions = {}) {
  const {
    message = 'You have unsaved changes. Are you sure you want to leave?',
    canNavigate = true,
  } = options;

  const routerRef = useRef<ReturnType<typeof useRouter> | null>(null);
  const navigationReadyRef = useRef(false);

  // Try to get router safely
  useEffect(() => {
    try {
      routerRef.current = useRouter();
      navigationReadyRef.current = true;
    } catch (error) {
      // Navigation context not ready yet
      navigationReadyRef.current = false;
    }
  }, []);

  /**
   * Safe navigation with context check
   */
  const navigate = useCallback((
    path: string,
    options?: { replace?: boolean }
  ) => {
    if (!navigationReadyRef.current || !routerRef.current) {
      console.warn('Navigation context not ready, deferring navigation');
      // Defer navigation until context is ready
      setTimeout(() => navigate(path, options), 100);
      return;
    }

    const performNavigation = () => {
      try {
        if (options?.replace) {
          routerRef.current!.replace(path as any);
        } else {
          routerRef.current!.push(path as any);
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
  }, [canNavigate, message]);

  /**
   * Safe back navigation
   */
  const goBack = useCallback(() => {
    if (!navigationReadyRef.current || !routerRef.current) {
      console.warn('Navigation context not ready for back navigation');
      return;
    }

    const performBack = () => {
      try {
        routerRef.current!.back();
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
  }, [canNavigate, message]);

  /**
   * Check if navigation is ready
   */
  const isNavigationReady = useCallback(() => {
    return navigationReadyRef.current;
  }, []);

  return {
    navigate,
    goBack,
    isNavigationReady,
  };
}

/**
 * Hook to check for navigation readiness without using router
 */
export function useNavigationReady() {
  const isReady = useRef(false);

  useEffect(() => {
    // Check if we can safely use router
    const checkReady = () => {
      try {
        useRouter();
        isReady.current = true;
        return true;
      } catch {
        isReady.current = false;
        return false;
      }
    };

    if (!checkReady()) {
      // Keep checking until ready
      const interval = setInterval(() => {
        if (checkReady()) {
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, []);

  return isReady.current;
}