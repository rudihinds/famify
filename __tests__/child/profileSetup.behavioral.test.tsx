import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import ProfileSetupScreen from '../../app/child/profile-setup';
import { renderWithProviders } from '../utils/testHelpers';
import { supabase } from '../../lib/supabase';

// Mock dependencies
jest.mock('../../lib/supabase');

describe('Child Profile Setup - Behavioral Tests', () => {
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

  describe('Child personalizes their account after connecting to parent', () => {
    test('child is welcomed by name and guided through setup', () => {
      const { getByText } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Child should see personal welcome
      expect(getByText(`Hi ${mockParams.childName}!`)).toBeTruthy();
      expect(getByText("Let's set up your profile")).toBeTruthy();
      
      // Child should see clear next step
      expect(getByText('How old are you?')).toBeTruthy();
    });

    test('child must select their age before continuing', async () => {
      const { getByText } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Child tries to skip age selection
      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        // Child should still be on age selection
        expect(getByText('How old are you?')).toBeTruthy();
      });
    });

    test('child sees age options appropriate for the app', () => {
      const { getAllByText } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Child should see reasonable age range
      for (let age = 5; age <= 12; age++) {
        expect(getAllByText(age.toString()).length).toBeGreaterThan(0);
      }
    });

    test('child can see their age selection is confirmed', () => {
      const { getByText, getByTestId } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Child selects their age
      fireEvent.press(getByText('8'));

      // Child should see visual confirmation of selection
      const selectedAge = getByTestId('age-button-8');
      expect(selectedAge.props.style).toMatchObject(
        expect.objectContaining({
          backgroundColor: expect.any(String)
        })
      );
    });

    test('child can choose an avatar or skip to continue', async () => {
      const { getByText, getAllByTestId } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Child completes age selection
      fireEvent.press(getByText('8'));
      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        expect(getByText('Choose your avatar')).toBeTruthy();
      });

      // Child should see avatar choices
      const avatars = getAllByTestId(/avatar-option-/);
      expect(avatars.length).toBeGreaterThan(0);
      
      // Child should be able to skip if they want
      expect(getByText('Skip')).toBeTruthy();
    });

    test('child can change their mind and go back to previous steps', async () => {
      const { getByText, getByTestId, queryByText } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Child goes to avatar selection
      fireEvent.press(getByText('8'));
      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        expect(getByText('Choose your avatar')).toBeTruthy();
      });

      // Child decides to go back
      fireEvent.press(getByTestId('back-button'));

      // Child should be back at age selection
      expect(getByText('How old are you?')).toBeTruthy();
      expect(queryByText('Choose your avatar')).toBeFalsy();
    });

    test('child selects what they want to work on', async () => {
      const { getByText, getByTestId } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Child navigates to focus areas
      fireEvent.press(getByText('8'));
      fireEvent.press(getByText('Next'));
      
      await waitFor(() => {
        fireEvent.press(getByText('Skip')); // Skip avatar
      });

      await waitFor(() => {
        expect(getByText('What do you want to work on?')).toBeTruthy();
      });

      // Child should see different areas they can focus on
      expect(getByText('Reading')).toBeTruthy();
      expect(getByText('Math')).toBeTruthy();
      expect(getByText('Chores')).toBeTruthy();
      expect(getByText('Exercise')).toBeTruthy();

      // Child can select multiple areas
      fireEvent.press(getByTestId('focus-area-reading'));
      fireEvent.press(getByTestId('focus-area-chores'));

      // Child should see visual confirmation of selections
      expect(getByTestId('focus-area-reading').props.style).toMatchObject(
        expect.objectContaining({
          backgroundColor: expect.any(String)
        })
      );
    });

    test('child can complete setup and start using the app', async () => {
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

      // Child completes all setup steps
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

      // Child should be taken to create their security PIN
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith({
          pathname: '/(child)/pin-creation',
          params: expect.objectContaining({
            childId: 'child-123',
            childName: mockParams.childName,
          }),
        });
      });
    });

    test('child is informed when setup fails and can try again', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Network connection failed' }
            })
          })
        })
      });

      const { getByText, getByTestId } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Child attempts to complete setup
      fireEvent.press(getByText('8'));
      fireEvent.press(getByText('Next'));
      
      await waitFor(() => {
        fireEvent.press(getByText('Skip')); // Skip avatar
      });

      await waitFor(() => {
        fireEvent.press(getByTestId('focus-area-reading'));
        fireEvent.press(getByText('Complete Setup'));
      });

      // Child should be told setup failed and can try again
      await waitFor(() => {
        expect(require('react-native').Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('creating profile')
        );
      });
    });
  });

  describe('Setup process is intuitive and child-friendly', () => {
    test('child cannot proceed without making required selections', async () => {
      const { getByText } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Child tries to skip age selection
      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        // Should still be on age selection
        expect(getByText('How old are you?')).toBeTruthy();
      });
    });

    test('child can skip optional steps like avatar selection', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Child completes age and skips avatar
      fireEvent.press(getByText('8'));
      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        expect(getByText('Choose your avatar')).toBeTruthy();
      });

      fireEvent.press(getByText('Skip'));

      // Child should move to next step
      await waitFor(() => {
        expect(queryByText('Choose your avatar')).toBeFalsy();
        expect(getByText('What do you want to work on?')).toBeTruthy();
      });
    });

    test('child cannot go back on the first step', () => {
      const { queryByTestId } = renderWithProviders(
        <ProfileSetupScreen />
      );

      // Back button should not exist on first step
      expect(queryByTestId('back-button')).toBeFalsy();
    });
  });
});