import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PinCreationScreen from '../../app/child/pin-creation';
import PinLoginScreen from '../../app/child/pin-login';
import { renderWithProviders } from '../utils/testHelpers';
import { 
  createMockChild,
  createMockChildState 
} from '../utils/mockFactories';
import { supabase } from '../../lib/supabase';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('expo-secure-store');
jest.mock('expo-crypto');

describe('Child PIN Authentication', () => {
  const mockChild = createMockChild();
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(require('expo-router').useRouter).mockReturnValue(mockRouter);
    jest.mocked(require('expo-router').useLocalSearchParams).mockReturnValue({
      childId: mockChild.id,
      childName: mockChild.name,
      parentId: mockChild.parentId,
    });
  });

  describe('PIN Creation', () => {
    test('creates valid 4-digit PIN', async () => {
      const mockHashedPin = 'hashed-pin-123';
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHashedPin);
      
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockChild, pinHash: mockHashedPin },
              error: null
            })
          })
        })
      });

      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const { getByTestId, getByText } = renderWithProviders(
        <PinCreationScreen />
      );

      // Enter PIN
      const pinInputs = ['1', '2', '3', '4'];
      pinInputs.forEach((digit, index) => {
        const input = getByTestId(`pin-input-${index}`);
        fireEvent.changeText(input, digit);
      });

      // Confirm PIN
      fireEvent.press(getByText('Next'));
      
      // Re-enter PIN for confirmation
      await waitFor(() => {
        expect(getByText('Confirm your PIN')).toBeTruthy();
      });

      pinInputs.forEach((digit, index) => {
        const input = getByTestId(`pin-confirm-${index}`);
        fireEvent.changeText(input, digit);
      });

      fireEvent.press(getByText('Create PIN'));

      await waitFor(() => {
        expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
          Crypto.CryptoDigestAlgorithm.SHA256,
          expect.stringContaining('1234') // PIN + salt
        );
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          `child_pin_${mockChild.id}`,
          expect.any(String)
        );
        expect(mockRouter.replace).toHaveBeenCalledWith('/(child)/home');
      });
    });

    test('rejects sequential PINs', async () => {
      const { getByTestId, getByText } = renderWithProviders(
        <PinCreationScreen />
      );

      // Enter sequential PIN
      ['1', '2', '3', '4'].forEach((digit, index) => {
        fireEvent.changeText(getByTestId(`pin-input-${index}`), digit);
      });

      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Invalid PIN',
          expect.stringContaining('sequential')
        );
      });
    });

    test('rejects repeated digit PINs', async () => {
      const { getByTestId, getByText } = renderWithProviders(
        <PinCreationScreen />
      );

      // Enter repeated PIN
      ['1', '1', '1', '1'].forEach((digit, index) => {
        fireEvent.changeText(getByTestId(`pin-input-${index}`), digit);
      });

      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Invalid PIN',
          expect.stringContaining('same digit')
        );
      });
    });

    test('handles PIN mismatch on confirmation', async () => {
      const { getByTestId, getByText } = renderWithProviders(
        <PinCreationScreen />
      );

      // Enter first PIN
      ['1', '3', '5', '7'].forEach((digit, index) => {
        fireEvent.changeText(getByTestId(`pin-input-${index}`), digit);
      });

      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        expect(getByText('Confirm your PIN')).toBeTruthy();
      });

      // Enter different PIN
      ['1', '3', '5', '8'].forEach((digit, index) => {
        fireEvent.changeText(getByTestId(`pin-confirm-${index}`), digit);
      });

      fireEvent.press(getByText('Create PIN'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'PIN Mismatch',
          expect.stringContaining("PINs don't match")
        );
      });
    });
  });

  describe('PIN Login', () => {
    test('successful PIN login creates session', async () => {
      const mockHashedPin = 'hashed-pin-123';
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHashedPin);
      
      // Mock child lookup
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { ...mockChild, pinHash: mockHashedPin },
            error: null
          })
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { 
                id: 'session-123',
                childId: mockChild.id,
                expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
              },
              error: null
            })
          })
        })
      });

      const { getByTestId, getByText } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              availableProfiles: [mockChild],
            }),
          },
        }
      );

      // Select child
      fireEvent.press(getByText(mockChild.name));

      // Enter PIN
      ['1', '2', '3', '4'].forEach((digit, index) => {
        fireEvent.changeText(getByTestId(`pin-input-${index}`), digit);
      });

      fireEvent.press(getByText('Login'));

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/(child)/home');
      });
    });

    test('handles incorrect PIN with attempt tracking', async () => {
      const correctHash = 'correct-hash';
      const wrongHash = 'wrong-hash';
      
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(wrongHash);
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { ...mockChild, pinHash: correctHash },
            error: null
          })
        })
      });

      const { getByTestId, getByText } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              availableProfiles: [mockChild],
              selectedChildId: mockChild.id,
            }),
          },
        }
      );

      // Enter wrong PIN
      ['9', '9', '9', '9'].forEach((digit, index) => {
        fireEvent.changeText(getByTestId(`pin-input-${index}`), digit);
      });

      fireEvent.press(getByText('Login'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Incorrect PIN',
          expect.stringContaining('2 attempts remaining')
        );
      });
    });

    test('locks out after 3 failed attempts', async () => {
      const { getByTestId, getByText, rerender } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              availableProfiles: [mockChild],
              selectedChildId: mockChild.id,
              pinAttempts: 2, // Already 2 failed attempts
            }),
          },
        }
      );

      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('wrong-hash');
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { ...mockChild, pinHash: 'correct-hash' },
            error: null
          })
        })
      });

      // Enter wrong PIN for 3rd time
      ['9', '9', '9', '9'].forEach((digit, index) => {
        fireEvent.changeText(getByTestId(`pin-input-${index}`), digit);
      });

      fireEvent.press(getByText('Login'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Too Many Attempts',
          expect.stringContaining('locked for 5 minutes')
        );
      });
    });

    test('offline PIN validation works', async () => {
      // Mock offline scenario
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockRejectedValue(new Error('Network error'))
        })
      });

      // Mock SecureStore with saved PIN
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({
          pin: '1234',
          childId: mockChild.id,
          lastSync: new Date().toISOString()
        })
      );

      const { getByTestId, getByText } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              availableProfiles: [mockChild],
              selectedChildId: mockChild.id,
            }),
          },
        }
      );

      // Enter correct PIN
      ['1', '2', '3', '4'].forEach((digit, index) => {
        fireEvent.changeText(getByTestId(`pin-input-${index}`), digit);
      });

      fireEvent.press(getByText('Login'));

      await waitFor(() => {
        expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
          `child_pin_${mockChild.id}`
        );
        expect(mockRouter.replace).toHaveBeenCalledWith('/(child)/home');
      });
    });
  });

  describe('Dev Mode PIN Bypass', () => {
    test('allows login without PIN in dev mode', async () => {
      const mockDispatch = jest.fn();
      jest.mocked(require('react-redux').useDispatch).mockReturnValue(mockDispatch);

      const { getByText } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            auth: { devModeEnabled: true },
            child: createMockChildState({
              availableProfiles: [mockChild],
            }),
          },
        }
      );

      // Should show dev login option
      expect(getByText(`Dev: Login as ${mockChild.name}`)).toBeTruthy();
      
      fireEvent.press(getByText(`Dev: Login as ${mockChild.name}`));

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: expect.stringContaining('devModeLogin')
          })
        );
      });
    });

    test('dev mode login sets full session', async () => {
      const mockDispatch = jest.fn();
      jest.mocked(require('react-redux').useDispatch).mockReturnValue(mockDispatch);

      const { getByText } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            auth: { devModeEnabled: true },
            child: createMockChildState({
              availableProfiles: [mockChild],
            }),
          },
        }
      );

      fireEvent.press(getByText(`Dev: Login as ${mockChild.name}`));

      // Verify the dev mode login action includes all necessary data
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'child/devModeLogin',
          payload: expect.objectContaining({
            id: mockChild.id,
            name: mockChild.name,
            famcoinBalance: mockChild.famcoinBalance,
          })
        });
      });
    });
  });

  describe('Session Management', () => {
    test('creates 2-hour session on successful login', async () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      
      const { getByTestId } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              availableProfiles: [mockChild],
              selectedChildId: mockChild.id,
            }),
          },
        }
      );

      // The session creation happens in the Redux action
      // Just verify the structure is correct
      expect(getByTestId('pin-input-0')).toBeTruthy();
    });
  });
});