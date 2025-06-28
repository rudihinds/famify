import { Alert as RNAlert, Platform } from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Cross-platform alert utility that works on both web and mobile
 * 
 * TODO: For production web apps, consider replacing browser alerts with:
 * - A proper modal library (e.g., react-native-modal)
 * - Toast notifications (e.g., react-native-toast-message)
 * - Custom alert component with better UX
 */
export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: any
  ) => {
    // Use browser alerts on web
    if (Platform.OS === 'web') {
      // Simple case with no buttons
      if (!buttons || buttons.length === 0) {
        window.alert(`${title}${message ? '\n\n' + message : ''}`);
        return;
      }

      // Single button (OK)
      if (buttons.length === 1) {
        window.alert(`${title}${message ? '\n\n' + message : ''}`);
        buttons[0].onPress?.();
        return;
      }

      // Multiple buttons - use confirm for binary choice
      if (buttons.length === 2) {
        const confirmButton = buttons.find(b => b.style !== 'cancel');
        const cancelButton = buttons.find(b => b.style === 'cancel');
        
        const result = window.confirm(`${title}${message ? '\n\n' + message : ''}`);
        
        if (result && confirmButton) {
          confirmButton.onPress?.();
        } else if (!result && cancelButton) {
          cancelButton.onPress?.();
        }
        return;
      }

      // For more than 2 buttons, fallback to sequential confirms
      // TODO: Implement better multi-option UI for web
      const buttonTexts = buttons.map(b => b.text).join(' / ');
      window.alert(`${title}${message ? '\n\n' + message : ''}\n\nOptions: ${buttonTexts}`);
      
      // Just call the first non-cancel button for now
      const primaryButton = buttons.find(b => b.style !== 'cancel');
      primaryButton?.onPress?.();
    } else {
      // Use native alerts on mobile
      RNAlert.alert(title, message, buttons, options);
    }
  }
};

// Re-export the interface for convenience
export type { AlertButton };