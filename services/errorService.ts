import { Alert } from 'react-native';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public recoverable: boolean = true,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error codes for consistent error handling
 */
export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // Database errors
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Business logic errors
  ACTIVE_SEQUENCE_EXISTS: 'ACTIVE_SEQUENCE_EXISTS',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  
  // Generic
  UNKNOWN: 'UNKNOWN',
} as const;

/**
 * Map Supabase error codes to app error codes
 */
const SUPABASE_ERROR_MAP: Record<string, { code: string; userMessage: string }> = {
  'PGRST116': {
    code: ERROR_CODES.NOT_FOUND,
    userMessage: 'The requested data was not found.',
  },
  'PGRST204': {
    code: ERROR_CODES.NOT_FOUND,
    userMessage: 'No data found for this request.',
  },
  'PGRST200': {
    code: ERROR_CODES.CONSTRAINT_VIOLATION,
    userMessage: 'Invalid relationship or constraint.',
  },
  '23505': {
    code: ERROR_CODES.DUPLICATE_ENTRY,
    userMessage: 'This item already exists.',
  },
  '23503': {
    code: ERROR_CODES.CONSTRAINT_VIOLATION,
    userMessage: 'This operation would violate data constraints.',
  },
  '23502': {
    code: ERROR_CODES.VALIDATION_ERROR,
    userMessage: 'Required fields are missing.',
  },
  'JWT expired': {
    code: ERROR_CODES.SESSION_EXPIRED,
    userMessage: 'Your session has expired. Please log in again.',
  },
  'invalid_grant': {
    code: ERROR_CODES.UNAUTHORIZED,
    userMessage: 'Invalid credentials provided.',
  },
};

/**
 * Centralized error handler
 */
export const errorHandler = {
  /**
   * Convert any error to AppError
   */
  handle: (error: unknown, context: string): AppError => {
    console.error(`[${context}]`, error);
    
    // Already an AppError
    if (error instanceof AppError) {
      return error;
    }
    
    // Supabase error
    if (error && typeof error === 'object' && 'code' in error) {
      const errorCode = String((error as any).code);
      const mapped = SUPABASE_ERROR_MAP[errorCode];
      
      if (mapped) {
        return new AppError(
          (error as any).message || 'Database error',
          mapped.code,
          mapped.userMessage,
          true,
          { originalError: error, context }
        );
      }
    }
    
    // Network error
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String((error as any).message);
      
      if (message.includes('network') || message.includes('fetch')) {
        return new AppError(
          message,
          ERROR_CODES.NETWORK_ERROR,
          'Network error. Please check your connection and try again.',
          true,
          { originalError: error, context }
        );
      }
    }
    
    // Default error
    return new AppError(
      (error as any)?.message || 'Unknown error',
      ERROR_CODES.UNKNOWN,
      'An unexpected error occurred. Please try again.',
      true,
      { originalError: error, context }
    );
  },
  
  /**
   * Show error alert to user
   */
  showAlert: (error: AppError, onRetry?: () => void) => {
    const buttons = error.recoverable && onRetry
      ? [
          { text: 'Cancel', style: 'cancel' as const },
          { text: 'Retry', onPress: onRetry },
        ]
      : [{ text: 'OK' }];
    
    Alert.alert('Error', error.userMessage, buttons);
  },
  
  /**
   * Log error for monitoring
   */
  log: (error: AppError, additionalContext?: Record<string, any>) => {
    // In production, this would send to error monitoring service
    console.error('Error logged:', {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      recoverable: error.recoverable,
      context: error.context,
      additionalContext,
      stack: error.stack,
    });
  },
  
  /**
   * Check if error is of specific type
   */
  isErrorCode: (error: unknown, code: keyof typeof ERROR_CODES): boolean => {
    return error instanceof AppError && error.code === ERROR_CODES[code];
  },
};

/**
 * Async error boundary for try-catch blocks
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string,
  onError?: (error: AppError) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const appError = errorHandler.handle(error, context);
    errorHandler.log(appError);
    
    if (onError) {
      onError(appError);
    } else {
      errorHandler.showAlert(appError);
    }
    
    return null;
  }
}