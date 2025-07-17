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

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
  },
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => mockRouter,
}));

jest.mock('../../config/development', () => ({
  isDevMode: jest.fn(() => false),
  getTestChildren: () => [
    { id: 'child-1', name: 'Emma', age: 8, pin: '1234', parent_id: 'dev-parent-123' },
  ],
  DEV_CONFIG: {
    parentId: 'dev-parent-123',
  }
}));

describe('Parent Adding Child - Behavioral Tests', () => {
  const mockParent = createMockParent();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Parent can add a new child to their account', () => {
    test('parent must provide all required information before adding child', async () => {
      const onChildCreated = jest.fn();
      
      const { getByPlaceholderText, getByText } = renderWithProviders(
        <QRCodeGenerator
          isVisible={true}
          onClose={jest.fn()}
          onChildCreated={onChildCreated}
        />
      );

      const addButton = getByText('Add Child');

      // Parent tries to submit without filling form
      fireEvent.press(addButton);
      
      // Nothing should happen - callback not called
      expect(onChildCreated).not.toHaveBeenCalled();

      // Parent fills in name
      fireEvent.changeText(getByPlaceholderText("Enter child's name"), 'Emma');
      
      // Still can't submit - need age and focus area
      fireEvent.press(addButton);
      expect(onChildCreated).not.toHaveBeenCalled();

      // Parent adds age
      fireEvent.changeText(getByPlaceholderText("Enter age (2-18)"), '8');
      
      // Still can't submit - need focus area
      fireEvent.press(addButton);
      expect(onChildCreated).not.toHaveBeenCalled();

      // Parent selects what child will work on
      fireEvent.press(getByText('Education'));

      // Mock successful creation
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
                  data: createMockChild({ name: 'Emma', age: 8 }), 
                  error: null 
                })
              })
            })
          };
        }
      });

      // Now parent can submit
      fireEvent.press(addButton);

      // Child should be created
      await waitFor(() => {
        expect(onChildCreated).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Emma',
            age: 8,
          })
        );
      });
    });

    test('parent sees confirmation when child is successfully added', async () => {
      // Setup successful creation
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
                  data: createMockChild({ name: 'Emma' }), 
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
        />,
        {
          preloadedState: {
            auth: { user: mockParent, devParentId: mockParent.id },
          },
        }
      );

      // Parent fills in complete form
      fireEvent.changeText(getByPlaceholderText("Enter child's name"), 'Emma');
      fireEvent.changeText(getByPlaceholderText("Enter age (2-18)"), '8');
      fireEvent.press(getByText('Education'));
      fireEvent.press(getByText('Add Child'));

      // Parent should see success confirmation
      await waitFor(() => {
        expect(findByText(/Emma Added Successfully/)).toBeTruthy();
      });
    });

    test('parent is informed when adding child fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Setup failure scenario
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
                  error: { message: 'Network error - please try again' }
                })
              })
            })
          };
        }
      });

      const onClose = jest.fn();
      const { getByPlaceholderText, getByText, queryByText } = renderWithProviders(
        <QRCodeGenerator
          isVisible={true}
          onClose={onClose}
        />,
        {
          preloadedState: {
            auth: { user: mockParent, devParentId: mockParent.id },
          },
        }
      );

      // Parent fills form
      fireEvent.changeText(getByPlaceholderText("Enter child's name"), 'Emma');
      fireEvent.changeText(getByPlaceholderText("Enter age (2-18)"), '8');
      fireEvent.press(getByText('Education'));
      fireEvent.press(getByText('Add Child'));

      await waitFor(() => {
        // Should not show success
        expect(queryByText(/Emma Added Successfully/)).toBeFalsy();
        // Should still be on form
        expect(getByText('Add Child Info')).toBeTruthy();
      });

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('Child Device Setup - Behavioral Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Child needs camera permission to scan QR code', () => {
    test('child sees permission request when trying to scan', () => {
      const { getByText } = renderWithProviders(
        <ScannerScreen />
      );

      // Child should see why camera is needed
      expect(getByText('Camera Permission Required')).toBeTruthy();
      expect(getByText(/camera access to scan QR codes/)).toBeTruthy();
      
      // Child should have option to grant permission
      expect(getByText('Grant Permission')).toBeTruthy();
    });

    test('child is informed when scanner requires physical device', () => {
      const { getByText } = renderWithProviders(
        <ScannerScreen />
      );

      // Child tries to grant permission
      fireEvent.press(getByText('Grant Permission'));
      
      // Should inform about device requirement (in test environment)
      expect(Alert.alert).toHaveBeenCalledWith(
        'Scanner Disabled',
        expect.stringContaining('physical device')
      );
    });
  });

  describe('Developer can bypass QR scanning in dev mode', () => {
    test('developer sees mock connection option when dev mode enabled', () => {
      const { isDevMode } = require('../../config/development');
      (isDevMode as jest.Mock).mockReturnValue(true);

      const { getByText } = renderWithProviders(
        <ScannerScreen />
      );

      // Developer should see bypass option
      expect(getByText('Dev: Mock Connection')).toBeTruthy();
    });

    test('developer can simulate child connection flow', async () => {
      const { isDevMode } = require('../../config/development');
      (isDevMode as jest.Mock).mockReturnValue(true);

      const { getByText, findByText } = renderWithProviders(
        <ScannerScreen />
      );

      // Developer uses mock connection
      fireEvent.press(getByText('Dev: Mock Connection'));

      // Should see simulated welcome screen
      const welcomeText = await findByText(/Welcome Emma!/);
      expect(welcomeText).toBeTruthy();
      
      // Can continue to profile setup
      expect(await findByText('Continue Setup')).toBeTruthy();
    });

    test('developer bypasses navigate to profile setup', async () => {
      const { isDevMode } = require('../../config/development');
      (isDevMode as jest.Mock).mockReturnValue(true);

      const { getByText, findByText } = renderWithProviders(
        <ScannerScreen />
      );

      // Use mock connection
      fireEvent.press(getByText('Dev: Mock Connection'));
      
      // Continue from welcome
      const continueButton = await findByText('Continue Setup');
      fireEvent.press(continueButton);

      // Should navigate to profile setup with test data
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/child/profile-setup',
        params: expect.objectContaining({
          childName: 'Emma', // From test data
          token: expect.any(String),
          parentId: expect.any(String),
        }),
      });
    });
  });
});