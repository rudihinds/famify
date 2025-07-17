import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import ParentReviewsScreen from '../../app/(parent)/reviews';
import { renderWithProviders } from '../utils/testHelpers';
import { 
  createMockParent,
  createMockChild,
  getToday,
  getYesterday,
  getTomorrow
} from '../utils/mockFactories';
import { taskService } from '../../services/taskService';
import { Alert } from 'react-native';

// Mock the services
jest.mock('../../services/taskService');

describe('Parent Task Review - Behavioral Tests', () => {
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

  describe('Parent can review their children\'s task progress', () => {
    test('parent sees overview of all task statuses for the day', async () => {
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
        // Parent should see today's overview
        expect(getByText("Today's Tasks")).toBeTruthy();
        
        // Parent should see different categories
        expect(getByText('Awaiting Approval')).toBeTruthy();
        expect(getByText('Sent to Redo')).toBeTruthy();
        expect(getByText('Not Done')).toBeTruthy();
        expect(getByText('Approved')).toBeTruthy();
      });
    });

    test('parent can navigate between different days', async () => {
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

      // Parent looks at tomorrow's tasks
      const nextButton = getByText('›');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(queryByText('Today')).toBeFalsy();
        expect(taskService.getParentReviewTasksByDate).toHaveBeenCalledWith(
          mockParent.id,
          getTomorrow()
        );
      });

      // Parent returns to today
      const todayButton = getByText('Today');
      fireEvent.press(todayButton);

      await waitFor(() => {
        expect(getByText('Today')).toBeTruthy();
      });
    });

    test('parent sees task counts for each category', async () => {
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
        // Parent should see accurate counts
        const countBadges = getAllByText(/^\d+$/);
        
        // Awaiting Approval: 2 tasks
        expect(countBadges.find(el => el.props.children === '2')).toBeTruthy();
        
        // Sent to Redo: 1 task
        expect(countBadges.find(el => el.props.children === '1')).toBeTruthy();
      });
    });

    test('parent can see completed tasks waiting for approval', async () => {
      const { getByText } = renderWithProviders(
        <ParentReviewsScreen />,
        {
          preloadedState: {
            auth: { user: mockParent },
            parent: { pendingApprovalCount: 2 },
          },
        }
      );

      // Awaiting approval section should be open by default
      await waitFor(() => {
        expect(getByText('Awaiting Approval')).toBeTruthy();
        expect(getByText('Make Bed')).toBeTruthy();
        expect(getByText('Homework')).toBeTruthy();
      });
    });

    test('parent is encouraged when all tasks are handled', async () => {
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
        // Parent should see positive message
        expect(getByText('All caught up!')).toBeTruthy();
        expect(getByText('No tasks need your attention.')).toBeTruthy();
      });
    });
  });

  describe('Parent can approve or reject child task completions', () => {
    test('parent can review individual task completion', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <ParentReviewsScreen />,
        {
          preloadedState: {
            auth: { user: mockParent },
            parent: { pendingApprovalCount: 2 },
          },
        }
      );

      // Open awaiting approval section
      fireEvent.press(getByText('Awaiting Approval'));

      await waitFor(() => {
        expect(getByText('Make Bed')).toBeTruthy();
      });

      // Parent taps on task to review
      const taskCard = getByText('Make Bed').parent?.parent?.parent;
      if (taskCard) {
        fireEvent.press(taskCard);
      }

      await waitFor(() => {
        // Parent should see review options
        expect(getByText('Review Task')).toBeTruthy();
        expect(getByText('Approve')).toBeTruthy();
        expect(getByText('Request Redo')).toBeTruthy();
      });
    });

    test('parent can approve task and child receives FAMCOINs', async () => {
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

      // Parent reviews task
      const taskCard = getByText('Make Bed').parent?.parent?.parent;
      if (taskCard) {
        fireEvent.press(taskCard);
      }

      await waitFor(() => {
        expect(getByText('Approve')).toBeTruthy();
      });

      // Parent approves task
      fireEvent.press(getByText('Approve'));

      await waitFor(() => {
        // Parent's pending approval count should decrease
        const state = store.getState();
        expect(state.parent.pendingApprovalCount).toBe(1); // 2 - 1
        
        // System should record the approval
        expect(taskService.approveTaskCompletion).toHaveBeenCalledWith(
          'completion-1',
          mockParent.id,
          undefined
        );
      });
    });

    test('parent can request child redo task with feedback', async () => {
      (taskService.rejectTaskCompletion as jest.Mock).mockResolvedValue({ success: true });

      const { getByText, getByPlaceholderText } = renderWithProviders(
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

      // Parent reviews task
      const taskCard = getByText('Make Bed').parent?.parent?.parent;
      if (taskCard) {
        fireEvent.press(taskCard);
      }

      await waitFor(() => {
        expect(getByText('Request Redo')).toBeTruthy();
      });

      // Parent requests redo
      fireEvent.press(getByText('Request Redo'));

      await waitFor(() => {
        // Parent should be able to provide feedback
        expect(getByPlaceholderText('Tell Emma what needs to be fixed...')).toBeTruthy();
      });

      // Parent provides feedback
      fireEvent.changeText(
        getByPlaceholderText('Tell Emma what needs to be fixed...'),
        'Please make the bed corners neater'
      );

      fireEvent.press(getByText('Send for Redo'));

      await waitFor(() => {
        // System should record the rejection with feedback
        expect(taskService.rejectTaskCompletion).toHaveBeenCalledWith(
          'completion-1',
          mockParent.id,
          'Please make the bed corners neater'
        );
      });
    });
  });

  describe('Parent can manage tasks efficiently', () => {
    test('parent can select multiple tasks for bulk actions', async () => {
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

      // Parent enters selection mode
      fireEvent.press(getByText('Select Tasks'));

      await waitFor(() => {
        expect(getByText('0 selected')).toBeTruthy();
        expect(getByText('Cancel')).toBeTruthy();
      });

      // Parent can exit selection mode
      fireEvent.press(getByText('Cancel'));

      await waitFor(() => {
        expect(queryByText('0 selected')).toBeFalsy();
        expect(getByText('Select Tasks')).toBeTruthy();
      });
    });

    test('parent can select individual tasks in bulk mode', async () => {
      const { getByText } = renderWithProviders(
        <ParentReviewsScreen />,
        {
          preloadedState: {
            auth: { user: mockParent },
            parent: { pendingApprovalCount: 2 },
          },
        }
      );

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

    test('parent can complete tasks on child\'s behalf when needed', async () => {
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

      // Open not done section
      fireEvent.press(getByText('Not Done'));

      await waitFor(() => {
        expect(getByText('Practice Piano')).toBeTruthy();
        expect(getByText('Complete on behalf')).toBeTruthy();
      });

      // Mock Alert.alert to automatically choose "Complete"
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        if (buttons && buttons[1] && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });

      // Parent completes task on behalf
      fireEvent.press(getByText('Complete on behalf'));

      await waitFor(() => {
        // Parent should be asked to confirm
        expect(Alert.alert).toHaveBeenCalledWith(
          'Complete on Behalf',
          expect.stringContaining('Practice Piano'),
          expect.any(Array)
        );
        
        // System should record the completion
        expect(taskService.completeTaskOnBehalf).toHaveBeenCalledWith(
          'completion-4',
          mockParent.id
        );
      });
    });

    test('parent can refresh to see latest updates', async () => {
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

      // Parent pulls to refresh
      refreshControl.props.onRefresh();

      await waitFor(() => {
        // Should reload all data
        expect(taskService.getParentReviewTasksByDate).toHaveBeenCalledTimes(2);
        expect(taskService.getParentPendingApprovalTasks).toHaveBeenCalledTimes(2);
        expect(taskService.getParentRejectedTasks).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Parent receives helpful feedback', () => {
    test('parent is informed when data fails to load', async () => {
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

    test('parent sees most important section open by default', async () => {
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

      // Awaiting approval should be open (most important)
      expect(getByText('Make Bed')).toBeTruthy();
      expect(getByText('Homework')).toBeTruthy();

      // Other sections should be closed initially
      expect(queryByText('Clean Room')).toBeFalsy(); // Rejected task
      expect(queryByText('Practice Piano')).toBeFalsy(); // Pending task
    });

    test('parent sees real-time count updates after actions', async () => {
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

      // Parent approves task
      const taskCard = getByText('Make Bed').parent?.parent?.parent;
      if (taskCard) {
        fireEvent.press(taskCard);
      }

      await waitFor(() => {
        fireEvent.press(getByText('Approve'));
      });

      await waitFor(() => {
        // Parent should see updated count
        const state = store.getState();
        expect(state.parent.pendingApprovalCount).toBe(1); // 2 - 1
      });
    });
  });
});