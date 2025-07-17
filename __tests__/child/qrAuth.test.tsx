import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import QRCodeGenerator from '../../components/QRCodeGenerator';
import ScannerScreen from '../../app/child/scanner';
import { renderWithProviders } from '../utils/testHelpers';
import { 
  createMockParent,
  createMockChild,
} from '../utils/mockFactories';
import { supabase } from '../../lib/supabase';
import { Alert } from 'react-native';

// Mock the dependencies
jest.mock('../../lib/supabase');
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
  },
}));

// Mock the development config
jest.mock('../../config/development', () => ({
  isDevMode: jest.fn(() => false), // Default to false, tests can override
  getTestChildren: () => [
    { id: 'child-1', name: 'Emma', age: 8, pin: '1234', parent_id: 'dev-parent-123' },
    { id: 'child-2', name: 'Liam', age: 10, pin: '5678', parent_id: 'dev-parent-123' }
  ],
  DEV_CONFIG: {
    parentId: 'dev-parent-123',
    testChildren: [
      { id: 'child-1', name: 'Emma', age: 8, pin: '1234', parent_id: 'dev-parent-123' },
      { id: 'child-2', name: 'Liam', age: 10, pin: '5678', parent_id: 'dev-parent-123' }
    ]
  }
}));

describe('Child QR Authentication', () => {
  const mockParent = createMockParent();
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (require('expo-router').useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('QRCodeGenerator - Parent Side', () => {
    test('validates all required fields before enabling submit', () => {
      const { getByPlaceholderText, getByText } = renderWithProviders(
        <QRCodeGenerator
          isVisible={true}
          onClose={jest.fn()}
        />
      );

      // Find the touchable containing the Add Child text
      const addButtonContainer = getByText('Add Child').parent;
      
      // Initially disabled
      expect(addButtonContainer?.props.disabled).toBe(true);
      
      // Add name only - still disabled
      fireEvent.changeText(getByPlaceholderText("Enter child's name"), 'Emma');
      expect(addButtonContainer?.props.disabled).toBe(true);
      
      // Add age - still disabled (no focus area)
      fireEvent.changeText(getByPlaceholderText("Enter age (2-18)"), '8');
      expect(addButtonContainer?.props.disabled).toBe(true);
      
      // Select focus area - now enabled
      fireEvent.press(getByText('Education'));
      expect(addButtonContainer?.props.disabled).toBe(false);
    });

    test('creates child profile and shows success', async () => {
      const mockChild = createMockChild({ name: 'Emma', age: 8, focus_areas: ['education'] });
      const onChildCreated = jest.fn();
      
      // Setup mocks for profile check and child creation
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: mockParent,
                  error: null 
                })
              })
            })
          };
        } else if (table === 'children') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: mockChild, 
                  error: null 
                })
              })
            })
          };
        }
      });

      const { getByPlaceholderText, getByText, findByText } = renderWithProviders(
        <QRCodeGenerator
          isVisible={true}
          onClose={jest.fn()}
          onChildCreated={onChildCreated}
        />,
        {
          preloadedState: {
            auth: { user: mockParent, devParentId: mockParent.id },
          },
        }
      );

      // Fill in the form
      fireEvent.changeText(getByPlaceholderText("Enter child's name"), 'Emma');
      fireEvent.changeText(getByPlaceholderText("Enter age (2-18)"), '8');
      fireEvent.press(getByText('Education'));
      fireEvent.press(getByText('Add Child'));

      // Wait for success screen
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('children');
      });

      // Should show success message
      expect(await findByText('Success!')).toBeTruthy();
      expect(await findByText('Emma Added Successfully!')).toBeTruthy();
      
      // Should have called the callback
      expect(onChildCreated).toHaveBeenCalledWith(mockChild);
    });

    test('handles database errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock profile exists but child creation fails
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: mockParent,
                  error: null 
                })
              })
            })
          };
        } else if (table === 'children') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: null, 
                  error: { message: 'Database connection failed' }
                })
              })
            })
          };
        }
      });

      const { getByPlaceholderText, getByText, queryByText } = renderWithProviders(
        <QRCodeGenerator
          isVisible={true}
          onClose={jest.fn()}
        />,
        {
          preloadedState: {
            auth: { user: mockParent, devParentId: mockParent.id },
          },
        }
      );

      // Fill form and submit
      fireEvent.changeText(getByPlaceholderText("Enter child's name"), 'Emma');
      fireEvent.changeText(getByPlaceholderText("Enter age (2-18)"), '8');
      fireEvent.press(getByText('Education'));
      fireEvent.press(getByText('Add Child'));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Database error:', 
          expect.objectContaining({ message: 'Database connection failed' })
        );
      });

      // Should stay on form screen, not show success
      expect(queryByText('Success!')).toBeFalsy();
      expect(getByText('Add Child Info')).toBeTruthy();

      consoleErrorSpy.mockRestore();
    });

    test('creates parent profile if it does not exist', async () => {
      const mockChild = createMockChild({ name: 'Emma', age: 8 });
      
      // Mock profile doesn't exist initially
      let profileExists = false;
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'profiles') {
          if (!profileExists) {
            // First call - profile doesn't exist
            profileExists = true;
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: null,
                    error: { code: 'PGRST116' } // Not found error
                  })
                })
              }),
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: mockParent,
                    error: null 
                  })
                })
              })
            };
          } else {
            // Subsequent calls - profile exists
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: mockParent,
                    error: null 
                  })
                })
              })
            };
          }
        } else if (table === 'children') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: mockChild, 
                  error: null 
                })
              })
            })
          };
        }
      });

      const { getByPlaceholderText, getByText } = renderWithProviders(
        <QRCodeGenerator
          isVisible={true}
          onClose={jest.fn()}
        />,
        {
          preloadedState: {
            auth: { user: mockParent, devParentId: mockParent.id },
          },
        }
      );

      // Fill and submit
      fireEvent.changeText(getByPlaceholderText("Enter child's name"), 'Emma');
      fireEvent.changeText(getByPlaceholderText("Enter age (2-18)"), '8');
      fireEvent.press(getByText('Education'));
      fireEvent.press(getByText('Add Child'));

      await waitFor(() => {
        // Should have tried to create parent profile
        const calls = (supabase.from as jest.Mock).mock.calls;
        const profileCalls = calls.filter(call => call[0] === 'profiles');
        expect(profileCalls.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Scanner Screen - Child Side', () => {
    test('shows camera permission screen when permission not granted', () => {
      const { getByText } = renderWithProviders(
        <ScannerScreen />
      );

      expect(getByText('Camera Permission Required')).toBeTruthy();
      expect(getByText('We need camera access to scan QR codes from your parent')).toBeTruthy();
      expect(getByText('Grant Permission')).toBeTruthy();
    });

    test('shows alert when trying to grant permission without device', () => {
      const { getByText } = renderWithProviders(
        <ScannerScreen />
      );

      fireEvent.press(getByText('Grant Permission'));
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Scanner Disabled',
        'Scanner requires a physical device with camera'
      );
    });

    test('shows dev mode button when dev mode is enabled', () => {
      const { isDevMode } = require('../../config/development');
      (isDevMode as jest.Mock).mockReturnValue(true);

      const { getByText } = renderWithProviders(
        <ScannerScreen />
      );

      expect(getByText('Scan QR Code')).toBeTruthy();
      expect(getByText('Dev: Mock Connection')).toBeTruthy();
    });

    test('dev mode mock connection shows welcome screen', async () => {
      const { isDevMode } = require('../../config/development');
      (isDevMode as jest.Mock).mockReturnValue(true);

      const { getByText, findByText } = renderWithProviders(
        <ScannerScreen />
      );

      fireEvent.press(getByText('Dev: Mock Connection'));

      // Should show welcome screen with test child name
      expect(await findByText(/Welcome Emma!/)).toBeTruthy();
      expect(await findByText('Continue Setup')).toBeTruthy();
    });

    test('navigates to profile setup after mock connection', async () => {
      const { isDevMode } = require('../../config/development');
      (isDevMode as jest.Mock).mockReturnValue(true);

      const { getByText, findByText } = renderWithProviders(
        <ScannerScreen />
      );

      fireEvent.press(getByText('Dev: Mock Connection'));
      
      // Wait for welcome screen
      const continueButton = await findByText('Continue Setup');
      fireEvent.press(continueButton);

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/child/profile-setup',
        params: expect.objectContaining({
          token: expect.any(String),
          childName: 'Emma',
          parentId: expect.any(String),
        }),
      });
    });

    test('back button returns to home screen', () => {
      const { getAllByLabelText } = renderWithProviders(
        <ScannerScreen />
      );

      // Find the back button (ArrowLeft icon)
      const backButtons = getAllByLabelText('Icon');
      // The first icon should be the back button
      fireEvent.press(backButtons[0]);

      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });
  });
});