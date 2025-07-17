import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import childReducer from '../../store/slices/childSlice';
import taskReducer from '../../store/slices/taskSlice';
import parentReducer from '../../store/slices/parentSlice';
import connectionReducer from '../../store/slices/connectionSlice';

// Create a test store with all reducers
export const createTestStore = (preloadedState = {}) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      child: childReducer,
      tasks: taskReducer,
      parent: parentReducer,
      connection: connectionReducer,
    },
    preloadedState,
  });

  // Mock dispatch to handle thunks
  const originalDispatch = store.dispatch;
  store.dispatch = jest.fn((action) => {
    if (typeof action === 'function') {
      // For thunks, return a resolved promise
      return Promise.resolve({ type: 'mock/thunk' });
    }
    return originalDispatch(action);
  }) as any;

  return store;
};

// Render with providers
export const renderWithProviders = (
  component: React.ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return {
    store,
    ...render(component, { wrapper: Wrapper, ...renderOptions }),
  };
};

// Wait for async operations
export const waitForLoadingToFinish = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
};

// Mock navigation
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

// Mock route params
export const createMockRoute = (params = {}) => ({
  params,
  key: 'test-route',
  name: 'TestRoute',
});