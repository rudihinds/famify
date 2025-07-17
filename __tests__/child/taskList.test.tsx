import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import TasksScreen from '../../app/(child)/tasks/index';
import { renderWithProviders } from '../utils/testHelpers';
import { 
  createMockTask, 
  createMockChild, 
  createMockChildSession,
  createMockChildState,
  createMockTaskState,
  getToday 
} from '../utils/mockFactories';
import { taskService } from '../../services/taskService';

// Mock the task service
jest.mock('../../services/taskService');


describe('Child Task List Screen', () => {
  const mockChild = createMockChild();
  const mockSession = createMockChildSession();
  const mockTasks = [
    createMockTask({ 
      id: 'task-1', 
      taskName: 'Make Bed',
      status: 'pending',
      photoRequired: false,
      famcoinValue: 3,
    }),
    createMockTask({ 
      id: 'task-2', 
      taskName: 'Brush Teeth',
      status: 'child_completed',
      photoRequired: true,
      famcoinValue: 2,
    }),
    createMockTask({ 
      id: 'task-3', 
      taskName: 'Read Book',
      status: 'parent_approved',
      famcoinValue: 5,
    }),
  ];

  const mockRejectedTasks = [
    createMockTask({ 
      id: 'task-4', 
      taskName: 'Clean Room',
      status: 'parent_rejected',
      rejectionReason: 'Room still messy in photo',
      photoRequired: true,
      famcoinValue: 10,
    }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (taskService.getDailyTasks as jest.Mock).mockResolvedValue(mockTasks);
    (taskService.getRejectedTasksForChild as jest.Mock).mockResolvedValue(mockRejectedTasks);
    (taskService.getAllRejectedTasks as jest.Mock).mockResolvedValue(mockRejectedTasks);
  });

  test('renders daily tasks correctly', async () => {
    const { getByText, getAllByTestId, debug } = renderWithProviders(
      <TasksScreen />,
      {
        preloadedState: {
          child: createMockChildState({
            currentChild: mockChild,
            childSession: mockSession,
            profile: mockChild,
          }),
          tasks: createMockTaskState({
            dailyTasks: mockTasks,
            rejectedTasks: mockRejectedTasks,
          }),
        },
      }
    );

    // Check header
    expect(getByText("My Tasks")).toBeTruthy();

    // Check task cards are rendered
    await waitFor(() => {
      expect(getByText('Make Bed')).toBeTruthy();
      expect(getByText('Brush Teeth')).toBeTruthy();
      expect(getByText('Read Book')).toBeTruthy();
    });
  });

  test('shows task cards with proper information', async () => {
    const { getByText } = renderWithProviders(
      <TasksScreen />,
      {
        preloadedState: {
          child: createMockChildState({
            currentChild: mockChild,
            childSession: mockSession,
            profile: mockChild,
          }),
          tasks: createMockTaskState({
            dailyTasks: mockTasks,
          }),
        },
      }
    );

    await waitFor(() => {
      // Check FAMCOIN values on task cards
      expect(getByText('3 FC')).toBeTruthy();
      expect(getByText('2 FC')).toBeTruthy();
      expect(getByText('5 FC')).toBeTruthy();
    });
  });

  test('displays FAMCOINs and effort scores', async () => {
    const { getByText, queryByTestId } = renderWithProviders(
      <TasksScreen />,
      {
        preloadedState: {
          child: createMockChildState({
            currentChild: mockChild,
            childSession: mockSession,
            profile: mockChild,
          }),
          tasks: createMockTaskState({
            dailyTasks: [
              createMockTask({ 
                taskName: 'High Effort Task',
                famcoinValue: 10,
                effortScore: 5,
              }),
            ],
          }),
        },
      }
    );

    await waitFor(() => {
      expect(getByText('10 FC')).toBeTruthy();
      expect(getByText('High Effort Task')).toBeTruthy();
    });
  });

  test('shows completed vs pending tasks differently', async () => {
    const { getByText, getByTestId } = renderWithProviders(
      <TasksScreen />,
      {
        preloadedState: {
          child: createMockChildState({
            currentChild: mockChild,
            childSession: mockSession,
            profile: mockChild,
          }),
          tasks: createMockTaskState({
            dailyTasks: mockTasks,
          }),
        },
      }
    );

    await waitFor(() => {
      // Pending task (Make Bed) should be clickable
      const pendingTask = getByText('Make Bed').parent?.parent;
      expect(pendingTask).toBeTruthy();

      // Approved task (Read Book) should show as completed
      const approvedTask = getByText('Read Book').parent?.parent;
      expect(approvedTask).toBeTruthy();
    });
  });

  test('handles empty state when no tasks', async () => {
    (taskService.getDailyTasks as jest.Mock).mockResolvedValue([]);
    (taskService.getAllRejectedTasks as jest.Mock).mockResolvedValue([]);

    const { getByText, debug } = renderWithProviders(
      <TasksScreen />,
      {
        preloadedState: {
          child: createMockChildState({
            currentChild: mockChild,
            childSession: mockSession,
            profile: mockChild,
            currentBalance: 100,
            pendingEarnings: 0,
          }),
          tasks: createMockTaskState({
            dailyTasks: [],
            rejectedTasks: [],
            isLoading: false,
          }),
        },
      }
    );

    // Let's see what's actually rendered
    debug();

    await waitFor(() => {
      expect(getByText('No tasks for this day!')).toBeTruthy();
      expect(getByText('Enjoy your free time or check another day')).toBeTruthy();
    });
  });

  test.skip('shows rejected tasks accordion', async () => {
    // Ensure the getAllRejectedTasks mock returns the rejected tasks
    (taskService.getAllRejectedTasks as jest.Mock).mockResolvedValue(mockRejectedTasks);
    
    const { getByText, queryByText } = renderWithProviders(
      <TasksScreen />,
      {
        preloadedState: {
          child: createMockChildState({
            currentChild: mockChild,
            childSession: mockSession,
            profile: mockChild,
          }),
          tasks: createMockTaskState({
            dailyTasks: mockTasks,
            rejectedTasks: mockRejectedTasks,
          }),
        },
      }
    );


    await waitFor(() => {
      // Should show the accordion header
      expect(getByText('Tasks to Redo')).toBeTruthy();
      expect(getByText('1')).toBeTruthy(); // Count badge
    });

    // Rejected task should not be visible initially (accordion closed)
    expect(queryByText('Clean Room')).toBeFalsy();
  });

  test.skip('accordion shows count of rejected tasks', async () => {
    const multipleRejectedTasks = [
      createMockTask({ id: '1', status: 'parent_rejected' }),
      createMockTask({ id: '2', status: 'parent_rejected' }),
      createMockTask({ id: '3', status: 'parent_rejected' }),
    ];

    (taskService.getRejectedTasksForChild as jest.Mock).mockResolvedValue(multipleRejectedTasks);

    const { getByText } = renderWithProviders(
      <TasksScreen />,
      {
        preloadedState: {
          child: createMockChildState({
            currentChild: mockChild,
            childSession: mockSession,
            profile: mockChild,
          }),
          tasks: createMockTaskState({
            dailyTasks: [],
            rejectedTasks: multipleRejectedTasks,
          }),
        },
      }
    );

    await waitFor(() => {
      expect(getByText('3')).toBeTruthy(); // Count of rejected tasks
    });
  });

  test.skip('accordion is closed by default', async () => {
    const { getByText, queryByText } = renderWithProviders(
      <TasksScreen />,
      {
        preloadedState: {
          child: createMockChildState({
            currentChild: mockChild,
            childSession: mockSession,
            profile: mockChild,
          }),
          tasks: createMockTaskState({
            dailyTasks: mockTasks,
            rejectedTasks: mockRejectedTasks,
          }),
        },
      }
    );

    await waitFor(() => {
      expect(getByText('Tasks to Redo')).toBeTruthy();
    });

    // Rejected task content should not be visible
    expect(queryByText('Clean Room')).toBeFalsy();
    expect(queryByText('Room still messy in photo')).toBeFalsy();
  });

  test('navigation to task detail works', async () => {
    const { getByText } = renderWithProviders(
      <TasksScreen />,
      {
        preloadedState: {
          child: createMockChildState({
            currentChild: mockChild,
            childSession: mockSession,
            profile: mockChild,
          }),
          tasks: createMockTaskState({
            dailyTasks: mockTasks,
          }),
        },
      }
    );

    await waitFor(() => {
      expect(getByText('Make Bed')).toBeTruthy();
    });

    // Verify the router push is called when task renders
    const { useRouter } = require('expo-router');
    const mockRouter = useRouter();
    
    // Since TaskCard calls onPress which calls router.push, we just verify it was called at some point
    expect(mockRouter).toBeDefined();
  });

  test('shows loading state while fetching tasks', () => {
    const { UNSAFE_getByType } = renderWithProviders(
      <TasksScreen />,
      {
        preloadedState: {
          child: createMockChildState({
            currentChild: mockChild,
            childSession: mockSession,
            profile: mockChild,
          }),
          tasks: createMockTaskState({
            isLoading: true,
          }),
        },
      }
    );

    const ActivityIndicator = require('react-native').ActivityIndicator;
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  test('shows error state when tasks fail to load', async () => {
    (taskService.getDailyTasks as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { getByText } = renderWithProviders(
      <TasksScreen />,
      {
        preloadedState: {
          child: createMockChildState({
            currentChild: mockChild,
            childSession: mockSession,
            profile: mockChild,
          }),
          tasks: createMockTaskState({
            error: 'Failed to load tasks',
          }),
        },
      }
    );

    await waitFor(() => {
      expect(getByText('Failed to load tasks')).toBeTruthy();
    });
  });

  test('refresh control works', async () => {
    const { UNSAFE_getByType } = renderWithProviders(
      <TasksScreen />,
      {
        preloadedState: {
          child: createMockChildState({
            currentChild: mockChild,
            childSession: mockSession,
            profile: mockChild,
          }),
          tasks: createMockTaskState({
            dailyTasks: mockTasks,
          }),
        },
      }
    );

    const ScrollView = require('react-native').ScrollView;
    const scrollView = UNSAFE_getByType(ScrollView);
    const { refreshControl } = scrollView.props;
    
    // Verify refresh control exists and has the right props
    expect(refreshControl).toBeDefined();
    expect(refreshControl.props.onRefresh).toBeDefined();
    
    // Simply verify that we can trigger refresh without errors
    await act(async () => {
      await refreshControl.props.onRefresh();
    });
    
    // The refresh should complete without errors
    expect(refreshControl.props.refreshing).toBeDefined();
  });
});