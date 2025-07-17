import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import ProfileSetupScreen from '../../app/child/profile-setup';
import { renderWithProviders } from '../utils/testHelpers';
import { createMockConnectionState } from '../utils/mockFactories';
import { supabase } from '../../lib/supabase';

// Mock dependencies
jest.mock('../../lib/supabase');

describe('Child Profile Setup', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };

  const mockParams = {
    childName: 'Emma',
    connectionToken: 'token-123',
    parentId: 'parent-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(require('expo-router').useRouter).mockReturnValue(mockRouter);
    jest.mocked(require('expo-router').useLocalSearchParams).mockReturnValue(mockParams);
  });

  describe('Age Selection', () => {
    test('displays age selection correctly', () => {
      const { getByText, getAllByText } = renderWithProviders(
        <ProfileSetupScreen />
      );

      expect(getByText(`Hi ${mockParams.childName}!`)).toBeTruthy();
      expect(getByText("Let's set up your profile")).toBeTruthy();
      expect(getByText('How old are you?')).toBeTruthy();

      // Check age options
      for (let age = 5; age <= 12; age++) {
        expect(getAllByText(age.toString()).length).toBeGreaterThan(0);
      }
    });

    test('allows age selection', () => {
      const { getByText, getByTestId } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Select age 8
      fireEvent.press(getByText('8'));

      // Verify selection is highlighted
      const selectedAge = getByTestId('age-button-8');
      expect(selectedAge.props.style).toMatchObject(
        expect.objectContaining({
          backgroundColor: expect.any(String)
        })
      );
    });

    test('requires age selection before continuing', async () => {
      const { getByText } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Try to continue without selecting age
      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        // Should still be on age selection
        expect(getByText('How old are you?')).toBeTruthy();
      });
    });
  });

  describe('Avatar Selection', () => {
    test('shows avatar options after age selection', async () => {
      const { getByText, getAllByTestId } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Select age
      fireEvent.press(getByText('8'));
      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        expect(getByText('Choose your avatar')).toBeTruthy();
      });

      // Should show multiple avatar options
      const avatars = getAllByTestId(/avatar-option-/);
      expect(avatars.length).toBeGreaterThan(0);
    });

    test('allows avatar selection', async () => {
      const { getByText, getByTestId } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Select age and go to avatar
      fireEvent.press(getByText('8'));
      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        expect(getByText('Choose your avatar')).toBeTruthy();
      });

      // Select an avatar
      fireEvent.press(getByTestId('avatar-option-0'));

      // Verify selection
      const selectedAvatar = getByTestId('avatar-option-0');
      expect(selectedAvatar.props.style).toMatchObject(
        expect.objectContaining({
          borderWidth: expect.any(Number)
        })
      );
    });

    test('can skip avatar selection', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Select age and go to avatar
      fireEvent.press(getByText('8'));
      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        expect(getByText('Choose your avatar')).toBeTruthy();
      });

      // Skip avatar
      fireEvent.press(getByText('Skip'));

      // Should move to focus areas
      await waitFor(() => {
        expect(queryByText('Choose your avatar')).toBeFalsy();
        expect(getByText('What do you want to work on?')).toBeTruthy();
      });
    });
  });

  describe('Focus Areas Selection', () => {
    const focusAreas = [
      { id: 'reading', label: 'Reading', emoji: '📚' },
      { id: 'math', label: 'Math', emoji: '🔢' },
      { id: 'chores', label: 'Chores', emoji: '🧹' },
      { id: 'exercise', label: 'Exercise', emoji: '🏃' },
      { id: 'creativity', label: 'Creativity', emoji: '🎨' },
      { id: 'homework', label: 'Homework', emoji: '📝' },
    ];

    test('displays all focus areas', async () => {
      const { getByText } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Navigate to focus areas
      fireEvent.press(getByText('8'));
      fireEvent.press(getByText('Next'));
      
      await waitFor(() => {
        fireEvent.press(getByText('Skip')); // Skip avatar
      });

      await waitFor(() => {
        expect(getByText('What do you want to work on?')).toBeTruthy();
        focusAreas.forEach(area => {
          expect(getByText(area.label)).toBeTruthy();
          expect(getByText(area.emoji)).toBeTruthy();
        });
      });
    });

    test('allows multiple focus area selection', async () => {
      const { getByText, getByTestId } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Navigate to focus areas
      fireEvent.press(getByText('8'));
      fireEvent.press(getByText('Next'));
      await waitFor(() => {
        fireEvent.press(getByText('Skip'));
      });

      await waitFor(() => {
        expect(getByText('What do you want to work on?')).toBeTruthy();
      });

      // Select multiple areas
      fireEvent.press(getByTestId('focus-area-reading'));
      fireEvent.press(getByTestId('focus-area-chores'));

      // Verify selections
      expect(getByTestId('focus-area-reading').props.style).toMatchObject(
        expect.objectContaining({
          backgroundColor: expect.any(String)
        })
      );
      expect(getByTestId('focus-area-chores').props.style).toMatchObject(
        expect.objectContaining({
          backgroundColor: expect.any(String)
        })
      );
    });
  });

  describe('Profile Completion', () => {
    test('completes profile setup successfully', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'child-123',
                name: mockParams.childName,
                age: 8,
                parentId: mockParams.parentId,
                avatarUrl: 'avatar-1',
                focusAreas: ['reading', 'chores'],
              },
              error: null
            })
          })
        })
      });

      const { getByText, getByTestId } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Complete all steps
      fireEvent.press(getByText('8'));
      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        fireEvent.press(getByTestId('avatar-option-0'));
        fireEvent.press(getByText('Next'));
      });

      await waitFor(() => {
        fireEvent.press(getByTestId('focus-area-reading'));
        fireEvent.press(getByTestId('focus-area-chores'));
        fireEvent.press(getByText('Complete Setup'));
      });

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('children');
        expect(mockRouter.replace).toHaveBeenCalledWith({
          pathname: '/(child)/pin-creation',
          params: expect.objectContaining({
            childId: 'child-123',
            childName: mockParams.childName,
          }),
        });
      });
    });

    test('handles profile creation error', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      });

      const { getByText, getByTestId } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Complete setup
      fireEvent.press(getByText('8'));
      fireEvent.press(getByText('Next'));
      
      await waitFor(() => {
        fireEvent.press(getByText('Skip')); // Skip avatar
      });

      await waitFor(() => {
        fireEvent.press(getByTestId('focus-area-reading'));
        fireEvent.press(getByText('Complete Setup'));
      });

      await waitFor(() => {
        expect(require('react-native').Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('creating profile')
        );
      });
    });
  });

  describe('Navigation', () => {
    test('allows going back between steps', async () => {
      const { getByText, getByTestId, queryByText } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Go to avatar selection
      fireEvent.press(getByText('8'));
      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        expect(getByText('Choose your avatar')).toBeTruthy();
      });

      // Go back to age
      fireEvent.press(getByTestId('back-button'));

      expect(getByText('How old are you?')).toBeTruthy();
      expect(queryByText('Choose your avatar')).toBeFalsy();
    });

    test('disables back button on first step', () => {
      const { queryByTestId } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Back button should not exist on first step
      expect(queryByTestId('back-button')).toBeFalsy();
    });
  });

  describe('Dev Mode', () => {
    test('pre-fills data in dev mode', () => {
      const { getByText } = renderWithProviders(
        <ProfileSetupScreen />,
        {
          preloadedState: {
            auth: { devModeEnabled: true },
          },
        }
      );

      // Dev mode should still show normal flow
      expect(getByText(`Hi ${mockParams.childName}!`)).toBeTruthy();
      expect(getByText('How old are you?')).toBeTruthy();
    });
  });
});