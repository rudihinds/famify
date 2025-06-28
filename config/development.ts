// Development mode configuration
// This file contains utilities for development testing

// Check if dev mode is enabled
export const isDevMode = () => {
  return process.env.EXPO_PUBLIC_DEV_MODE === 'true';
};

// Get test credentials
export const getTestCredentials = () => {
  if (!isDevMode()) return null;
  
  const email = process.env.EXPO_PUBLIC_TEST_EMAIL;
  const password = process.env.EXPO_PUBLIC_TEST_PASSWORD;
  
  if (!email || !password) return null;
  
  return { email, password };
};