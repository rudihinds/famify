import { supabase } from '../../lib/supabase';
import { createSupabaseResponse } from '../utils/mockFactories';

// Mock Supabase client
jest.mock('../../lib/supabase');

// Import the actual service after mocking
const { transactionService } = require('../../services/transactionService');

describe('TransactionService', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPendingTransaction', () => {
    test('should create pending transaction successfully', async () => {
      const childId = 'child-123';
      const taskCompletionId = 'completion-123';
      const amount = 10;
      const mockTransaction = {
        id: 'transaction-123',
        child_id: childId,
        amount: amount,
        type: 'earned',
        task_completion_id: taskCompletionId,
        reason: 'Task completion pending approval',
        created_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(createSupabaseResponse(mockTransaction)),
          }),
        }),
      } as any);

      const result = await transactionService.createPendingTransaction(
        childId,
        taskCompletionId,
        amount
      );

      expect(result).toEqual(mockTransaction);
      expect(mockSupabase.from).toHaveBeenCalledWith('famcoin_transactions');
    });

    test('should handle transaction creation failure', async () => {
      const childId = 'child-123';
      const taskCompletionId = 'completion-123';
      const amount = 10;
      const mockError = new Error('Database error');

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(createSupabaseResponse(null, mockError)),
          }),
        }),
      } as any);

      await expect(
        transactionService.createPendingTransaction(childId, taskCompletionId, amount)
      ).rejects.toThrow('Database error');
    });
  });

  describe('createTransaction', () => {
    test('should create transaction with all parameters', async () => {
      const transactionData = {
        childId: 'child-123',
        amount: 15,
        type: 'earned' as const,
        taskCompletionId: 'completion-123',
        reason: 'Task approved',
        createdBy: 'parent-123',
      };

      const mockTransaction = {
        id: 'transaction-123',
        child_id: transactionData.childId,
        amount: transactionData.amount,
        type: transactionData.type,
        task_completion_id: transactionData.taskCompletionId,
        reason: transactionData.reason,
        created_by: transactionData.createdBy,
        created_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(createSupabaseResponse(mockTransaction)),
          }),
        }),
      } as any);

      const result = await transactionService.createTransaction(transactionData);

      expect(result).toEqual(mockTransaction);
      expect(mockSupabase.from).toHaveBeenCalledWith('famcoin_transactions');
    });

    test('should create transaction with minimal parameters', async () => {
      const transactionData = {
        childId: 'child-123',
        amount: 5,
        type: 'bonus' as const,
      };

      const mockTransaction = {
        id: 'transaction-123',
        child_id: transactionData.childId,
        amount: transactionData.amount,
        type: transactionData.type,
        created_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(createSupabaseResponse(mockTransaction)),
          }),
        }),
      } as any);

      const result = await transactionService.createTransaction(transactionData);

      expect(result).toEqual(mockTransaction);
    });
  });

  describe('getTransactionHistory', () => {
    test('should fetch transaction history for a child', async () => {
      const childId = 'child-123';
      const mockTransactions = [
        {
          id: 'transaction-1',
          child_id: childId,
          amount: 10,
          type: 'earned',
          reason: 'Task completed',
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'transaction-2',
          child_id: childId,
          amount: 5,
          type: 'spent',
          reason: 'Reward purchased',
          created_at: '2024-01-15T12:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(createSupabaseResponse(mockTransactions)),
          }),
        }),
      } as any);

      const result = await transactionService.getTransactionHistory(childId);

      expect(result).toEqual(mockTransactions);
      expect(mockSupabase.from).toHaveBeenCalledWith('famcoin_transactions');
    });

    test('should handle empty transaction history', async () => {
      const childId = 'child-123';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(createSupabaseResponse([])),
          }),
        }),
      } as any);

      const result = await transactionService.getTransactionHistory(childId);

      expect(result).toEqual([]);
    });
  });

  describe('getChildBalance', () => {
    test('should calculate child balance correctly', async () => {
      const childId = 'child-123';
      const mockTransactions = [
        { amount: 10, type: 'earned' },
        { amount: 5, type: 'earned' },
        { amount: 3, type: 'spent' },
        { amount: 2, type: 'adjusted' },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createSupabaseResponse(mockTransactions)),
        }),
      } as any);

      const result = await transactionService.getChildBalance(childId);

      // 10 + 5 - 3 + 2 = 14
      expect(result).toBe(14);
    });

    test('should handle child with no transactions', async () => {
      const childId = 'child-123';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createSupabaseResponse([])),
        }),
      } as any);

      const result = await transactionService.getChildBalance(childId);

      expect(result).toBe(0);
    });

    test('should handle database error', async () => {
      const childId = 'child-123';
      const mockError = new Error('Database error');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createSupabaseResponse(null, mockError)),
        }),
      } as any);

      await expect(transactionService.getChildBalance(childId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getTransactionsByParent', () => {
    test('should fetch transactions for all children of a parent', async () => {
      const parentId = 'parent-123';
      const mockTransactions = [
        {
          id: 'transaction-1',
          child_id: 'child-1',
          child_name: 'Emma',
          amount: 10,
          type: 'earned',
          task_name: 'Make Bed',
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'transaction-2',
          child_id: 'child-2',
          child_name: 'Liam',
          amount: 5,
          type: 'earned',
          task_name: 'Homework',
          created_at: '2024-01-15T12:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(createSupabaseResponse(mockTransactions)),
          }),
        }),
      } as any);

      const result = await transactionService.getTransactionsByParent(parentId);

      expect(result).toEqual(mockTransactions);
      expect(mockSupabase.from).toHaveBeenCalledWith('parent_transactions_view');
    });
  });

  describe('getPendingEarnings', () => {
    test('should calculate pending earnings from completed tasks', async () => {
      const childId = 'child-123';
      const mockCompletions = [
        {
          id: 'completion-1',
          famcoin_value: 8,
          status: 'child_completed',
        },
        {
          id: 'completion-2',
          famcoin_value: 5,
          status: 'child_completed',
        },
        {
          id: 'completion-3',
          famcoin_value: 10,
          status: 'parent_approved', // Should not be included
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createSupabaseResponse(mockCompletions)),
          }),
        }),
      } as any);

      const result = await transactionService.getPendingEarnings(childId);

      // Only child_completed tasks: 8 + 5 = 13
      expect(result).toBe(13);
    });

    test('should handle child with no pending earnings', async () => {
      const childId = 'child-123';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createSupabaseResponse([])),
          }),
        }),
      } as any);

      const result = await transactionService.getPendingEarnings(childId);

      expect(result).toBe(0);
    });
  });

  describe('bulkCreateTransactions', () => {
    test('should create multiple transactions successfully', async () => {
      const transactionData = [
        {
          childId: 'child-123',
          amount: 10,
          type: 'earned' as const,
          taskCompletionId: 'completion-1',
        },
        {
          childId: 'child-123',
          amount: 5,
          type: 'earned' as const,
          taskCompletionId: 'completion-2',
        },
      ];

      const mockTransactions = [
        {
          id: 'transaction-1',
          child_id: 'child-123',
          amount: 10,
          type: 'earned',
          task_completion_id: 'completion-1',
        },
        {
          id: 'transaction-2',
          child_id: 'child-123',
          amount: 5,
          type: 'earned',
          task_completion_id: 'completion-2',
        },
      ];

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(createSupabaseResponse(mockTransactions)),
        }),
      } as any);

      const result = await transactionService.bulkCreateTransactions(transactionData);

      expect(result).toEqual(mockTransactions);
      expect(mockSupabase.from).toHaveBeenCalledWith('famcoin_transactions');
    });

    test('should handle bulk creation failure', async () => {
      const transactionData = [
        {
          childId: 'child-123',
          amount: 10,
          type: 'earned' as const,
        },
      ];

      const mockError = new Error('Bulk insert failed');

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(createSupabaseResponse(null, mockError)),
        }),
      } as any);

      await expect(
        transactionService.bulkCreateTransactions(transactionData)
      ).rejects.toThrow('Bulk insert failed');
    });
  });

  describe('getTransactionSummary', () => {
    test('should calculate transaction summary for a child', async () => {
      const childId = 'child-123';
      const mockTransactions = [
        { amount: 10, type: 'earned' },
        { amount: 5, type: 'earned' },
        { amount: 3, type: 'spent' },
        { amount: 2, type: 'bonus' },
        { amount: 1, type: 'adjusted' },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createSupabaseResponse(mockTransactions)),
        }),
      } as any);

      const result = await transactionService.getTransactionSummary(childId);

      expect(result).toEqual({
        totalEarned: 15, // 10 + 5
        totalSpent: 3,
        totalBonus: 2,
        totalAdjusted: 1,
        currentBalance: 15, // 10 + 5 - 3 + 2 + 1
        transactionCount: 5,
      });
    });

    test('should handle empty transaction history', async () => {
      const childId = 'child-123';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createSupabaseResponse([])),
        }),
      } as any);

      const result = await transactionService.getTransactionSummary(childId);

      expect(result).toEqual({
        totalEarned: 0,
        totalSpent: 0,
        totalBonus: 0,
        totalAdjusted: 0,
        currentBalance: 0,
        transactionCount: 0,
      });
    });
  });
});