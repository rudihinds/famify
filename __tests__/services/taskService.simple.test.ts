import { supabase } from '../../lib/supabase';

// Mock Supabase client first
jest.mock('../../lib/supabase');

describe('TaskService Integration Tests', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Service Methods Exist and Are Callable', () => {
    test('taskService exports and has expected methods', () => {
      const { taskService } = require('../../services/taskService');
      
      expect(taskService).toBeDefined();
      expect(typeof taskService.getDailyTasks).toBe('function');
      expect(typeof taskService.getTaskDetails).toBe('function');
      expect(typeof taskService.getTaskCategories).toBe('function');
      expect(typeof taskService.getTaskTemplates).toBe('function');
      expect(typeof taskService.markTaskComplete).toBe('function');
      expect(typeof taskService.uploadTaskPhoto).toBe('function');
      expect(typeof taskService.approveTaskCompletion).toBe('function');
      expect(typeof taskService.rejectTaskCompletion).toBe('function');
      expect(typeof taskService.getParentReviewTasksByDate).toBe('function');
    });

    test('getDailyTasks returns promise', async () => {
      const { taskService } = require('../../services/taskService');
      
      // Mock Supabase response
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      } as any);

      const result = await taskService.getDailyTasks('child-123', '2024-01-15');
      expect(Array.isArray(result)).toBe(true);
    });

    test('getTaskDetails returns promise', async () => {
      const { taskService } = require('../../services/taskService');
      
      // Mock Supabase response
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { id: 'task-123', taskName: 'Test Task' }, 
              error: null 
            }),
          }),
        }),
      } as any);

      const result = await taskService.getTaskDetails('task-123');
      expect(result).toBeDefined();
    });

    test('getTaskCategories returns promise', async () => {
      const { taskService } = require('../../services/taskService');
      
      // Mock Supabase response
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any);

      const result = await taskService.getTaskCategories();
      expect(Array.isArray(result)).toBe(true);
    });

    test('markTaskComplete handles success', async () => {
      const { taskService } = require('../../services/taskService');
      
      // Mock Supabase response
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

      await expect(taskService.markTaskComplete('completion-123')).resolves.not.toThrow();
    });

    test('approveTaskCompletion handles success', async () => {
      const { taskService } = require('../../services/taskService');
      
      // Mock Supabase response for approval
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: { id: 'completion-123', status: 'parent_approved' }, 
                error: null 
              }),
            }),
          }),
        }),
      } as any);

      const result = await taskService.approveTaskCompletion('completion-123', 'parent-123');
      expect(result).toBeDefined();
      expect(result.completion).toBeDefined();
    });

    test('rejectTaskCompletion handles success', async () => {
      const { taskService } = require('../../services/taskService');
      
      // Mock Supabase response for rejection
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: { id: 'completion-123', status: 'parent_rejected' }, 
                error: null 
              }),
            }),
          }),
        }),
      } as any);

      const result = await taskService.rejectTaskCompletion('completion-123', 'parent-123', 'Not done properly');
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('getDailyTasks handles database errors', async () => {
      const { taskService } = require('../../services/taskService');
      
      // Mock Supabase error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
            }),
          }),
        }),
      } as any);

      await expect(taskService.getDailyTasks('child-123', '2024-01-15')).rejects.toThrow();
    });

    test('getTaskDetails handles not found', async () => {
      const { taskService } = require('../../services/taskService');
      
      // Mock Supabase not found
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: null, 
              error: { code: 'PGRST116', message: 'Not found' } 
            }),
          }),
        }),
      } as any);

      await expect(taskService.getTaskDetails('nonexistent-task')).rejects.toThrow();
    });
  });
});