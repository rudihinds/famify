import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authSlice from '../../store/slices/authSlice';
import childSlice from '../../store/slices/childSlice';
import taskSlice from '../../store/slices/taskSlice';
import parentSlice from '../../store/slices/parentSlice';
import connectionSlice from '../../store/slices/connectionSlice';
import sequenceCreationSlice from '../../store/slices/sequenceCreationSlice';
import sequencesSlice from '../../store/slices/sequencesSlice';

// Create a test store with all reducers
export const createTestStore = (preloadedState = {}) => {
  const store = configureStore({
    reducer: {
      auth: authSlice,
      child: childSlice,
      tasks: taskSlice,
      parent: parentSlice,
      connection: connectionSlice,
      sequenceCreation: sequenceCreationSlice,
      sequences: sequencesSlice,
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