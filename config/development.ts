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

// Test children data for development
export const getTestChildren = () => [
  { 
    id: 'child-1', 
    name: 'Emma', 
    age: 8, 
    pin: '1234',
    parent_id: 'dev-parent-123'
  },
  { 
    id: 'child-2', 
    name: 'Liam', 
    age: 10, 
    pin: '5678',
    parent_id: 'dev-parent-123'
  }
];

// Development configuration
export const DEV_CONFIG = {
  parentId: 'dev-parent-123',
  testChildren: getTestChildren()
};