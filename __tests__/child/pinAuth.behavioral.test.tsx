import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
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


// Mock Alert directly
const mockAlert = jest.fn();

describe('Child PIN Authentication - Behavioral Tests', () => {
  const mockChild = createMockChild();
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };

  const mockChildState = createMockChildState({
    profile: mockChild,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    
    // Debug: Let's see what Alert is
    console.log('Alert:', Alert);
    
    jest.mocked(require('expo-router').useRouter).mockReturnValue(mockRouter);
    jest.mocked(require('expo-router').useLocalSearchParams).mockReturnValue({
      childId: mockChild.id,
      childName: mockChild.name,
      parentId: mockChild.parent_id,
    });
  });

  describe('Child creates secure PIN for device access', () => {
    test('child must enter PIN twice to confirm they remember it', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <PinCreationScreen />,
        {
          preloadedState: {
            child: mockChildState,
          },
        }
      );

      // Child enters a PIN using numeric keypad
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('3'));
      fireEvent.press(getByText('5'));
      fireEvent.press(getByText('7'));

      // Child must confirm the PIN
      await waitFor(() => {
        expect(getByText('Confirm Your PIN')).toBeTruthy();
        expect(queryByText('Create Your PIN')).toBeFalsy(); // Step has changed
      });

      // Child enters same PIN again
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('3'));
      fireEvent.press(getByText('5'));
      fireEvent.press(getByText('7'));

      // PIN should be created automatically after 4 digits
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/child');
      });
    });

    test('child is prevented from creating easily guessable PINs', async () => {
      const { getByText } = renderWithProviders(
        <PinCreationScreen />,
        {
          preloadedState: {
            child: mockChildState,
          },
        }
      );

      // Child tries to use sequential PIN
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('2'));
      fireEvent.press(getByText('3'));
      fireEvent.press(getByText('4'));

      // Child should be informed PIN is not secure
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Invalid PIN',
          expect.stringContaining('sequential')
        );
      });
    });

    test('child is prevented from creating PIN with same digits', async () => {
      const { getByText } = renderWithProviders(
        <PinCreationScreen />,
        {
          preloadedState: {
            child: mockChildState,
          },
        }
      );

      // Child tries to use repeated digits
      fireEvent.press(getByText('7'));
      fireEvent.press(getByText('7'));
      fireEvent.press(getByText('7'));
      fireEvent.press(getByText('7'));

      // Child should be informed PIN is not secure
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Invalid PIN',
          expect.stringContaining('same digit')
        );
      });
    });

    test('child must re-enter PIN if confirmation does not match', async () => {
      const { getByText } = renderWithProviders(
        <PinCreationScreen />,
        {
          preloadedState: {
            child: mockChildState,
          },
        }
      );

      // Child enters initial PIN
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('3'));
      fireEvent.press(getByText('5'));
      fireEvent.press(getByText('7'));

      await waitFor(() => {
        expect(getByText('Confirm Your PIN')).toBeTruthy();
      });

      // Child enters different PIN
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('3'));
      fireEvent.press(getByText('5'));
      fireEvent.press(getByText('8'));

      // Child should be told PINs don't match
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          "PINs Don't Match",
          expect.stringContaining("PINs don't match")
        );
      });
    });

    test('child can access their tasks after successfully creating PIN', async () => {
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

      const { getByText } = renderWithProviders(
        <PinCreationScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              profile: mockChild,
            }),
          },
        }
      );

      // Child creates valid PIN
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('3'));
      fireEvent.press(getByText('5'));
      fireEvent.press(getByText('7'));
      
      await waitFor(() => {
        expect(getByText('Confirm Your PIN')).toBeTruthy();
      });

      // Child confirms PIN
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('3'));
      fireEvent.press(getByText('5'));
      fireEvent.press(getByText('7'));

      // Child should be taken to their task dashboard
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/child');
      });
    });
  });

  describe('Child uses PIN to access their account', () => {
    test('child can log in with correct PIN', async () => {
      const mockHashedPin = 'hashed-pin-123';
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(mockHashedPin);
      
      // Mock successful PIN verification
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

      const { getByText } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            child: mockChildState,
          },
        }
      );

      // Child enters correct PIN
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('3'));
      fireEvent.press(getByText('5'));
      fireEvent.press(getByText('7'));

      // Child should be taken to their task dashboard
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/child');
      });
    });

    test('child is told when PIN is incorrect and how many attempts remain', async () => {
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

      const { getByText } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            child: mockChildState,
          },
        }
      );

      // Child enters wrong PIN
      fireEvent.press(getByText('9'));
      fireEvent.press(getByText('9'));
      fireEvent.press(getByText('9'));
      fireEvent.press(getByText('9'));

      // Child should be told PIN is wrong and attempts remaining
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Incorrect PIN',
          expect.stringContaining('2 attempts remaining')
        );
      });
    });

    test('child is temporarily locked out after too many wrong attempts', async () => {
      const { getByText } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              ...mockChildState,
              pinAttempts: 2, // Already failed twice
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

      // Child enters wrong PIN for third time
      fireEvent.press(getByText('9'));
      fireEvent.press(getByText('9'));
      fireEvent.press(getByText('9'));
      fireEvent.press(getByText('9'));

      // Child should be told they're locked out
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Account Locked',
          expect.stringContaining('locked for 5 minutes')
        );
      });
    });

    test('child can still access account when internet is down', async () => {
      // Mock offline scenario
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockRejectedValue(new Error('Network error'))
        })
      });

      // Mock saved PIN for offline access
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({
          pin: '1357',
          childId: mockChild.id,
          lastSync: new Date().toISOString()
        })
      );

      const { getByText } = renderWithProviders(
        <PinLoginScreen />,
        {
          preloadedState: {
            child: mockChildState,
          },
        }
      );

      // Child enters correct PIN
      fireEvent.press(getByText('1'));
      fireEvent.press(getByText('3'));
      fireEvent.press(getByText('5'));
      fireEvent.press(getByText('7'));

      // Child should still be able to access their account
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/child');
      });
    });
  });

  describe('Developer can test child features without PIN hassle', () => {
    test.skip('developer can quickly log in as test child', async () => {
      // Dev mode UI not implemented yet
    });

    test.skip('developer login gives full access to child features', async () => {
      // Dev mode UI not implemented yet
    });
  });
});