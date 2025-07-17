import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import ParentReviewsScreen from '../../app/(parent)/reviews';
import { renderWithProviders } from '../utils/testHelpers';
import { 
  createMockTask, 
  createMockParent,
  createMockChild,
  createMockTaskCompletion,
  getToday,
  getYesterday,
  getTomorrow
} from '../utils/mockFactories';
import { taskService } from '../../services/taskService';
import { Alert } from 'react-native';

// Mock the services
jest.mock('../../services/taskService');

describe('Parent Reviews Screen', () => {
  const mockParent = createMockParent();
  const mockChild = createMockChild();
  
  const mockCompletedTasks = [
    {
      id: 'completion-1',
      taskName: 'Make Bed',
      childName: 'Emma',
      childId: mockChild.id,
      famcoinValue: 5,
      status: 'child_completed',
      completedAt: new Date().toISOString(),
      dueDate: getToday(),
      photoUrl: 'https://example.com/photo1.jpg',
      photoRequired: true,
    },
    {
      id: 'completion-2',
      taskName: 'Homework',
      childName: 'Emma',
      childId: mockChild.id,
      famcoinValue: 10,
      status: 'child_completed',
      completedAt: new Date().toISOString(),
      dueDate: getToday(),
      photoRequired: false,
    },
  ];

  const mockRejectedTasks = [
    {
      id: 'completion-3',
      taskName: 'Clean Room',
      childName: 'Emma',
      childId: mockChild.id,
      famcoinValue: 15,
      status: 'parent_rejected',
      rejectionReason: 'Room still messy',
      dueDate: getYesterday(),
    },
  ];

  const mockPendingTasks = [
    {
      id: 'completion-4',
      taskName: 'Practice Piano',
      childName: 'Emma',
      childId: mockChild.id,
      famcoinValue: 8,
      status: 'pending',
      dueDate: getToday(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (taskService.getParentReviewTasksByDate as jest.Mock).mockResolvedValue([
      ...mockPendingTasks,
      { ...mockCompletedTasks[0], status: 'parent_approved' },
    ]);
    (taskService.getParentPendingApprovalTasks as jest.Mock).mockResolvedValue(mockCompletedTasks);
    (taskService.getParentRejectedTasks as jest.Mock).mockResolvedValue(mockRejectedTasks);
  });

  test('date navigation functionality', async () => {
    const { getByText, queryByText } = renderWithProviders(
      <ParentReviewsScreen />,
      {
        preloadedState: {
          auth: { user: mockParent },
          parent: { pendingApprovalCount: 2 },
        },
      }
    );

    await waitFor(() => {
      expect(getByText('Today')).toBeTruthy();
    });

    // Navigate to tomorrow
    const nextButton = getByText('›');
    fireEvent.press(nextButton);

    await waitFor(() => {
      expect(queryByText('Today')).toBeFalsy();
      expect(taskService.getParentReviewTasksByDate).toHaveBeenCalledWith(
        mockParent.id,
        getTomorrow()
      );
    });

    // Navigate back to today
    const todayButton = getByText('Today');
    fireEvent.press(todayButton);

    await waitFor(() => {
      expect(getByText('Today')).toBeTruthy();
    });
  });

  test('accordion sections render correctly', async () => {
    const { getByText } = renderWithProviders(
      <ParentReviewsScreen />,
      {
        preloadedState: {
          auth: { user: mockParent },
          parent: { pendingApprovalCount: 2 },
        },
      }
    );

    await waitFor(() => {
      // Check accordion headers
      expect(getByText('Awaiting Approval')).toBeTruthy();
      expect(getByText('Sent to Redo')).toBeTruthy();
      expect(getByText('Not Done')).toBeTruthy();
      expect(getByText('Approved')).toBeTruthy();
    });
  });

  test('task counts accurate in each section', async () => {
    const { getByText, getAllByText } = renderWithProviders(
      <ParentReviewsScreen />,
      {
        preloadedState: {
          auth: { user: mockParent },
          parent: { pendingApprovalCount: 2 },
        },
      }
    );

    await waitFor(() => {
      // Find count badges
      const countBadges = getAllByText(/^\d+$/);
      
      // Awaiting Approval: 2
      expect(countBadges.find(el => el.props.children === '2')).toBeTruthy();
      
      // Sent to Redo: 1
      expect(countBadges.find(el => el.props.children === '1')).toBeTruthy();
    });
  });

  test('selection mode toggle', async () => {
    const { getByText, queryByText } = renderWithProviders(
      <ParentReviewsScreen />,
      {
        preloadedState: {
          auth: { user: mockParent },
          parent: { pendingApprovalCount: 2 },
        },
      }
    );

    await waitFor(() => {
      expect(getByText('Select Tasks')).toBeTruthy();
    });

    // Enter selection mode
    fireEvent.press(getByText('Select Tasks'));

    await waitFor(() => {
      expect(getByText('0 selected')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });

    // Exit selection mode
    fireEvent.press(getByText('Cancel'));

    await waitFor(() => {
      expect(queryByText('0 selected')).toBeFalsy();
      expect(getByText('Select Tasks')).toBeTruthy();
    });
  });

  test('task card selection in bulk mode', async () => {
    const { getByText, queryByText } = renderWithProviders(
      <ParentReviewsScreen />,
      {
        preloadedState: {
          auth: { user: mockParent },
          parent: { pendingApprovalCount: 2 },
        },
      }
    );

    await waitFor(() => {
      expect(getByText('Select Tasks')).toBeTruthy();
    });

    // Enter selection mode
    fireEvent.press(getByText('Select Tasks'));

    // Open awaiting approval accordion
    fireEvent.press(getByText('Awaiting Approval'));

    await waitFor(() => {
      expect(getByText('Make Bed')).toBeTruthy();
    });

    // Select a task
    const taskCard = getByText('Make Bed').parent?.parent?.parent;
    if (taskCard) {
      fireEvent.press(taskCard);
    }

    await waitFor(() => {
      expect(getByText('1 selected')).toBeTruthy();
    });
  });

  test('empty state display', async () => {
    (taskService.getParentReviewTasksByDate as jest.Mock).mockResolvedValue([]);
    (taskService.getParentPendingApprovalTasks as jest.Mock).mockResolvedValue([]);
    (taskService.getParentRejectedTasks as jest.Mock).mockResolvedValue([]);

    const { getByText } = renderWithProviders(
      <ParentReviewsScreen />,
      {
        preloadedState: {
          auth: { user: mockParent },
          parent: { pendingApprovalCount: 0 },
        },
      }
    );

    await waitFor(() => {
      expect(getByText('All caught up!')).toBeTruthy();
      expect(getByText('No tasks need your attention.')).toBeTruthy();
    });
  });

  test('pull to refresh functionality', async () => {
    const { UNSAFE_getByType } = renderWithProviders(
      <ParentReviewsScreen />,
      {
        preloadedState: {
          auth: { user: mockParent },
          parent: { pendingApprovalCount: 2 },
        },
      }
    );

    const ScrollView = require('react-native').ScrollView;
    const scrollView = UNSAFE_getByType(ScrollView);
    const { refreshControl } = scrollView.props;

    // Trigger refresh
    refreshControl.props.onRefresh();

    await waitFor(() => {
      expect(taskService.getParentReviewTasksByDate).toHaveBeenCalledTimes(2);
      expect(taskService.getParentPendingApprovalTasks).toHaveBeenCalledTimes(2);
      expect(taskService.getParentRejectedTasks).toHaveBeenCalledTimes(2);
    });
  });

  test('task review modal opens correctly', async () => {
    const { getByText, queryByText } = renderWithProviders(
      <ParentReviewsScreen />,
      {
        preloadedState: {
          auth: { user: mockParent },
          parent: { pendingApprovalCount: 2 },
        },
      }
    );

    // Open awaiting approval accordion
    fireEvent.press(getByText('Awaiting Approval'));

    await waitFor(() => {
      expect(getByText('Make Bed')).toBeTruthy();
    });

    // Click on task
    const taskCard = getByText('Make Bed').parent?.parent?.parent;
    if (taskCard) {
      fireEvent.press(taskCard);
    }

    await waitFor(() => {
      expect(getByText('Review Task')).toBeTruthy();
      expect(getByText('Approve')).toBeTruthy();
      expect(getByText('Request Redo')).toBeTruthy();
    });
  });

  test('complete on behalf button functionality', async () => {
    (taskService.completeTaskOnBehalf as jest.Mock).mockResolvedValue({ success: true });

    const { getByText } = renderWithProviders(
      <ParentReviewsScreen />,
      {
        preloadedState: {
          auth: { user: mockParent },
          parent: { pendingApprovalCount: 0 },
        },
      }
    );

    // Open not done accordion
    fireEvent.press(getByText('Not Done'));

    await waitFor(() => {
      expect(getByText('Practice Piano')).toBeTruthy();
      expect(getByText('Complete on behalf')).toBeTruthy();
    });

    // Mock Alert.alert to automatically press "Complete"
    (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
      if (buttons && buttons[1] && buttons[1].onPress) {
        buttons[1].onPress();
      }
    });

    // Click complete on behalf
    fireEvent.press(getByText('Complete on behalf'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Complete on Behalf',
        expect.stringContaining('Practice Piano'),
        expect.any(Array)
      );
      expect(taskService.completeTaskOnBehalf).toHaveBeenCalledWith(
        'completion-4',
        mockParent.id
      );
    });
  });

  test('stats summary calculations', async () => {
    const { getByText } = renderWithProviders(
      <ParentReviewsScreen />,
      {
        preloadedState: {
          auth: { user: mockParent },
          parent: { pendingApprovalCount: 2 },
        },
      }
    );

    await waitFor(() => {
      // Check today's overview
      expect(getByText("Today's Tasks")).toBeTruthy();
      
      // Stats should show:
      // Not Done: 1 (pending tasks)
      // To Review: 2 (awaiting approval)
      // Rejected: 1
      // Approved: 1
    });
  });

  test('accordion default states', async () => {
    const { getByText, queryByText } = renderWithProviders(
      <ParentReviewsScreen />,
      {
        preloadedState: {
          auth: { user: mockParent },
          parent: { pendingApprovalCount: 2 },
        },
      }
    );

    await waitFor(() => {
      expect(getByText('Awaiting Approval')).toBeTruthy();
    });

    // Awaiting approval should be open by default
    expect(getByText('Make Bed')).toBeTruthy();
    expect(getByText('Homework')).toBeTruthy();

    // Other accordions should be closed
    expect(queryByText('Clean Room')).toBeFalsy(); // Rejected task
    expect(queryByText('Practice Piano')).toBeFalsy(); // Pending task
  });

  test('error handling during data fetch', async () => {
    (taskService.getParentReviewTasksByDate as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { getByText } = renderWithProviders(
      <ParentReviewsScreen />,
      {
        preloadedState: {
          auth: { user: mockParent },
          parent: { pendingApprovalCount: 0 },
        },
      }
    );

    await waitFor(() => {
      expect(getByText('Failed to load data')).toBeTruthy();
    });
  });

  test('real-time updates after task approval', async () => {
    (taskService.approveTaskCompletion as jest.Mock).mockResolvedValue({ success: true });

    const { getByText, store } = renderWithProviders(
      <ParentReviewsScreen />,
      {
        preloadedState: {
          auth: { user: mockParent },
          parent: { pendingApprovalCount: 2 },
        },
      }
    );

    // Open awaiting approval
    fireEvent.press(getByText('Awaiting Approval'));

    await waitFor(() => {
      expect(getByText('Make Bed')).toBeTruthy();
    });

    // Click on task to open modal
    const taskCard = getByText('Make Bed').parent?.parent?.parent;
    if (taskCard) {
      fireEvent.press(taskCard);
    }

    await waitFor(() => {
      expect(getByText('Approve')).toBeTruthy();
    });

    // Approve task
    fireEvent.press(getByText('Approve'));

    await waitFor(() => {
      // Check Redux state updated
      const state = store.getState();
      expect(state.parent.pendingApprovalCount).toBe(1); // 2 - 1
      
      // Check service was called
      expect(taskService.approveTaskCompletion).toHaveBeenCalledWith(
        'completion-1',
        mockParent.id,
        undefined
      );
    });
  });
});