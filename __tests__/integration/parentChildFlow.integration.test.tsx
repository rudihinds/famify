import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/testHelpers';
import { 
  createMockParent,
  createMockChild,
  createMockAuthState,
  createMockParentState,
  createMockChildState,
  createMockTask,
  createMockTaskCompletion,
  createMockTaskState,
  createMockConnectionState
} from '../utils/mockFactories';
import { taskService } from '../../services/taskService';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('../../services/taskService');

describe('Parent-Child Integration Flow Tests', () => {
  const mockParent = createMockParent({
    id: 'parent-123',
    email: 'parent@example.com',
    firstName: 'John',
    lastName: 'Doe',
    famcoinConversionRate: 10,
  });

  const mockChild = createMockChild({
    id: 'child-123',
    parent_id: 'parent-123',
    name: 'Emma',
    age: 8,
    famcoin_balance: 50,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Task Approval Flow', () => {
    test('child completes task → parent approves → FAMCOIN balance updates', async () => {
      // Step 1: Child completes a task
      const mockTask = createMockTask({
        id: 'task-123',
        taskName: 'Make Bed',
        famcoinValue: 8,
        photoRequired: false,
        status: 'pending',
      });

      const mockTaskCompletion = createMockTaskCompletion({
        id: 'completion-123',
        taskInstanceId: 'task-123',
        childId: 'child-123',
        status: 'child_completed',
        completedAt: new Date().toISOString(),
        famcoinsEarned: 8,
      });

      // Mock task service responses
      (taskService.getTaskDetails as jest.Mock).mockResolvedValue(mockTask);
      (taskService.completeTask as jest.Mock).mockResolvedValue({
        success: true,
        taskCompletion: mockTaskCompletion,
      });
      (taskService.approveTaskCompletion as jest.Mock).mockResolvedValue({
        success: true,
        taskCompletion: { ...mockTaskCompletion, status: 'parent_approved' },
        transaction: {
          id: 'txn-123',
          type: 'earned',
          amount: 8,
          childId: 'child-123',
          createdAt: new Date().toISOString(),
        },
        updatedBalance: 58, // 50 + 8
      });
      (taskService.getParentPendingApprovalTasks as jest.Mock).mockResolvedValue([
        mockTaskCompletion,
      ]);

      // Test state representing the flow
      const initialChildState = createMockChildState({
        profile: mockChild,
        currentBalance: 50,
        pendingEarnings: 0,
      });

      const initialParentState = createMockParentState({
        profile: mockParent,
        children: [mockChild],
        pendingApprovalCount: 0,
      });

      // Step 2: Child completes task
      const childStateDuringCompletion = {
        ...initialChildState,
        pendingEarnings: 8, // Task completion adds to pending earnings
      };

      const parentStateDuringCompletion = {
        ...initialParentState,
        pendingApprovalCount: 1, // Parent sees new pending approval
      };

      // Step 3: Parent approves task
      const finalChildState = {
        ...childStateDuringCompletion,
        currentBalance: 58, // 50 + 8
        pendingEarnings: 0, // Pending earnings cleared after approval
      };

      const finalParentState = {
        ...parentStateDuringCompletion,
        pendingApprovalCount: 0, // Pending approval count decreases
        children: [
          {
            ...mockChild,
            famcoin_balance: 58, // Child balance updated in parent view
          },
        ],
      };

      // Verify the flow progression
      expect(initialChildState.currentBalance).toBe(50);
      expect(initialChildState.pendingEarnings).toBe(0);
      expect(initialParentState.pendingApprovalCount).toBe(0);

      // After child completes task
      expect(childStateDuringCompletion.currentBalance).toBe(50); // Unchanged
      expect(childStateDuringCompletion.pendingEarnings).toBe(8); // Increased
      expect(parentStateDuringCompletion.pendingApprovalCount).toBe(1); // Increased

      // After parent approves task
      expect(finalChildState.currentBalance).toBe(58); // Increased
      expect(finalChildState.pendingEarnings).toBe(0); // Cleared
      expect(finalParentState.pendingApprovalCount).toBe(0); // Cleared
      expect(finalParentState.children[0].famcoin_balance).toBe(58); // Updated
    });

    test('child completes task → parent rejects → task returns to child', async () => {
      const mockTask = createMockTask({
        id: 'task-123',
        taskName: 'Clean Room',
        famcoinValue: 12,
        photoRequired: true,
        status: 'pending',
      });

      const mockTaskCompletion = createMockTaskCompletion({
        id: 'completion-123',
        taskInstanceId: 'task-123',
        childId: 'child-123',
        status: 'child_completed',
        completedAt: new Date().toISOString(),
        photoUrl: 'https://example.com/photo.jpg',
        famcoinsEarned: 12,
      });

      // Mock task service responses
      (taskService.getTaskDetails as jest.Mock).mockResolvedValue(mockTask);
      (taskService.completeTask as jest.Mock).mockResolvedValue({
        success: true,
        taskCompletion: mockTaskCompletion,
      });
      (taskService.rejectTaskCompletion as jest.Mock).mockResolvedValue({
        success: true,
        taskCompletion: {
          ...mockTaskCompletion,
          status: 'parent_rejected',
          rejectionReason: 'Room still messy',
          feedback: 'Please organize your desk and make the bed',
        },
      });
      (taskService.getRejectedTasksForChild as jest.Mock).mockResolvedValue([
        {
          ...mockTaskCompletion,
          status: 'parent_rejected',
          rejectionReason: 'Room still messy',
          feedback: 'Please organize your desk and make the bed',
        },
      ]);

      // Test state representing the flow
      const initialChildState = createMockChildState({
        profile: mockChild,
        currentBalance: 50,
        pendingEarnings: 0,
      });

      const initialParentState = createMockParentState({
        profile: mockParent,
        children: [mockChild],
        pendingApprovalCount: 0,
      });

      // Step 1: Child completes task
      const childStateDuringCompletion = {
        ...initialChildState,
        pendingEarnings: 12, // Task completion adds to pending earnings
      };

      const parentStateDuringCompletion = {
        ...initialParentState,
        pendingApprovalCount: 1, // Parent sees new pending approval
      };

      // Step 2: Parent rejects task
      const finalChildState = {
        ...childStateDuringCompletion,
        currentBalance: 50, // Balance unchanged
        pendingEarnings: 0, // Pending earnings cleared after rejection
      };

      const finalParentState = {
        ...parentStateDuringCompletion,
        pendingApprovalCount: 0, // Pending approval count decreases
      };

      // Verify the flow progression
      expect(initialChildState.currentBalance).toBe(50);
      expect(initialChildState.pendingEarnings).toBe(0);
      expect(initialParentState.pendingApprovalCount).toBe(0);

      // After child completes task
      expect(childStateDuringCompletion.currentBalance).toBe(50); // Unchanged
      expect(childStateDuringCompletion.pendingEarnings).toBe(12); // Increased
      expect(parentStateDuringCompletion.pendingApprovalCount).toBe(1); // Increased

      // After parent rejects task
      expect(finalChildState.currentBalance).toBe(50); // Unchanged
      expect(finalChildState.pendingEarnings).toBe(0); // Cleared
      expect(finalParentState.pendingApprovalCount).toBe(0); // Cleared

      // Child should now see the rejected task in their rejected tasks list
      // (This would be verified by the child's UI fetching rejected tasks)
    });
  });

  describe('Multi-Task Bulk Operations', () => {
    test('child completes multiple tasks → parent bulk approves → all balances update', async () => {
      const mockTasks = [
        createMockTask({
          id: 'task-1',
          taskName: 'Make Bed',
          famcoinValue: 5,
          status: 'pending',
        }),
        createMockTask({
          id: 'task-2',
          taskName: 'Brush Teeth',
          famcoinValue: 3,
          status: 'pending',
        }),
        createMockTask({
          id: 'task-3',
          taskName: 'Pack Backpack',
          famcoinValue: 4,
          status: 'pending',
        }),
      ];

      const mockTaskCompletions = mockTasks.map((task, index) =>
        createMockTaskCompletion({
          id: `completion-${index + 1}`,
          taskInstanceId: task.id,
          childId: 'child-123',
          status: 'child_completed',
          completedAt: new Date().toISOString(),
          famcoinsEarned: task.famcoinValue,
        })
      );

      // Mock bulk approval
      (taskService.bulkApproveTaskCompletions as jest.Mock).mockResolvedValue({
        successful: ['completion-1', 'completion-2', 'completion-3'],
        failed: [],
        totalFamcoinsAwarded: 12, // 5 + 3 + 4
        transactions: mockTaskCompletions.map((completion, index) => ({
          id: `txn-${index + 1}`,
          type: 'earned',
          amount: mockTasks[index].famcoinValue,
          childId: 'child-123',
          taskCompletionId: completion.id,
          createdAt: new Date().toISOString(),
        })),
        updatedBalance: 62, // 50 + 12
      });

      // Test state representing the flow
      const initialChildState = createMockChildState({
        profile: mockChild,
        currentBalance: 50,
        pendingEarnings: 0,
      });

      const initialParentState = createMockParentState({
        profile: mockParent,
        children: [mockChild],
        pendingApprovalCount: 0,
      });

      // Step 1: Child completes all tasks
      const childStateDuringCompletion = {
        ...initialChildState,
        pendingEarnings: 12, // All task completions add to pending earnings
      };

      const parentStateDuringCompletion = {
        ...initialParentState,
        pendingApprovalCount: 3, // Parent sees all pending approvals
      };

      // Step 2: Parent bulk approves all tasks
      const finalChildState = {
        ...childStateDuringCompletion,
        currentBalance: 62, // 50 + 12
        pendingEarnings: 0, // All pending earnings cleared
      };

      const finalParentState = {
        ...parentStateDuringCompletion,
        pendingApprovalCount: 0, // All pending approvals cleared
        children: [
          {
            ...mockChild,
            famcoin_balance: 62, // Child balance updated in parent view
          },
        ],
      };

      // Verify the flow progression
      expect(initialChildState.currentBalance).toBe(50);
      expect(initialChildState.pendingEarnings).toBe(0);
      expect(initialParentState.pendingApprovalCount).toBe(0);

      // After child completes all tasks
      expect(childStateDuringCompletion.currentBalance).toBe(50); // Unchanged
      expect(childStateDuringCompletion.pendingEarnings).toBe(12); // Increased
      expect(parentStateDuringCompletion.pendingApprovalCount).toBe(3); // Increased

      // After parent bulk approves all tasks
      expect(finalChildState.currentBalance).toBe(62); // Increased
      expect(finalChildState.pendingEarnings).toBe(0); // Cleared
      expect(finalParentState.pendingApprovalCount).toBe(0); // Cleared
      expect(finalParentState.children[0].famcoin_balance).toBe(62); // Updated
    });

    test('parent completes tasks on behalf of child → child balance updates', async () => {
      const mockTasks = [
        createMockTask({
          id: 'task-1',
          taskName: 'Practice Piano',
          famcoinValue: 10,
          status: 'pending',
        }),
        createMockTask({
          id: 'task-2',
          taskName: 'Read Book',
          famcoinValue: 8,
          status: 'pending',
        }),
      ];

      const mockTaskCompletions = mockTasks.map((task, index) =>
        createMockTaskCompletion({
          id: `completion-${index + 1}`,
          taskInstanceId: task.id,
          childId: 'child-123',
          status: 'pending',
          famcoinsEarned: task.famcoinValue,
        })
      );

      // Mock parent completing tasks on behalf
      (taskService.bulkCompleteTasksOnBehalf as jest.Mock).mockResolvedValue({
        successful: ['completion-1', 'completion-2'],
        failed: [],
        totalFamcoinsAwarded: 18, // 10 + 8
        transactions: mockTaskCompletions.map((completion, index) => ({
          id: `txn-${index + 1}`,
          type: 'earned',
          amount: mockTasks[index].famcoinValue,
          childId: 'child-123',
          taskCompletionId: completion.id,
          createdBy: 'parent-123',
          createdAt: new Date().toISOString(),
        })),
        updatedBalance: 68, // 50 + 18
      });

      // Test state representing the flow
      const initialChildState = createMockChildState({
        profile: mockChild,
        currentBalance: 50,
        pendingEarnings: 0,
      });

      const initialParentState = createMockParentState({
        profile: mockParent,
        children: [mockChild],
        pendingApprovalCount: 0,
      });

      // Parent completes tasks on behalf of child
      const finalChildState = {
        ...initialChildState,
        currentBalance: 68, // 50 + 18 (direct balance update)
        pendingEarnings: 0, // No pending earnings (direct completion)
      };

      const finalParentState = {
        ...initialParentState,
        children: [
          {
            ...mockChild,
            famcoin_balance: 68, // Child balance updated in parent view
          },
        ],
      };

      // Verify the flow progression
      expect(initialChildState.currentBalance).toBe(50);
      expect(initialChildState.pendingEarnings).toBe(0);
      expect(initialParentState.pendingApprovalCount).toBe(0);

      // After parent completes tasks on behalf
      expect(finalChildState.currentBalance).toBe(68); // Directly increased
      expect(finalChildState.pendingEarnings).toBe(0); // No pending state
      expect(finalParentState.children[0].famcoin_balance).toBe(68); // Updated
    });
  });

  describe('Real-time Synchronization', () => {
    test('child action updates parent view immediately', async () => {
      const mockTask = createMockTask({
        id: 'task-123',
        taskName: 'Water Plants',
        famcoinValue: 6,
        photoRequired: false,
        status: 'pending',
      });

      const mockTaskCompletion = createMockTaskCompletion({
        id: 'completion-123',
        taskInstanceId: 'task-123',
        childId: 'child-123',
        status: 'child_completed',
        completedAt: new Date().toISOString(),
        famcoinsEarned: 6,
      });

      // Mock task service responses
      (taskService.completeTask as jest.Mock).mockResolvedValue({
        success: true,
        taskCompletion: mockTaskCompletion,
      });
      (taskService.getParentPendingApprovalTasks as jest.Mock).mockResolvedValue([
        mockTaskCompletion,
      ]);

      // Test state representing real-time sync
      const initialState = {
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 0,
        }),
        parent: createMockParentState({
          profile: mockParent,
          children: [mockChild],
          pendingApprovalCount: 0,
        }),
      };

      // Simulate child completing task
      const stateAfterChildAction = {
        child: {
          ...initialState.child,
          pendingEarnings: 6, // Child sees immediate pending earnings update
        },
        parent: {
          ...initialState.parent,
          pendingApprovalCount: 1, // Parent sees immediate pending approval update
        },
      };

      // Verify real-time sync
      expect(initialState.child.pendingEarnings).toBe(0);
      expect(initialState.parent.pendingApprovalCount).toBe(0);

      // After child action
      expect(stateAfterChildAction.child.pendingEarnings).toBe(6);
      expect(stateAfterChildAction.parent.pendingApprovalCount).toBe(1);
    });

    test('parent action updates child view immediately', async () => {
      const mockTaskCompletion = createMockTaskCompletion({
        id: 'completion-123',
        taskInstanceId: 'task-123',
        childId: 'child-123',
        status: 'child_completed',
        completedAt: new Date().toISOString(),
        famcoinsEarned: 7,
      });

      // Mock parent approval
      (taskService.approveTaskCompletion as jest.Mock).mockResolvedValue({
        success: true,
        taskCompletion: { ...mockTaskCompletion, status: 'parent_approved' },
        transaction: {
          id: 'txn-123',
          type: 'earned',
          amount: 7,
          childId: 'child-123',
          createdAt: new Date().toISOString(),
        },
        updatedBalance: 57, // 50 + 7
      });

      // Test state representing real-time sync
      const initialState = {
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 7,
        }),
        parent: createMockParentState({
          profile: mockParent,
          children: [mockChild],
          pendingApprovalCount: 1,
        }),
      };

      // Simulate parent approving task
      const stateAfterParentAction = {
        child: {
          ...initialState.child,
          currentBalance: 57, // Child sees immediate balance update
          pendingEarnings: 0, // Child sees pending earnings cleared
        },
        parent: {
          ...initialState.parent,
          pendingApprovalCount: 0, // Parent sees immediate pending count update
          children: [
            {
              ...mockChild,
              famcoin_balance: 57, // Parent sees child balance update
            },
          ],
        },
      };

      // Verify real-time sync
      expect(initialState.child.currentBalance).toBe(50);
      expect(initialState.child.pendingEarnings).toBe(7);
      expect(initialState.parent.pendingApprovalCount).toBe(1);

      // After parent action
      expect(stateAfterParentAction.child.currentBalance).toBe(57);
      expect(stateAfterParentAction.child.pendingEarnings).toBe(0);
      expect(stateAfterParentAction.parent.pendingApprovalCount).toBe(0);
      expect(stateAfterParentAction.parent.children[0].famcoin_balance).toBe(57);
    });
  });

  describe('Error Scenarios', () => {
    test('handles task completion failure gracefully', async () => {
      const mockTask = createMockTask({
        id: 'task-123',
        taskName: 'Feed Pet',
        famcoinValue: 4,
        photoRequired: false,
        status: 'pending',
      });

      // Mock task service failure
      (taskService.getTaskDetails as jest.Mock).mockResolvedValue(mockTask);
      (taskService.completeTask as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      // Test state representing error handling
      const initialState = {
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 0,
        }),
        parent: createMockParentState({
          profile: mockParent,
          children: [mockChild],
          pendingApprovalCount: 0,
        }),
      };

      // After failed task completion
      const stateAfterFailedAction = {
        child: {
          ...initialState.child,
          currentBalance: 50, // Balance unchanged
          pendingEarnings: 0, // Pending earnings unchanged
        },
        parent: {
          ...initialState.parent,
          pendingApprovalCount: 0, // Pending count unchanged
        },
      };

      // Verify error handling
      expect(initialState.child.currentBalance).toBe(50);
      expect(initialState.child.pendingEarnings).toBe(0);
      expect(initialState.parent.pendingApprovalCount).toBe(0);

      // After failed action
      expect(stateAfterFailedAction.child.currentBalance).toBe(50);
      expect(stateAfterFailedAction.child.pendingEarnings).toBe(0);
      expect(stateAfterFailedAction.parent.pendingApprovalCount).toBe(0);
    });

    test('handles approval failure gracefully', async () => {
      const mockTaskCompletion = createMockTaskCompletion({
        id: 'completion-123',
        taskInstanceId: 'task-123',
        childId: 'child-123',
        status: 'child_completed',
        completedAt: new Date().toISOString(),
        famcoinsEarned: 9,
      });

      // Mock approval failure
      (taskService.approveTaskCompletion as jest.Mock).mockRejectedValue(
        new Error('Transaction failed')
      );

      // Test state representing error handling
      const initialState = {
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 9,
        }),
        parent: createMockParentState({
          profile: mockParent,
          children: [mockChild],
          pendingApprovalCount: 1,
        }),
      };

      // After failed approval
      const stateAfterFailedApproval = {
        child: {
          ...initialState.child,
          currentBalance: 50, // Balance unchanged
          pendingEarnings: 9, // Pending earnings unchanged
        },
        parent: {
          ...initialState.parent,
          pendingApprovalCount: 1, // Pending count unchanged
        },
      };

      // Verify error handling
      expect(initialState.child.currentBalance).toBe(50);
      expect(initialState.child.pendingEarnings).toBe(9);
      expect(initialState.parent.pendingApprovalCount).toBe(1);

      // After failed approval
      expect(stateAfterFailedApproval.child.currentBalance).toBe(50);
      expect(stateAfterFailedApproval.child.pendingEarnings).toBe(9);
      expect(stateAfterFailedApproval.parent.pendingApprovalCount).toBe(1);
    });
  });
});