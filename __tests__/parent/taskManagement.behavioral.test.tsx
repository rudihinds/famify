import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { renderWithProviders } from '../utils/testHelpers';
import { 
  createMockParent,
  createMockChild,
  createMockAuthState,
  createMockParentState,
  createMockTask,
  createMockTaskCompletion,
  createMockTaskState,
  createMockChildState,
  createMockConnectionState
} from '../utils/mockFactories';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('expo-secure-store');
jest.mock('expo-router');
jest.mock('expo-image-picker');

// Components to test
import ParentReviewScreen from '../../app/(parent)/reviews';
import TaskReviewModal from '../../components/TaskReviewModal';

// Mock Alert
const mockAlert = jest.fn();
Alert.alert = mockAlert;

describe('Parent Task Management - Behavioral Tests', () => {
  const mockParent = createMockParent();
  const mockChild = createMockChild({ id: 'child-1', name: 'Emma' });
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
    children: [mockChild],
    pendingApprovalCount: 5,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    
    jest.mocked(require('expo-router').useRouter).mockReturnValue(mockRouter);
    jest.mocked(require('expo-router').useLocalSearchParams).mockReturnValue({});
  });

  describe('Parent reviews and approves child task completions', () => {
    test('parent sees all pending tasks requiring approval', async () => {
      const mockPendingTasks = [
        createMockTaskCompletion({
          id: 'completion-1',
          task: createMockTask({
            taskName: 'Make bed',
            categoryName: 'Chores',
            photoRequired: false,
          }),
          childId: 'child-1',
          status: 'child_completed',
          completedAt: new Date().toISOString(),
        }),
        createMockTaskCompletion({
          id: 'completion-2',
          task: createMockTask({
            taskName: 'Take photo of clean room',
            categoryName: 'Chores',
            photoRequired: true,
          }),
          childId: 'child-1',
          status: 'child_completed',
          completedAt: new Date().toISOString(),
          photoUrl: 'https://example.com/photo.jpg',
        }),
      ];

      const mockTaskState = createMockTaskState({
        parentReviewTasks: mockPendingTasks,
        isLoading: false,
      });

      const { getByText } = renderWithProviders(
        <ParentReviewScreen />,
        {
          preloadedState: {
            auth: mockAuthState,
            parent: mockParentState,
            child: createMockChildState(),
            tasks: mockTaskState,
            connection: createMockConnectionState(),
            sequenceCreation: {},
            sequences: { activeSequences: [], isLoading: false, error: null },
          },
        }
      );

      // Parent should see pending tasks
      await waitFor(() => {
        expect(getByText('Make bed')).toBeTruthy();
        expect(getByText('Take photo of clean room')).toBeTruthy();
        expect(getByText('5 tasks pending')).toBeTruthy();
      });
    });

    test('parent can approve task without photo proof', async () => {
      const mockTask = createMockTaskCompletion({
        id: 'completion-1',
        task: createMockTask({
          taskName: 'Make bed',
          categoryName: 'Chores',
          photoRequired: false,
          famcoinValue: 5,
        }),
        childId: 'child-1',
        status: 'child_completed',
        completedAt: new Date().toISOString(),
      });

      const mockTaskState = createMockTaskState({
        parentReviewTasks: [mockTask],
        isLoading: false,
      });

      const { getByText, getByTestId } = renderWithProviders(
        <ParentReviewScreen />,
        {
          preloadedState: {
            auth: mockAuthState,
            parent: mockParentState,
            child: createMockChildState(),
            tasks: mockTaskState,
            connection: createMockConnectionState(),
            sequenceCreation: {},
            sequences: { activeSequences: [], isLoading: false, error: null },
          },
        }
      );

      // Parent clicks on task to review
      fireEvent.press(getByText('Make bed'));

      // Task review modal should open
      await waitFor(() => {
        expect(getByText('Review Task')).toBeTruthy();
        expect(getByText('Emma completed this task')).toBeTruthy();
      });

      // Parent approves the task
      fireEvent.press(getByTestId('approve-button'));

      // Should show success message
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Task Approved',
          expect.stringContaining('Emma earned 5 FAMCOINS')
        );
      });
    });

    test('parent can review task with photo proof before approving', async () => {
      const mockTask = createMockTaskCompletion({
        id: 'completion-1',
        task: createMockTask({
          taskName: 'Clean room',
          categoryName: 'Chores',
          photoRequired: true,
          famcoinValue: 10,
        }),
        childId: 'child-1',
        status: 'child_completed',
        completedAt: new Date().toISOString(),
        photoUrl: 'https://example.com/room-photo.jpg',
      });

      const mockTaskState = createMockTaskState({
        parentReviewTasks: [mockTask],
        isLoading: false,
      });

      const { getByText, getByTestId } = renderWithProviders(
        <ParentReviewScreen />,
        {
          preloadedState: {
            auth: mockAuthState,
            parent: mockParentState,
            child: createMockChildState(),
            tasks: mockTaskState,
            connection: createMockConnectionState(),
            sequenceCreation: {},
            sequences: { activeSequences: [], isLoading: false, error: null },
          },
        }
      );

      // Parent clicks on task to review
      fireEvent.press(getByText('Clean room'));

      // Should show photo proof
      await waitFor(() => {
        expect(getByText('Photo Proof Required')).toBeTruthy();
        expect(getByTestId('task-photo')).toBeTruthy();
      });

      // Parent approves after viewing photo
      fireEvent.press(getByTestId('approve-button'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Task Approved',
          expect.stringContaining('Emma earned 10 FAMCOINS')
        );
      });
    });

    test('parent can reject task with feedback', async () => {
      const mockTask = createMockTaskCompletion({
        id: 'completion-1',
        task: createMockTask({
          taskName: 'Clean room',
          categoryName: 'Chores',
          photoRequired: true,
        }),
        childId: 'child-1',
        status: 'child_completed',
        completedAt: new Date().toISOString(),
        photoUrl: 'https://example.com/messy-room.jpg',
      });

      const mockTaskState = createMockTaskState({
        parentReviewTasks: [mockTask],
        isLoading: false,
      });

      const { getByText, getByTestId } = renderWithProviders(
        <ParentReviewScreen />,
        {
          preloadedState: {
            auth: mockAuthState,
            parent: mockParentState,
            child: createMockChildState(),
            tasks: mockTaskState,
            connection: createMockConnectionState(),
            sequenceCreation: {},
            sequences: { activeSequences: [], isLoading: false, error: null },
          },
        }
      );

      // Parent clicks on task to review
      fireEvent.press(getByText('Clean room'));

      // Parent rejects the task
      fireEvent.press(getByTestId('reject-button'));

      // Should show feedback input
      await waitFor(() => {
        expect(getByText('Provide feedback')).toBeTruthy();
      });

      // Parent provides feedback
      const feedbackInput = getByTestId('feedback-input');
      fireEvent.changeText(feedbackInput, 'Room is still messy. Please organize your desk and make the bed.');

      fireEvent.press(getByText('Submit Feedback'));

      // Should show rejection confirmation
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Task Rejected',
          expect.stringContaining('Emma can try again')
        );
      });
    });

    test('parent can bulk approve multiple tasks', async () => {
      const mockTasks = [
        createMockTaskCompletion({
          id: 'completion-1',
          task: createMockTask({ taskName: 'Make bed', famcoinValue: 5 }),
          status: 'child_completed',
        }),
        createMockTaskCompletion({
          id: 'completion-2',
          task: createMockTask({ taskName: 'Brush teeth', famcoinValue: 3 }),
          status: 'child_completed',
        }),
        createMockTaskCompletion({
          id: 'completion-3',
          task: createMockTask({ taskName: 'Pack backpack', famcoinValue: 4 }),
          status: 'child_completed',
        }),
      ];

      const mockTaskState = createMockTaskState({
        parentReviewTasks: mockTasks,
        isLoading: false,
      });

      const { getByText, getByTestId } = renderWithProviders(
        <ParentReviewScreen />,
        {
          preloadedState: {
            auth: mockAuthState,
            parent: mockParentState,
            child: createMockChildState(),
            tasks: mockTaskState,
            connection: createMockConnectionState(),
            sequenceCreation: {},
            sequences: { activeSequences: [], isLoading: false, error: null },
          },
        }
      );

      // Parent selects multiple tasks
      fireEvent.press(getByTestId('select-task-completion-1'));
      fireEvent.press(getByTestId('select-task-completion-2'));
      fireEvent.press(getByTestId('select-task-completion-3'));

      // Parent clicks bulk approve
      fireEvent.press(getByText('Approve Selected'));

      // Should show bulk approval confirmation
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Bulk Approval',
          expect.stringContaining('3 tasks approved'),
          expect.stringContaining('Emma earned 12 FAMCOINS')
        );
      });
    });

    test('parent can complete task on behalf of child', async () => {
      const mockTask = createMockTaskCompletion({
        id: 'completion-1',
        task: createMockTask({
          taskName: 'Take vitamins',
          categoryName: 'Health',
          photoRequired: false,
          famcoinValue: 2,
        }),
        childId: 'child-1',
        status: 'pending',
        dueDate: new Date().toISOString(),
      });

      const mockTaskState = createMockTaskState({
        parentReviewTasks: [mockTask],
        isLoading: false,
      });

      const { getByText, getByTestId } = renderWithProviders(
        <ParentReviewScreen />,
        {
          preloadedState: {
            auth: mockAuthState,
            parent: mockParentState,
            child: createMockChildState(),
            tasks: mockTaskState,
            connection: createMockConnectionState(),
            sequenceCreation: {},
            sequences: { activeSequences: [], isLoading: false, error: null },
          },
        }
      );

      // Parent clicks on pending task
      fireEvent.press(getByText('Take vitamins'));

      // Parent completes task on behalf of child
      fireEvent.press(getByTestId('complete-on-behalf-button'));

      // Should show confirmation
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Task Completed',
          expect.stringContaining('Completed on behalf of Emma'),
          expect.stringContaining('Emma earned 2 FAMCOINS')
        );
      });
    });

    test('parent can excuse a task without penalty', async () => {
      const mockTask = createMockTaskCompletion({
        id: 'completion-1',
        task: createMockTask({
          taskName: 'Go for a walk',
          categoryName: 'Outdoor',
          photoRequired: false,
          famcoinValue: 8,
        }),
        childId: 'child-1',
        status: 'pending',
        dueDate: new Date().toISOString(),
      });

      const mockTaskState = createMockTaskState({
        parentReviewTasks: [mockTask],
        isLoading: false,
      });

      const { getByText, getByTestId } = renderWithProviders(
        <ParentReviewScreen />,
        {
          preloadedState: {
            auth: mockAuthState,
            parent: mockParentState,
            child: createMockChildState(),
            tasks: mockTaskState,
            connection: createMockConnectionState(),
            sequenceCreation: {},
            sequences: { activeSequences: [], isLoading: false, error: null },
          },
        }
      );

      // Parent clicks on pending task
      fireEvent.press(getByText('Go for a walk'));

      // Parent excuses the task (e.g., due to bad weather)
      fireEvent.press(getByTestId('excuse-task-button'));

      // Should ask for reason
      await waitFor(() => {
        expect(getByText('Reason for excusing task')).toBeTruthy();
      });

      const reasonInput = getByTestId('excuse-reason-input');
      fireEvent.changeText(reasonInput, 'Raining heavily today');

      fireEvent.press(getByText('Excuse Task'));

      // Should show excuse confirmation
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Task Excused',
          expect.stringContaining('Emma will not be penalized')
        );
      });
    });
  });

  describe('Parent manages rejected tasks', () => {
    test('parent can view all rejected tasks that need attention', async () => {
      const mockRejectedTasks = [
        createMockTaskCompletion({
          id: 'completion-1',
          task: createMockTask({
            taskName: 'Clean room',
            categoryName: 'Chores',
          }),
          childId: 'child-1',
          status: 'parent_rejected',
          rejectedAt: new Date().toISOString(),
          rejectionReason: 'Room is still messy',
          feedback: 'Please organize your desk and make the bed.',
        }),
        createMockTaskCompletion({
          id: 'completion-2',
          task: createMockTask({
            taskName: 'Read for 30 minutes',
            categoryName: 'Education',
          }),
          childId: 'child-1',
          status: 'parent_rejected',
          rejectedAt: new Date().toISOString(),
          rejectionReason: 'Insufficient time',
          feedback: 'Please read for the full 30 minutes.',
        }),
      ];

      const mockTaskState = createMockTaskState({
        rejectedTasks: mockRejectedTasks,
        isLoading: false,
      });

      const { getByText } = renderWithProviders(
        <ParentReviewScreen />,
        {
          preloadedState: {
            auth: mockAuthState,
            parent: mockParentState,
            child: createMockChildState(),
            tasks: mockTaskState,
            connection: createMockConnectionState(),
            sequenceCreation: {},
            sequences: { activeSequences: [], isLoading: false, error: null },
          },
        }
      );

      // Switch to rejected tasks tab
      fireEvent.press(getByText('Rejected Tasks'));

      // Should show rejected tasks with feedback
      await waitFor(() => {
        expect(getByText('Clean room')).toBeTruthy();
        expect(getByText('Room is still messy')).toBeTruthy();
        expect(getByText('Read for 30 minutes')).toBeTruthy();
        expect(getByText('Insufficient time')).toBeTruthy();
      });
    });

    test('parent can clear rejection status to allow child to retry', async () => {
      const mockRejectedTask = createMockTaskCompletion({
        id: 'completion-1',
        task: createMockTask({
          taskName: 'Clean room',
          categoryName: 'Chores',
        }),
        childId: 'child-1',
        status: 'parent_rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason: 'Room is still messy',
        feedback: 'Please organize your desk and make the bed.',
      });

      const mockTaskState = createMockTaskState({
        rejectedTasks: [mockRejectedTask],
        isLoading: false,
      });

      const { getByText, getByTestId } = renderWithProviders(
        <ParentReviewScreen />,
        {
          preloadedState: {
            auth: mockAuthState,
            parent: mockParentState,
            child: createMockChildState(),
            tasks: mockTaskState,
            connection: createMockConnectionState(),
            sequenceCreation: {},
            sequences: { activeSequences: [], isLoading: false, error: null },
          },
        }
      );

      // Switch to rejected tasks tab
      fireEvent.press(getByText('Rejected Tasks'));

      // Parent clicks on rejected task
      fireEvent.press(getByText('Clean room'));

      // Parent clears rejection to allow retry
      fireEvent.press(getByTestId('clear-rejection-button'));

      // Should show confirmation
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Rejection Cleared',
          expect.stringContaining('Emma can now retry this task')
        );
      });
    });
  });

  describe('Parent tracks task completion patterns', () => {
    test('parent can view completion statistics for their child', async () => {
      const mockStats = {
        totalTasks: 50,
        completedTasks: 42,
        approvedTasks: 38,
        rejectedTasks: 4,
        completionRate: 84,
        famcoinsEarned: 156,
        streakDays: 5,
      };

      const mockTaskState = createMockTaskState({
        completionStats: mockStats,
        isLoading: false,
      });

      const { getByText } = renderWithProviders(
        <ParentReviewScreen />,
        {
          preloadedState: {
            auth: mockAuthState,
            parent: mockParentState,
            child: createMockChildState(),
            tasks: mockTaskState,
            connection: createMockConnectionState(),
            sequenceCreation: {},
            sequences: { activeSequences: [], isLoading: false, error: null },
          },
        }
      );

      // Switch to statistics tab
      fireEvent.press(getByText('Statistics'));

      // Should show completion statistics
      await waitFor(() => {
        expect(getByText('84% completion rate')).toBeTruthy();
        expect(getByText('156 FAMCOINS earned')).toBeTruthy();
        expect(getByText('5 day streak')).toBeTruthy();
        expect(getByText('38 tasks approved')).toBeTruthy();
        expect(getByText('4 tasks rejected')).toBeTruthy();
      });
    });

    test('parent can see which task categories child excels at', async () => {
      const mockCategoryStats = [
        { categoryName: 'Chores', completionRate: 95, tasksCompleted: 19 },
        { categoryName: 'Health', completionRate: 88, tasksCompleted: 15 },
        { categoryName: 'Education', completionRate: 75, tasksCompleted: 12 },
        { categoryName: 'Outdoor', completionRate: 60, tasksCompleted: 6 },
      ];

      const mockTaskState = createMockTaskState({
        categoryStats: mockCategoryStats,
        isLoading: false,
      });

      const { getByText } = renderWithProviders(
        <ParentReviewScreen />,
        {
          preloadedState: {
            auth: mockAuthState,
            parent: mockParentState,
            child: createMockChildState(),
            tasks: mockTaskState,
            connection: createMockConnectionState(),
            sequenceCreation: {},
            sequences: { activeSequences: [], isLoading: false, error: null },
          },
        }
      );

      // Switch to category insights tab
      fireEvent.press(getByText('Category Insights'));

      // Should show category performance
      await waitFor(() => {
        expect(getByText('Chores: 95%')).toBeTruthy();
        expect(getByText('Health: 88%')).toBeTruthy();
        expect(getByText('Education: 75%')).toBeTruthy();
        expect(getByText('Outdoor: 60%')).toBeTruthy();
      });

      // Should highlight strongest category
      expect(getByText('Strongest: Chores')).toBeTruthy();
      expect(getByText('Needs attention: Outdoor')).toBeTruthy();
    });
  });
});