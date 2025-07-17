import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { renderWithProviders } from '../utils/testHelpers';
import { 
  createMockParent,
  createMockChild,
  createMockAuthState,
  createMockParentState,
  createMockConnectionState,
  createMockTaskState,
  createMockChildState
} from '../utils/mockFactories';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('expo-secure-store');
jest.mock('expo-router');

// Components to test
import SelectChildScreen from '../../app/sequence-creation/select-child';
import SequenceSettingsScreen from '../../app/sequence-creation/sequence-settings';
import GroupsSetupScreen from '../../app/sequence-creation/groups-setup';
import AddTasksScreen from '../../app/sequence-creation/add-tasks/[groupId]';
import ReviewCreateScreen from '../../app/sequence-creation/review-create';

// Mock Alert
const mockAlert = jest.fn();
Alert.alert = mockAlert;

describe('Parent Task Creation and Scheduling - Behavioral Tests', () => {
  const mockParent = createMockParent();
  const mockChild1 = createMockChild({ id: 'child-1', name: 'Emma' });
  const mockChild2 = createMockChild({ id: 'child-2', name: 'Liam' });
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };

  const mockAuthState = createMockAuthState({
    user: { id: mockParent.id },
    session: { user: { id: mockParent.id } }
  });

  const mockParentState = createMockParentState({
    profile: mockParent,
    children: [mockChild1, mockChild2],
  });

  const mockSequenceCreationState = {
    selectedChildId: null,
    sequenceSettings: {
      period: 'weekly',
      startDate: new Date().toISOString().split('T')[0],
      budgetCurrency: 10,
      budgetFamcoins: 100,
    },
    groups: [],
    selectedTasksByGroup: {},
    currentStep: 1,
    isLoading: false,
    error: null,
    validationErrors: {},
    isEditing: false,
    editingSequenceId: null,
  };

  const basePreloadedState = {
    auth: mockAuthState,
    parent: mockParentState,
    child: createMockChildState(),
    tasks: createMockTaskState(),
    connection: createMockConnectionState(),
    sequenceCreation: mockSequenceCreationState,
    sequences: {
      activeSequences: [],
      isLoading: false,
      error: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    
    jest.mocked(require('expo-router').useRouter).mockReturnValue(mockRouter);
    jest.mocked(require('expo-router').useLocalSearchParams).mockReturnValue({});
  });

  describe('Parent creates a new task sequence for their child', () => {
    test('parent selects which child to create sequence for', async () => {
      const { getByText } = renderWithProviders(
        <SelectChildScreen />,
        { preloadedState: basePreloadedState }
      );

      // Parent sees both children available
      expect(getByText('Emma')).toBeTruthy();
      expect(getByText('Liam')).toBeTruthy();

      // Parent selects Emma
      fireEvent.press(getByText('Emma'));
      fireEvent.press(getByText('Continue'));

      // Should proceed to sequence settings
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/sequence-creation/sequence-settings');
      });
    });

    test('parent is warned if child already has active sequence', async () => {
      const stateWithActiveSequence = {
        ...basePreloadedState,
        sequences: {
          activeSequences: [{
            id: 'seq-1',
            child_id: 'child-1',
            status: 'active',
            child_name: 'Emma',
          }],
          isLoading: false,
          error: null,
        },
      };

      const { getByText } = renderWithProviders(
        <SelectChildScreen />,
        { preloadedState: stateWithActiveSequence }
      );

      // Parent selects Emma who has active sequence
      fireEvent.press(getByText('Emma'));
      fireEvent.press(getByText('Continue'));

      // Parent should be warned about existing sequence
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Active Sequence Found',
          expect.stringContaining('Emma already has an active sequence')
        );
      });
    });

    test('parent configures sequence settings with automatic FAMCOIN calculation', async () => {
      const stateWithSelectedChild = {
        ...basePreloadedState,
        sequenceCreation: {
          ...mockSequenceCreationState,
          selectedChildId: 'child-1',
          currentStep: 2,
        },
      };

      const { getByText, getByTestId } = renderWithProviders(
        <SequenceSettingsScreen />,
        { preloadedState: stateWithSelectedChild }
      );

      // Parent sets budget to $20
      const budgetInput = getByTestId('budget-input');
      fireEvent.changeText(budgetInput, '20');

      // Should automatically calculate FAMCOINS at 10:1 ratio
      await waitFor(() => {
        expect(getByText('200 FAMCOINS')).toBeTruthy();
      });

      // Parent continues to next step
      fireEvent.press(getByText('Continue'));

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/sequence-creation/groups-setup');
      });
    });

    test('parent creates task groups with specific active days', async () => {
      const stateWithSettings = {
        ...basePreloadedState,
        sequenceCreation: {
          ...mockSequenceCreationState,
          selectedChildId: 'child-1',
          currentStep: 3,
          sequenceSettings: {
            ...mockSequenceCreationState.sequenceSettings,
            budgetCurrency: 20,
            budgetFamcoins: 200,
          },
        },
      };

      const { getByText, getByTestId } = renderWithProviders(
        <GroupsSetupScreen />,
        { preloadedState: stateWithSettings }
      );

      // Parent creates "Morning Routine" group
      fireEvent.press(getByText('Add Group'));
      
      const groupNameInput = getByTestId('group-name-input');
      fireEvent.changeText(groupNameInput, 'Morning Routine');

      // Parent selects Monday, Wednesday, Friday
      fireEvent.press(getByText('Mon'));
      fireEvent.press(getByText('Wed'));
      fireEvent.press(getByText('Fri'));

      fireEvent.press(getByText('Save Group'));

      // Group should be created with selected days
      await waitFor(() => {
        expect(getByText('Morning Routine')).toBeTruthy();
        expect(getByText('Mon, Wed, Fri')).toBeTruthy();
      });

      // Parent continues to task assignment
      fireEvent.press(getByText('Continue'));

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/sequence-creation/add-tasks/group-1');
      });
    });

    test('parent assigns tasks to groups from available templates', async () => {
      const stateWithGroups = {
        ...basePreloadedState,
        sequenceCreation: {
          ...mockSequenceCreationState,
          selectedChildId: 'child-1',
          currentStep: 4,
          groups: [{
            id: 'group-1',
            name: 'Morning Routine',
            activeDays: [1, 3, 5], // Mon, Wed, Fri
          }],
        },
      };

      // Mock task templates
      const mockTaskTemplates = [
        {
          id: 'template-1',
          name: 'Make bed',
          category_name: 'Chores',
          effort_score: 2,
          photo_proof_required: false,
        },
        {
          id: 'template-2',
          name: 'Brush teeth',
          category_name: 'Health',
          effort_score: 1,
          photo_proof_required: false,
        },
      ];

      jest.mocked(require('../../lib/supabase').supabase.from).mockReturnValue({
        select: jest.fn().mockReturnValue({
          data: mockTaskTemplates,
          error: null,
        }),
      });

      const { getByText, getByTestId } = renderWithProviders(
        <AddTasksScreen />,
        { 
          preloadedState: stateWithGroups,
        }
      );

      // Parent sees available task templates
      await waitFor(() => {
        expect(getByText('Make bed')).toBeTruthy();
        expect(getByText('Brush teeth')).toBeTruthy();
      });

      // Parent selects tasks for the group
      fireEvent.press(getByText('Make bed'));
      fireEvent.press(getByText('Brush teeth'));

      // Parent continues to next group or review
      fireEvent.press(getByText('Continue'));

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/sequence-creation/review-create');
      });
    });

    test('parent creates custom task template when existing ones are not suitable', async () => {
      const stateWithGroups = {
        ...basePreloadedState,
        sequenceCreation: {
          ...mockSequenceCreationState,
          selectedChildId: 'child-1',
          currentStep: 4,
          groups: [{
            id: 'group-1',
            name: 'Morning Routine',
            activeDays: [1, 3, 5],
          }],
        },
      };

      const { getByText, getByTestId } = renderWithProviders(
        <AddTasksScreen />,
        { preloadedState: stateWithGroups }
      );

      // Parent clicks to create custom task
      fireEvent.press(getByText('Create Custom Task'));

      // Parent fills in custom task details
      const taskNameInput = getByTestId('custom-task-name');
      const taskDescriptionInput = getByTestId('custom-task-description');
      
      fireEvent.changeText(taskNameInput, 'Practice piano');
      fireEvent.changeText(taskDescriptionInput, 'Practice piano for 20 minutes');

      // Parent sets effort score
      fireEvent.press(getByText('3')); // Effort score 3

      // Parent requires photo proof
      fireEvent.press(getByTestId('photo-proof-toggle'));

      // Parent saves custom task
      fireEvent.press(getByText('Save Custom Task'));

      // Custom task should be created and selected
      await waitFor(() => {
        expect(getByText('Practice piano')).toBeTruthy();
        expect(getByText('Photo required')).toBeTruthy();
      });
    });

    test('parent reviews and creates complete sequence with FAMCOIN distribution', async () => {
      const stateWithTasks = {
        ...basePreloadedState,
        sequenceCreation: {
          ...mockSequenceCreationState,
          selectedChildId: 'child-1',
          currentStep: 5,
          sequenceSettings: {
            period: 'weekly',
            startDate: '2024-01-15',
            budgetCurrency: 20,
            budgetFamcoins: 200,
          },
          groups: [{
            id: 'group-1',
            name: 'Morning Routine',
            activeDays: [1, 3, 5], // 3 days per week
          }],
          selectedTasksByGroup: {
            'group-1': ['template-1', 'template-2'], // 2 tasks
          },
        },
      };

      const { getByText } = renderWithProviders(
        <ReviewCreateScreen />,
        { preloadedState: stateWithTasks }
      );

      // Parent sees sequence summary
      expect(getByText('Emma\'s Task Sequence')).toBeTruthy();
      expect(getByText('Morning Routine')).toBeTruthy();
      expect(getByText('Mon, Wed, Fri')).toBeTruthy();

      // Should show FAMCOIN calculation
      // 2 tasks × 3 days × 1 week = 6 total completions
      // 200 FAMCOINS ÷ 6 completions = 33 FAMCOINS per task
      expect(getByText('33 FAMCOINS per task')).toBeTruthy();

      // Parent creates the sequence
      fireEvent.press(getByText('Create Sequence'));

      // Should redirect to parent dashboard
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/(parent)');
      });
    });
  });

  describe('Parent manages existing sequences', () => {
    test('parent can edit an existing sequence', async () => {
      const stateWithActiveSequence = {
        ...basePreloadedState,
        sequences: {
          activeSequences: [{
            id: 'seq-1',
            child_id: 'child-1',
            child_name: 'Emma',
            status: 'active',
            start_date: '2024-01-15',
            end_date: '2024-01-21',
            budget_currency: 20,
            budget_famcoins: 200,
          }],
          isLoading: false,
          error: null,
        },
      };

      const { getByText } = renderWithProviders(
        <SelectChildScreen />,
        { preloadedState: stateWithActiveSequence }
      );

      // Parent selects Emma who has active sequence
      fireEvent.press(getByText('Emma'));
      fireEvent.press(getByText('Continue'));

      // Parent chooses to edit existing sequence
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Active Sequence Found',
          expect.stringContaining('Emma already has an active sequence'),
          expect.arrayContaining([
            expect.objectContaining({ text: 'Edit Existing' }),
            expect.objectContaining({ text: 'Create New' }),
          ])
        );
      });

      // Simulate choosing "Edit Existing"
      const editButton = mockAlert.mock.calls[0][2].find(btn => btn.text === 'Edit Existing');
      editButton.onPress();

      // Should load sequence for editing
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/sequence-creation/sequence-settings');
      });
    });

    test('parent can pause and resume a sequence', async () => {
      const stateWithActiveSequence = {
        ...basePreloadedState,
        sequences: {
          activeSequences: [{
            id: 'seq-1',
            child_id: 'child-1',
            child_name: 'Emma',
            status: 'active',
          }],
          isLoading: false,
          error: null,
        },
      };

      // This would be tested in a sequence management screen
      // The test would verify pause/resume functionality
    });
  });

  describe('System handles edge cases gracefully', () => {
    test('parent is prevented from creating sequence without tasks', async () => {
      const stateWithEmptyGroup = {
        ...basePreloadedState,
        sequenceCreation: {
          ...mockSequenceCreationState,
          selectedChildId: 'child-1',
          currentStep: 5,
          groups: [{
            id: 'group-1',
            name: 'Morning Routine',
            activeDays: [1, 3, 5],
          }],
          selectedTasksByGroup: {
            'group-1': [], // No tasks selected
          },
        },
      };

      const { getByText } = renderWithProviders(
        <ReviewCreateScreen />,
        { preloadedState: stateWithEmptyGroup }
      );

      // Parent tries to create sequence without tasks
      fireEvent.press(getByText('Create Sequence'));

      // Should show validation error
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Validation Error',
          expect.stringContaining('All groups must have at least one task')
        );
      });
    });

    test('parent is warned about budget being too low for meaningful rewards', async () => {
      const stateWithLowBudget = {
        ...basePreloadedState,
        sequenceCreation: {
          ...mockSequenceCreationState,
          selectedChildId: 'child-1',
          currentStep: 2,
        },
      };

      const { getByText, getByTestId } = renderWithProviders(
        <SequenceSettingsScreen />,
        { preloadedState: stateWithLowBudget }
      );

      // Parent sets very low budget
      const budgetInput = getByTestId('budget-input');
      fireEvent.changeText(budgetInput, '0.50');

      // Should warn about low per-task reward
      await waitFor(() => {
        expect(getByText('Warning: Very low reward per task')).toBeTruthy();
      });
    });

    test('system handles network errors during sequence creation', async () => {
      const stateWithTasks = {
        ...basePreloadedState,
        sequenceCreation: {
          ...mockSequenceCreationState,
          selectedChildId: 'child-1',
          currentStep: 5,
          groups: [{
            id: 'group-1',
            name: 'Morning Routine',
            activeDays: [1, 3, 5],
          }],
          selectedTasksByGroup: {
            'group-1': ['template-1'],
          },
        },
      };

      // Mock network error
      jest.mocked(require('../../lib/supabase').supabase.from).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          error: new Error('Network error'),
        }),
      });

      const { getByText } = renderWithProviders(
        <ReviewCreateScreen />,
        { preloadedState: stateWithTasks }
      );

      // Parent tries to create sequence
      fireEvent.press(getByText('Create Sequence'));

      // Should show error message
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('Failed to create sequence')
        );
      });
    });
  });

  describe('FAMCOIN calculation works correctly for complex schedules', () => {
    test('calculates correct FAMCOIN distribution for multiple groups with different schedules', async () => {
      const stateWithComplexSchedule = {
        ...basePreloadedState,
        sequenceCreation: {
          ...mockSequenceCreationState,
          selectedChildId: 'child-1',
          currentStep: 5,
          sequenceSettings: {
            period: 'weekly',
            startDate: '2024-01-15',
            budgetCurrency: 35,
            budgetFamcoins: 350,
          },
          groups: [
            {
              id: 'group-1',
              name: 'Morning Routine',
              activeDays: [1, 2, 3, 4, 5], // Weekdays = 5 days
            },
            {
              id: 'group-2',
              name: 'Weekend Tasks',
              activeDays: [6, 7], // Weekend = 2 days
            },
          ],
          selectedTasksByGroup: {
            'group-1': ['template-1', 'template-2'], // 2 tasks
            'group-2': ['template-3'], // 1 task
          },
        },
      };

      const { getByText } = renderWithProviders(
        <ReviewCreateScreen />,
        { preloadedState: stateWithComplexSchedule }
      );

      // Total completions: (2 tasks × 5 days) + (1 task × 2 days) = 12 completions
      // 350 FAMCOINS ÷ 12 completions = 29 FAMCOINS per task
      expect(getByText('29 FAMCOINS per task')).toBeTruthy();
      expect(getByText('12 total task completions')).toBeTruthy();
    });

    test('handles monthly sequences with proper completion counting', async () => {
      const stateWithMonthlySequence = {
        ...basePreloadedState,
        sequenceCreation: {
          ...mockSequenceCreationState,
          selectedChildId: 'child-1',
          currentStep: 5,
          sequenceSettings: {
            period: 'monthly',
            startDate: '2024-01-01',
            budgetCurrency: 100,
            budgetFamcoins: 1000,
          },
          groups: [{
            id: 'group-1',
            name: 'Daily Tasks',
            activeDays: [1, 2, 3, 4, 5, 6, 7], // Every day
          }],
          selectedTasksByGroup: {
            'group-1': ['template-1'], // 1 task
          },
        },
      };

      const { getByText } = renderWithProviders(
        <ReviewCreateScreen />,
        { preloadedState: stateWithMonthlySequence }
      );

      // January 2024 has 31 days
      // 1 task × 31 days = 31 completions
      // 1000 FAMCOINS ÷ 31 completions = 32 FAMCOINS per task
      expect(getByText('32 FAMCOINS per task')).toBeTruthy();
      expect(getByText('31 total task completions')).toBeTruthy();
    });
  });
});