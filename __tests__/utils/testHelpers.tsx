import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import { combineReducers } from '@reduxjs/toolkit';
import authSlice from '../../store/slices/authSlice';
import childSlice from '../../store/slices/childSlice';
import taskSlice from '../../store/slices/taskSlice';
import parentSlice from '../../store/slices/parentSlice';
import connectionSlice from '../../store/slices/connectionSlice';
import sequenceCreationSlice from '../../store/slices/sequenceCreationSlice';
import sequencesSlice from '../../store/slices/sequencesSlice';

// Create a test storage that matches the production storage pattern
const testStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return Promise.resolve(null);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    return Promise.resolve();
  },
  removeItem: async (key: string): Promise<void> => {
    return Promise.resolve();
  },
};

// Create a test store with all reducers that matches production structure
export const createTestStore = (preloadedState = {}) => {
  const persistConfig = {
    key: 'root',
    storage: testStorage,
    whitelist: ['auth', 'tasks'],
    debug: false,
  };

  // Separate persist config for sequence creation
  const sequenceCreationPersistConfig = {
    key: 'sequenceCreation',
    storage: testStorage,
    whitelist: ['selectedChildId', 'sequenceSettings', 'groups', 'selectedTasksByGroup', 'currentStep', 'isEditing', 'editingSequenceId'],
    blacklist: ['isLoading', 'error', 'validationErrors'],
  };

  const rootReducer = combineReducers({
    auth: authSlice,
    child: childSlice,
    connection: connectionSlice,
    sequenceCreation: persistReducer(sequenceCreationPersistConfig, sequenceCreationSlice),
    sequences: sequencesSlice,
    tasks: taskSlice,
    parent: parentSlice,
  });

  const persistedReducer = persistReducer(persistConfig, rootReducer);

  const store = configureStore({
    reducer: persistedReducer,
    preloadedState,
    // Disable default middleware in tests to avoid serialization checks
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [
            'persist/PERSIST',
            'persist/REHYDRATE',
            'persist/REGISTER',
            'persist/PURGE',
            'persist/FLUSH',
            'persist/PAUSE',
            'FLUSH',
            'REHYDRATE',
            'PAUSE',
            'PERSIST',
            'PURGE',
            'REGISTER',
          ],
        },
        immutableCheck: false,
      }),
  });

  // Keep original dispatch for real Redux thunk execution
  // This allows actual Redux state updates to occur during tests
  // Services are still mocked via jest.mock() in jest-setup.js
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