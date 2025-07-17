import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import DevModeMenu from '../../components/DevModeMenu';
import PinLoginScreen from '../../app/child/pin-login';
import ScannerScreen from '../../app/child/scanner';
import { renderWithProviders } from '../utils/testHelpers';
import { 
  createMockChild,
  createMockChildState,
  createMockAuthState 
} from '../utils/mockFactories';

// Mock environment variable
process.env.EXPO_PUBLIC_DEV_MODE = 'true';

describe('Dev Mode Integration', () => {
  const mockChildren = [
    createMockChild({ id: 'child-1', name: 'Emma', age: 8 }),
    createMockChild({ id: 'child-2', name: 'Liam', age: 10 }),
  ];

  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(require('expo-router').useRouter).mockReturnValue(mockRouter);
  });

  describe('DevModeMenu Component', () => {
    test('shows dev mode menu when enabled', () => {
      const { getByTestId, getByText } = renderWithProviders(
        <DevModeMenu />,
        {
          preloadedState: {
            auth: createMockAuthState({ devModeEnabled: true }),
            child: createMockChildState({
              availableProfiles: mockChildren,
            }),
          },
        }
      );

      fireEvent.press(getByTestId('dev-mode-trigger'));
      
      expect(getByText('Dev Mode Tools')).toBeTruthy();
      expect(getByText('Quick Actions')).toBeTruthy();
    });

    test('does not show in production mode', () => {
      const { queryByTestId } = renderWithProviders(
        <DevModeMenu />,
        {
          preloadedState: {
            auth: createMockAuthState({ devModeEnabled: false }),
          },
        }
      );

      expect(queryByTestId('dev-mode-trigger')).toBeFalsy();
    });

    test('provides quick login for test children', async () => {
      const mockDispatch = jest.fn();
      jest.mocked(require('react-redux').useDispatch).mockReturnValue(mockDispatch);

      const { getByTestId, getByText } = renderWithProviders(
        <DevModeMenu />,
        {
          preloadedState: {
            auth: createMockAuthState({ devModeEnabled: true }),
            child: createMockChildState({
              availableProfiles: mockChildren,
            }),
          },
        }
      );

      fireEvent.press(getByTestId('dev-mode-trigger'));
      fireEvent.press(getByText('Login as Emma'));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'child/devModeLogin',
          payload: expect.objectContaining({
            name: 'Emma',
            id: 'child-1',
          })
        });
      });
    });

    test('creates test data', async () => {
      const { getByTestId, getByText } = renderWithProviders(
        <DevModeMenu />,
        {
          preloadedState: {
            auth: createMockAuthState({ devModeEnabled: true }),
          },
        }
      );

      fireEvent.press(getByTestId('dev-mode-trigger'));
      fireEvent.press(getByText('Create Test Children'));

      await waitFor(() => {
        expect(require('react-native').Alert.alert).toHaveBeenCalledWith(
          'Success',
          expect.stringContaining('Test children created')
        );
      });
    });

    test('resets app data', async () => {
      const mockDispatch = jest.fn();
      jest.mocked(require('react-redux').useDispatch).mockReturnValue(mockDispatch);

      const { getByTestId, getByText } = renderWithProviders(
        <DevModeMenu />,
        {
          preloadedState: {
            auth: createMockAuthState({ devModeEnabled: true }),
          },
        }
      );

      fireEvent.press(getByTestId('dev-mode-trigger'));
      fireEvent.press(getByText('Reset All Data'));

      // Confirm reset
      const alertButtons = require('react-native').Alert.alert.mock.calls[0][2];
      alertButtons[1].onPress(); // Press "Reset"

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: expect.stringContaining('reset')
          })
        );
      });
    });
  });

  describe('PIN Login Dev Mode', () => {
    test('shows dev login buttons for each child', () => {
      const { getByText } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            auth: createMockAuthState({ devModeEnabled: true }),
            child: createMockChildState({
              availableProfiles: mockChildren,
            }),
          },
        }
      );

      mockChildren.forEach(child => {
        expect(getByText(`Dev: Login as ${child.name}`)).toBeTruthy();
      });
    });

    test('dev login bypasses PIN entry', async () => {
      const mockDispatch = jest.fn();
      jest.mocked(require('react-redux').useDispatch).mockReturnValue(mockDispatch);

      const { getByText } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            auth: createMockAuthState({ devModeEnabled: true }),
            child: createMockChildState({
              availableProfiles: mockChildren,
            }),
          },
        }
      );

      fireEvent.press(getByText('Dev: Login as Emma'));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'child/devModeLogin',
          payload: mockChildren[0]
        });
        expect(mockRouter.replace).toHaveBeenCalledWith('/(child)/home');
      });
    });

    test('dev login sets full authentication state', async () => {
      const mockDispatch = jest.fn();
      jest.mocked(require('react-redux').useDispatch).mockReturnValue(mockDispatch);

      const { getByText } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            auth: createMockAuthState({ devModeEnabled: true }),
            child: createMockChildState({
              availableProfiles: mockChildren,
            }),
          },
        }
      );

      fireEvent.press(getByText('Dev: Login as Liam'));

      await waitFor(() => {
        const devLoginAction = mockDispatch.mock.calls.find(
          call => call[0].type === 'child/devModeLogin'
        );
        
        expect(devLoginAction[0].payload).toMatchObject({
          id: 'child-2',
          name: 'Liam',
          age: 10,
          famcoinBalance: expect.any(Number),
        });
      });
    });
  });

  describe('QR Scanner Dev Mode', () => {
    test('shows mock connection button', () => {
      const { getByText } = renderWithProviders(
        <ScannerScreen />,
        {
          preloadedState: {
            auth: createMockAuthState({ devModeEnabled: true }),
          },
        }
      );

      expect(getByText('Dev: Mock Connection')).toBeTruthy();
      expect(getByText(/Scan the QR code/)).toBeTruthy();
    });

    test('mock connection uses test data', async () => {
      const { getByText } = renderWithProviders(
        <ScannerScreen />,
        {
          preloadedState: {
            auth: createMockAuthState({ devModeEnabled: true }),
          },
        }
      );

      fireEvent.press(getByText('Dev: Mock Connection'));

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith({
          pathname: '/(child)/profile-setup',
          params: expect.objectContaining({
            childName: expect.any(String),
            parentId: expect.stringContaining('dev-parent'),
            connectionToken: expect.any(String),
          }),
        });
      });
    });
  });

  describe('Dev Mode Redux Actions', () => {
    test('devModeLogin action sets complete state', () => {
      const initialState = createMockChildState();
      const child = mockChildren[0];

      const action = {
        type: 'child/devModeLogin',
        payload: child,
      };

      // Test the reducer behavior
      const { child: childSlice } = require('../../store/slices/childSlice');
      const newState = childSlice.reducer(initialState, action);

      expect(newState).toMatchObject({
        isAuthenticated: true,
        currentChild: child,
        profile: child,
        childSession: expect.objectContaining({
          childId: child.id,
          expiresAt: expect.any(String),
        }),
      });
    });

    test('dev mode maintains session without expiry', () => {
      const initialState = createMockChildState({
        isAuthenticated: true,
        currentChild: mockChildren[0],
        isDevSession: true,
      });

      // Even with expired time, dev session should remain
      const expiredSession = {
        ...initialState.childSession,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      const { child: childSlice } = require('../../store/slices/childSlice');
      const action = { type: 'child/checkSessionExpiry' };
      
      const newState = childSlice.reducer(
        { ...initialState, childSession: expiredSession },
        action
      );

      // Dev session should remain authenticated
      expect(newState.isAuthenticated).toBe(true);
    });
  });

  describe('Dev Mode Guards', () => {
    test('prevents dev actions in production', () => {
      // Temporarily set to production
      process.env.EXPO_PUBLIC_DEV_MODE = 'false';

      const { queryByText } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            auth: createMockAuthState({ devModeEnabled: false }),
            child: createMockChildState({
              availableProfiles: mockChildren,
            }),
          },
        }
      );

      // Dev login buttons should not appear
      mockChildren.forEach(child => {
        expect(queryByText(`Dev: Login as ${child.name}`)).toBeFalsy();
      });

      // Reset for other tests
      process.env.EXPO_PUBLIC_DEV_MODE = 'true';
    });

    test('dev mode respects feature flags', () => {
      const { queryByTestId } = renderWithProviders(
        <DevModeMenu />,
        {
          preloadedState: {
            auth: createMockAuthState({ 
              devModeEnabled: true,
              // Could have feature flags here
            }),
          },
        }
      );

      // Should still show dev menu with flags
      expect(queryByTestId('dev-mode-trigger')).toBeTruthy();
    });
  });

  describe('Dev Mode Data Creation', () => {
    test('creates consistent test data', async () => {
      const { getTestChildren } = require('../../utils/development');
      const testChildren = getTestChildren();

      expect(testChildren).toHaveLength(2);
      expect(testChildren[0]).toMatchObject({
        name: 'Emma',
        age: 8,
        pin: '1234',
      });
      expect(testChildren[1]).toMatchObject({
        name: 'Liam',
        age: 10,
        pin: '5678',
      });
    });

    test('dev config provides parent ID', () => {
      const { DEV_CONFIG } = require('../../utils/development');
      
      expect(DEV_CONFIG.parentId).toBe('dev-parent-123');
      expect(DEV_CONFIG.testChildren).toHaveLength(2);
    });
  });
});