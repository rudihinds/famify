import { supabase } from '../../lib/supabase';

// Mock Supabase client first
jest.mock('../../lib/supabase');

describe('TransactionService Integration Tests', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Service Methods Exist and Are Callable', () => {
    test('transactionService exports and has expected methods', () => {
      const { transactionService } = require('../../services/transactionService');
      
      expect(transactionService).toBeDefined();
      expect(typeof transactionService.createPendingTransaction).toBe('function');
      expect(typeof transactionService.updateChildBalance).toBe('function');
      expect(typeof transactionService.getTransactionHistory).toBe('function');
      expect(typeof transactionService.completeTaskWithTransaction).toBe('function');
      expect(typeof transactionService.getPendingEarnings).toBe('function');
    });

    test('createPendingTransaction returns promise', async () => {
      const { transactionService } = require('../../services/transactionService');
      
      // Mock Supabase response
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { 
                id: 'transaction-123', 
                child_id: 'child-123', 
                amount: 10,
                type: 'earned' 
              }, 
              error: null 
            }),
          }),
        }),
      } as any);

      const result = await transactionService.createPendingTransaction('child-123', 'completion-123', 10);
      expect(result).toBeDefined();
      expect(result.id).toBe('transaction-123');
    });

    test('updateChildBalance returns promise', async () => {
      const { transactionService } = require('../../services/transactionService');
      
      // Mock Supabase response for balance update
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: { famcoin_balance: 60 }, 
                error: null 
              }),
            }),
          }),
        }),
      } as any);

      const result = await transactionService.updateChildBalance('child-123', 10);
      expect(typeof result).toBe('number');
    });

    test('getTransactionHistory returns promise', async () => {
      const { transactionService } = require('../../services/transactionService');
      
      // Mock Supabase response
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      } as any);

      const result = await transactionService.getTransactionHistory('child-123');
      expect(Array.isArray(result)).toBe(true);
    });

    test('getPendingEarnings returns promise', async () => {
      const { transactionService } = require('../../services/transactionService');
      
      // Mock Supabase response
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any);

      const result = await transactionService.getPendingEarnings('child-123');
      expect(typeof result).toBe('number');
    });

    test('completeTaskWithTransaction handles success', async () => {
      const { transactionService } = require('../../services/transactionService');
      
      // Mock Supabase responses for both task completion and transaction
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: { id: 'completion-123', status: 'child_completed' }, 
                error: null 
              }),
            }),
          }),
        }),
      } as any);

      const result = await transactionService.completeTaskWithTransaction(
        'completion-123', 
        'child-123', 
        10
      );
      expect(result).toBeDefined();
      expect(result.completion).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('createPendingTransaction handles database errors', async () => {
      const { transactionService } = require('../../services/transactionService');
      
      // Mock Supabase error
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Database error' } 
            }),
          }),
        }),
      } as any);

      await expect(
        transactionService.createPendingTransaction('child-123', 'completion-123', 10)
      ).rejects.toThrow();
    });

    test('updateChildBalance handles invalid child', async () => {
      const { transactionService } = require('../../services/transactionService');
      
      // Mock Supabase error for invalid child
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: null, 
                error: { message: 'Child not found' } 
              }),
            }),
          }),
        }),
      } as any);

      await expect(
        transactionService.updateChildBalance('nonexistent-child', 10)
      ).rejects.toThrow();
    });

    test('getTransactionHistory handles database errors', async () => {
      const { transactionService } = require('../../services/transactionService');
      
      // Mock Supabase error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ 
                data: null, 
                error: { message: 'Database error' } 
              }),
            }),
          }),
        }),
      } as any);

      await expect(
        transactionService.getTransactionHistory('child-123')
      ).rejects.toThrow();
    });
  });

  describe('Business Logic Validation', () => {
    test('createPendingTransaction validates amount', async () => {
      const { transactionService } = require('../../services/transactionService');
      
      // Mock valid response
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { 
                id: 'transaction-123', 
                child_id: 'child-123', 
                amount: 10,
                type: 'earned' 
              }, 
              error: null 
            }),
          }),
        }),
      } as any);

      const result = await transactionService.createPendingTransaction('child-123', 'completion-123', 10);
      expect(result.amount).toBe(10);
      expect(result.type).toBe('earned');
    });

    test('getPendingEarnings calculates correctly', async () => {
      const { transactionService } = require('../../services/transactionService');
      
      // Mock completions with pending earnings
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ 
              data: [
                { famcoin_value: 5, status: 'child_completed' },
                { famcoin_value: 10, status: 'child_completed' },
                { famcoin_value: 8, status: 'parent_approved' }, // Should not count
              ], 
              error: null 
            }),
          }),
        }),
      } as any);

      const result = await transactionService.getPendingEarnings('child-123');
      expect(result).toBe(15); // 5 + 10, excluding the approved one
    });
  });
});