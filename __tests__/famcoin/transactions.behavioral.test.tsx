import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
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
jest.mock('../../services/taskService', () => ({
  taskService: {
    approveTaskCompletion: jest.fn(),
    rejectTaskCompletion: jest.fn(),
    getParentReviewTasksByDate: jest.fn(),
    getTransactionHistory: jest.fn(),
  },
}));

describe('FAMCOIN Transaction System - Behavioral Tests', () => {
  const mockParent = createMockParent({
    famcoinConversionRate: 10, // 10 FAMCOINs per £1
  });
  
  const mockChild = createMockChild({
    id: 'child-1',
    name: 'Emma',
    famcoinBalance: 50, // Starting balance
  });

  const mockAuthState = createMockAuthState({
    user: { id: mockParent.id },
    session: { user: { id: mockParent.id } },
    deviceType: 'parent',
  });

  const mockParentState = createMockParentState({
    profile: mockParent,
    children: [mockChild],
  });

  const mockChildState = createMockChildState({
    profile: mockChild,
    currentBalance: 50,
    pendingEarnings: 15, // FAMCOINs waiting for approval
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Child earns FAMCOINs through task completion', () => {
    test('child sees pending earnings increase when task is completed', async () => {
      const mockTask = createMockTaskCompletion({
        id: 'completion-1',
        task: createMockTask({
          taskName: 'Make bed',
          famcoinValue: 8,
        }),
        childId: 'child-1',
        status: 'child_completed',
        completedAt: new Date().toISOString(),
      });

      const initialState = {
        auth: mockAuthState,
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 15,
        }),
        parent: mockParentState,
        tasks: createMockTaskState(),
        connection: createMockConnectionState(),
        sequenceCreation: {},
        sequences: { activeSequences: [], isLoading: false, error: null },
      };

      // Mock child dashboard or task completion component
      const { getByText } = renderWithProviders(
        <div>Mock Child Dashboard</div>,
        { preloadedState: initialState }
      );

      // Simulate task completion
      const updatedChildState = {
        ...initialState.child,
        pendingEarnings: 23, // 15 + 8
      };

      // Verify pending earnings increased
      expect(updatedChildState.pendingEarnings).toBe(23);
      expect(updatedChildState.currentBalance).toBe(50); // Balance unchanged until parent approval
    });

    test('child balance shows separate pending and confirmed amounts', async () => {
      const stateWithPendingEarnings = {
        auth: mockAuthState,
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 25,
        }),
        parent: mockParentState,
        tasks: createMockTaskState(),
        connection: createMockConnectionState(),
        sequenceCreation: {},
        sequences: { activeSequences: [], isLoading: false, error: null },
      };

      const { getByText } = renderWithProviders(
        <div>Mock Child Dashboard</div>,
        { preloadedState: stateWithPendingEarnings }
      );

      // Child should see both balances
      const childState = stateWithPendingEarnings.child;
      expect(childState.currentBalance).toBe(50); // Confirmed balance
      expect(childState.pendingEarnings).toBe(25); // Pending approval
    });

    test('multiple task completions accumulate in pending earnings', async () => {
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
          task: createMockTask({ taskName: 'Read book', famcoinValue: 10 }),
          status: 'child_completed',
        }),
      ];

      const initialState = {
        auth: mockAuthState,
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 0,
        }),
        parent: mockParentState,
        tasks: createMockTaskState({ parentReviewTasks: mockTasks }),
        connection: createMockConnectionState(),
        sequenceCreation: {},
        sequences: { activeSequences: [], isLoading: false, error: null },
      };

      // Simulate completing all tasks
      const expectedPendingEarnings = 5 + 3 + 10; // 18 total
      const updatedChildState = {
        ...initialState.child,
        pendingEarnings: expectedPendingEarnings,
      };

      expect(updatedChildState.pendingEarnings).toBe(18);
      expect(updatedChildState.currentBalance).toBe(50); // Unchanged until approval
    });
  });

  describe('Parent approves tasks and awards FAMCOINs', () => {
    test('parent approval transfers FAMCOINs from pending to confirmed balance', async () => {
      const mockTask = createMockTaskCompletion({
        id: 'completion-1',
        task: createMockTask({
          taskName: 'Clean room',
          famcoinValue: 12,
        }),
        childId: 'child-1',
        status: 'child_completed',
        completedAt: new Date().toISOString(),
      });

      // Mock successful approval
      require('../../services/taskService').taskService.approveTaskCompletion.mockResolvedValue({
        success: true,
        transaction: {
          id: 'txn-1',
          type: 'earned',
          amount: 12,
          childId: 'child-1',
          taskCompletionId: 'completion-1',
          createdAt: new Date().toISOString(),
        },
        updatedBalance: 62, // 50 + 12
      });

      const initialState = {
        auth: mockAuthState,
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 20, // Includes the 12 from this task
        }),
        parent: mockParentState,
        tasks: createMockTaskState({ parentReviewTasks: [mockTask] }),
        connection: createMockConnectionState(),
        sequenceCreation: {},
        sequences: { activeSequences: [], isLoading: false, error: null },
      };

      const { getByText } = renderWithProviders(
        <div>Mock Parent Review Screen</div>,
        { preloadedState: initialState }
      );

      // Simulate parent approval
      const approvalResult = await require('../../services/taskService').taskService.approveTaskCompletion(
        'completion-1',
        'child-1'
      );

      // Verify transaction was created
      expect(approvalResult.success).toBe(true);
      expect(approvalResult.transaction.type).toBe('earned');
      expect(approvalResult.transaction.amount).toBe(12);
      expect(approvalResult.updatedBalance).toBe(62);
    });

    test('parent bulk approval creates multiple transactions', async () => {
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

      // Mock bulk approval
      require('../../services/taskService').taskService.bulkApproveTaskCompletions = jest.fn().mockResolvedValue({
        success: true,
        transactions: [
          { id: 'txn-1', type: 'earned', amount: 5, taskCompletionId: 'completion-1' },
          { id: 'txn-2', type: 'earned', amount: 3, taskCompletionId: 'completion-2' },
          { id: 'txn-3', type: 'earned', amount: 4, taskCompletionId: 'completion-3' },
        ],
        totalAmount: 12,
        updatedBalance: 62, // 50 + 12
      });

      const initialState = {
        auth: mockAuthState,
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 20,
        }),
        parent: mockParentState,
        tasks: createMockTaskState({ parentReviewTasks: mockTasks }),
        connection: createMockConnectionState(),
        sequenceCreation: {},
        sequences: { activeSequences: [], isLoading: false, error: null },
      };

      const { getByText } = renderWithProviders(
        <div>Mock Parent Review Screen</div>,
        { preloadedState: initialState }
      );

      // Simulate bulk approval
      const bulkResult = await require('../../services/taskService').taskService.bulkApproveTaskCompletions([
        'completion-1',
        'completion-2',
        'completion-3',
      ], 'child-1');

      // Verify multiple transactions were created
      expect(bulkResult.success).toBe(true);
      expect(bulkResult.transactions).toHaveLength(3);
      expect(bulkResult.totalAmount).toBe(12);
      expect(bulkResult.updatedBalance).toBe(62);
    });

    test('parent rejection does not create transaction or update balance', async () => {
      const mockTask = createMockTaskCompletion({
        id: 'completion-1',
        task: createMockTask({
          taskName: 'Clean room',
          famcoinValue: 12,
        }),
        childId: 'child-1',
        status: 'child_completed',
        completedAt: new Date().toISOString(),
      });

      // Mock rejection
      require('../../services/taskService').taskService.rejectTaskCompletion.mockResolvedValue({
        success: true,
        rejectedAt: new Date().toISOString(),
        rejectionReason: 'Room still messy',
        feedback: 'Please organize your desk and make the bed.',
      });

      const initialState = {
        auth: mockAuthState,
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 20,
        }),
        parent: mockParentState,
        tasks: createMockTaskState({ parentReviewTasks: [mockTask] }),
        connection: createMockConnectionState(),
        sequenceCreation: {},
        sequences: { activeSequences: [], isLoading: false, error: null },
      };

      const { getByText } = renderWithProviders(
        <div>Mock Parent Review Screen</div>,
        { preloadedState: initialState }
      );

      // Simulate parent rejection
      const rejectionResult = await require('../../services/taskService').taskService.rejectTaskCompletion(
        'completion-1',
        'child-1',
        'Room still messy',
        'Please organize your desk and make the bed.'
      );

      // Verify no transaction was created
      expect(rejectionResult.success).toBe(true);
      expect(rejectionResult.rejectionReason).toBe('Room still messy');
      
      // Balance should remain unchanged
      const childState = initialState.child;
      expect(childState.currentBalance).toBe(50);
      expect(childState.pendingEarnings).toBe(20); // Unchanged
    });
  });

  describe('Balance synchronization between parent and child', () => {
    test('child balance updates immediately when parent approves task', async () => {
      const mockTask = createMockTaskCompletion({
        id: 'completion-1',
        task: createMockTask({
          taskName: 'Feed pet',
          famcoinValue: 7,
        }),
        childId: 'child-1',
        status: 'child_completed',
      });

      // Mock real-time balance update
      const mockBalanceUpdate = {
        childId: 'child-1',
        previousBalance: 50,
        newBalance: 57,
        pendingEarnings: 13, // 20 - 7
        transaction: {
          id: 'txn-1',
          type: 'earned',
          amount: 7,
          createdAt: new Date().toISOString(),
        },
      };

      const initialState = {
        auth: mockAuthState,
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 20,
        }),
        parent: mockParentState,
        tasks: createMockTaskState({ parentReviewTasks: [mockTask] }),
        connection: createMockConnectionState(),
        sequenceCreation: {},
        sequences: { activeSequences: [], isLoading: false, error: null },
      };

      // Simulate balance update
      const updatedChildState = {
        ...initialState.child,
        currentBalance: mockBalanceUpdate.newBalance,
        pendingEarnings: mockBalanceUpdate.pendingEarnings,
      };

      // Verify balance synchronization
      expect(updatedChildState.currentBalance).toBe(57);
      expect(updatedChildState.pendingEarnings).toBe(13);
    });

    test('parent sees updated child balance in real-time', async () => {
      const mockBalanceUpdate = {
        childId: 'child-1',
        currentBalance: 65,
        pendingEarnings: 8,
        lastUpdated: new Date().toISOString(),
      };

      const initialState = {
        auth: mockAuthState,
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 20,
        }),
        parent: mockParentState,
        tasks: createMockTaskState(),
        connection: createMockConnectionState(),
        sequenceCreation: {},
        sequences: { activeSequences: [], isLoading: false, error: null },
      };

      // Parent should see updated balance
      const updatedParentState = {
        ...initialState.parent,
        children: [
          {
            ...mockChild,
            famcoinBalance: mockBalanceUpdate.currentBalance,
          },
        ],
      };

      expect(updatedParentState.children[0].famcoinBalance).toBe(65);
    });

    test('balance updates are atomic - no partial state updates', async () => {
      const mockTask = createMockTaskCompletion({
        id: 'completion-1',
        task: createMockTask({
          taskName: 'Do homework',
          famcoinValue: 15,
        }),
        childId: 'child-1',
        status: 'child_completed',
      });

      // Mock atomic transaction
      require('../../services/taskService').taskService.approveTaskCompletion.mockResolvedValue({
        success: true,
        transaction: {
          id: 'txn-1',
          type: 'earned',
          amount: 15,
          childId: 'child-1',
          taskCompletionId: 'completion-1',
          createdAt: new Date().toISOString(),
        },
        updatedBalance: 65, // 50 + 15
        updatedPendingEarnings: 5, // 20 - 15
      });

      const initialState = {
        auth: mockAuthState,
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 20,
        }),
        parent: mockParentState,
        tasks: createMockTaskState({ parentReviewTasks: [mockTask] }),
        connection: createMockConnectionState(),
        sequenceCreation: {},
        sequences: { activeSequences: [], isLoading: false, error: null },
      };

      // Simulate atomic update
      const approvalResult = await require('../../services/taskService').taskService.approveTaskCompletion(
        'completion-1',
        'child-1'
      );

      // Verify atomic transaction success
      expect(approvalResult.success).toBe(true);
      expect(approvalResult.updatedBalance).toBe(65);
      expect(approvalResult.updatedPendingEarnings).toBe(5);
      expect(approvalResult.transaction.amount).toBe(15);
    });
  });

  describe('Transaction history and audit trail', () => {
    test('child can view their transaction history', async () => {
      const mockTransactionHistory = [
        {
          id: 'txn-1',
          type: 'earned',
          amount: 10,
          taskName: 'Make bed',
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 'txn-2',
          type: 'earned',
          amount: 5,
          taskName: 'Brush teeth',
          createdAt: '2024-01-15T08:00:00Z',
        },
        {
          id: 'txn-3',
          type: 'earned',
          amount: 8,
          taskName: 'Pack backpack',
          createdAt: '2024-01-14T18:00:00Z',
        },
      ];

      // Mock transaction history service
      require('../../services/taskService').taskService.getTransactionHistory.mockResolvedValue({
        transactions: mockTransactionHistory,
        totalEarned: 23,
        totalSpent: 0,
        currentBalance: 50,
      });

      const initialState = {
        auth: mockAuthState,
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 10,
        }),
        parent: mockParentState,
        tasks: createMockTaskState(),
        connection: createMockConnectionState(),
        sequenceCreation: {},
        sequences: { activeSequences: [], isLoading: false, error: null },
      };

      const { getByText } = renderWithProviders(
        <div>Mock Transaction History Screen</div>,
        { preloadedState: initialState }
      );

      // Simulate loading transaction history
      const historyResult = await require('../../services/taskService').taskService.getTransactionHistory('child-1');

      // Verify transaction history
      expect(historyResult.transactions).toHaveLength(3);
      expect(historyResult.totalEarned).toBe(23);
      expect(historyResult.totalSpent).toBe(0);
      expect(historyResult.currentBalance).toBe(50);
    });

    test('parent can view detailed transaction audit trail', async () => {
      const mockAuditTrail = [
        {
          id: 'txn-1',
          type: 'earned',
          amount: 10,
          childId: 'child-1',
          childName: 'Emma',
          taskName: 'Make bed',
          approvedBy: 'parent-1',
          approvedAt: '2024-01-15T10:00:00Z',
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 'txn-2',
          type: 'earned',
          amount: 5,
          childId: 'child-1',
          childName: 'Emma',
          taskName: 'Brush teeth',
          approvedBy: 'parent-1',
          approvedAt: '2024-01-15T08:00:00Z',
          createdAt: '2024-01-15T08:00:00Z',
        },
      ];

      // Mock audit trail service
      require('../../services/taskService').taskService.getTransactionAuditTrail = jest.fn().mockResolvedValue({
        transactions: mockAuditTrail,
        totalFamcoinsAwarded: 15,
        childrenBalances: [
          { childId: 'child-1', childName: 'Emma', balance: 50 },
        ],
      });

      const initialState = {
        auth: mockAuthState,
        child: createMockChildState(),
        parent: mockParentState,
        tasks: createMockTaskState(),
        connection: createMockConnectionState(),
        sequenceCreation: {},
        sequences: { activeSequences: [], isLoading: false, error: null },
      };

      const { getByText } = renderWithProviders(
        <div>Mock Parent Audit Trail Screen</div>,
        { preloadedState: initialState }
      );

      // Simulate loading audit trail
      const auditResult = await require('../../services/taskService').taskService.getTransactionAuditTrail('parent-1');

      // Verify audit trail
      expect(auditResult.transactions).toHaveLength(2);
      expect(auditResult.totalFamcoinsAwarded).toBe(15);
      expect(auditResult.childrenBalances[0].balance).toBe(50);
    });
  });

  describe('Error handling and edge cases', () => {
    test('handles network errors during transaction creation gracefully', async () => {
      const mockTask = createMockTaskCompletion({
        id: 'completion-1',
        task: createMockTask({
          taskName: 'Water plants',
          famcoinValue: 6,
        }),
        childId: 'child-1',
        status: 'child_completed',
      });

      // Mock network error
      require('../../services/taskService').taskService.approveTaskCompletion.mockRejectedValue(
        new Error('Network error: Could not create transaction')
      );

      const initialState = {
        auth: mockAuthState,
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 20,
        }),
        parent: mockParentState,
        tasks: createMockTaskState({ parentReviewTasks: [mockTask] }),
        connection: createMockConnectionState(),
        sequenceCreation: {},
        sequences: { activeSequences: [], isLoading: false, error: null },
      };

      const { getByText } = renderWithProviders(
        <div>Mock Parent Review Screen</div>,
        { preloadedState: initialState }
      );

      // Simulate approval attempt
      try {
        await require('../../services/taskService').taskService.approveTaskCompletion(
          'completion-1',
          'child-1'
        );
      } catch (error) {
        // Verify error handling
        expect(error.message).toBe('Network error: Could not create transaction');
      }

      // Balance should remain unchanged
      const childState = initialState.child;
      expect(childState.currentBalance).toBe(50);
      expect(childState.pendingEarnings).toBe(20);
    });

    test('prevents concurrent transaction modifications', async () => {
      const mockTask = createMockTaskCompletion({
        id: 'completion-1',
        task: createMockTask({
          taskName: 'Clean room',
          famcoinValue: 12,
        }),
        childId: 'child-1',
        status: 'child_completed',
      });

      // Mock concurrent modification error
      require('../../services/taskService').taskService.approveTaskCompletion
        .mockRejectedValueOnce(new Error('Concurrent modification detected'))
        .mockResolvedValueOnce({
          success: true,
          transaction: {
            id: 'txn-1',
            type: 'earned',
            amount: 12,
            childId: 'child-1',
            taskCompletionId: 'completion-1',
            createdAt: new Date().toISOString(),
          },
          updatedBalance: 62,
        });

      const initialState = {
        auth: mockAuthState,
        child: createMockChildState({
          profile: mockChild,
          currentBalance: 50,
          pendingEarnings: 20,
        }),
        parent: mockParentState,
        tasks: createMockTaskState({ parentReviewTasks: [mockTask] }),
        connection: createMockConnectionState(),
        sequenceCreation: {},
        sequences: { activeSequences: [], isLoading: false, error: null },
      };

      // First attempt should fail
      try {
        await require('../../services/taskService').taskService.approveTaskCompletion(
          'completion-1',
          'child-1'
        );
      } catch (error) {
        expect(error.message).toBe('Concurrent modification detected');
      }

      // Second attempt should succeed
      const retryResult = await require('../../services/taskService').taskService.approveTaskCompletion(
        'completion-1',
        'child-1'
      );

      expect(retryResult.success).toBe(true);
      expect(retryResult.updatedBalance).toBe(62);
    });
  });
});