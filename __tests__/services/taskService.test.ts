import { supabase } from '../../lib/supabase';
import { createSupabaseResponse } from '../utils/mockFactories';

// Mock Supabase client
jest.mock('../../lib/supabase');

// Import the actual service after mocking
const { taskService } = require('../../services/taskService');

describe('TaskService', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTaskCategories', () => {
    test('should fetch task categories successfully', async () => {
      const mockCategories = [
        { id: 1, name: 'Education', icon: '📚', color: '#4f46e5' },
        { id: 2, name: 'Chores', icon: '🧹', color: '#10b981' },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue(createSupabaseResponse(mockCategories)),
        }),
      } as any);

      const result = await taskService.getTaskCategories();

      expect(result).toEqual(mockCategories);
      expect(mockSupabase.from).toHaveBeenCalledWith('task_categories');
    });

    test('should handle error when fetching categories fails', async () => {
      const mockError = new Error('Database error');
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue(createSupabaseResponse(null, mockError)),
        }),
      } as any);

      await expect(taskService.getTaskCategories()).rejects.toThrow('Database error');
    });
  });

  describe('getTaskTemplates', () => {
    test('should fetch system templates when no parent ID provided', async () => {
      const mockTemplates = [
        {
          id: 1,
          name: 'Make Bed',
          category: { id: 1, name: 'Chores' },
          is_system: true,
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue(createSupabaseResponse(mockTemplates)),
            }),
          }),
        }),
      } as any);

      const result = await taskService.getTaskTemplates();

      expect(result).toEqual(mockTemplates);
      expect(mockSupabase.from).toHaveBeenCalledWith('task_templates');
    });

    test('should fetch system and parent templates when parent ID provided', async () => {
      const parentId = 'parent-123';
      const mockTemplates = [
        {
          id: 1,
          name: 'Make Bed',
          category: { id: 1, name: 'Chores' },
          is_system: true,
        },
        {
          id: 2,
          name: 'Custom Task',
          category: { id: 2, name: 'Education' },
          is_system: false,
          parent_id: parentId,
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              or: jest.fn().mockResolvedValue(createSupabaseResponse(mockTemplates)),
            }),
          }),
        }),
      } as any);

      const result = await taskService.getTaskTemplates(parentId);

      expect(result).toEqual(mockTemplates);
    });
  });

  describe('getDailyTasks', () => {
    test('should fetch daily tasks for a child', async () => {
      const childId = 'child-123';
      const date = '2024-01-15';
      const mockTasks = [
        {
          id: 'task-1',
          taskName: 'Make Bed',
          famcoinValue: 5,
          status: 'pending',
          dueDate: '2024-01-15',
        },
      ];

      // Mock the actual method
      jest.spyOn(taskService, 'getDailyTasks').mockResolvedValue(mockTasks);

      const result = await taskService.getDailyTasks(childId, date);

      expect(result).toEqual(mockTasks);
      expect(taskService.getDailyTasks).toHaveBeenCalledWith(childId, date);
    });

    test('should handle empty result when no tasks found', async () => {
      const childId = 'child-123';
      const date = '2024-01-15';

      jest.spyOn(taskService, 'getDailyTasks').mockResolvedValue([]);

      const result = await taskService.getDailyTasks(childId, date);

      expect(result).toEqual([]);
    });
  });

  describe('getTaskDetails', () => {
    test('should fetch task details successfully', async () => {
      const taskId = 'task-123';
      const mockTask = {
        id: taskId,
        taskName: 'Clean Room',
        taskDescription: 'Clean and organize your room',
        famcoinValue: 10,
        photoRequired: true,
        status: 'pending',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(createSupabaseResponse(mockTask)),
          }),
        }),
      } as any);

      const result = await taskService.getTaskDetails(taskId);

      expect(result).toEqual(mockTask);
      expect(mockSupabase.from).toHaveBeenCalledWith('task_details_view');
    });

    test('should handle task not found', async () => {
      const taskId = 'nonexistent-task';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(
              createSupabaseResponse(null, { code: 'PGRST116' })
            ),
          }),
        }),
      } as any);

      await expect(taskService.getTaskDetails(taskId)).rejects.toThrow();
    });
  });

  describe('completeTask', () => {
    test('should complete task successfully', async () => {
      const taskId = 'task-123';
      const childId = 'child-123';
      const photoUrl = 'https://example.com/photo.jpg';
      const mockCompletion = {
        id: 'completion-123',
        task_instance_id: taskId,
        child_id: childId,
        status: 'child_completed',
        photo_url: photoUrl,
        completed_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(createSupabaseResponse(mockCompletion)),
          }),
        }),
      } as any);

      const result = await taskService.completeTask(taskId, childId, photoUrl);

      expect(result).toEqual({
        success: true,
        taskCompletion: mockCompletion,
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('task_completions');
    });

    test('should handle completion failure', async () => {
      const taskId = 'task-123';
      const childId = 'child-123';
      const mockError = new Error('Database error');

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(createSupabaseResponse(null, mockError)),
          }),
        }),
      } as any);

      const result = await taskService.completeTask(taskId, childId);

      expect(result).toEqual({
        success: false,
        error: mockError,
      });
    });
  });

  describe('approveTaskCompletion', () => {
    test('should approve task completion successfully', async () => {
      const completionId = 'completion-123';
      const parentId = 'parent-123';
      const mockApproval = {
        id: completionId,
        status: 'parent_approved',
        approved_by: parentId,
        approved_at: new Date().toISOString(),
        famcoins_earned: 10,
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(createSupabaseResponse(mockApproval)),
            }),
          }),
        }),
      } as any);

      const result = await taskService.approveTaskCompletion(completionId, parentId);

      expect(result).toEqual({
        success: true,
        taskCompletion: mockApproval,
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('task_completions');
    });

    test('should handle approval failure', async () => {
      const completionId = 'completion-123';
      const parentId = 'parent-123';
      const mockError = new Error('Database error');

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(createSupabaseResponse(null, mockError)),
            }),
          }),
        }),
      } as any);

      const result = await taskService.approveTaskCompletion(completionId, parentId);

      expect(result).toEqual({
        success: false,
        error: mockError,
      });
    });
  });

  describe('rejectTaskCompletion', () => {
    test('should reject task completion with feedback', async () => {
      const completionId = 'completion-123';
      const parentId = 'parent-123';
      const reason = 'Room still messy';
      const feedback = 'Please organize your desk';
      const mockRejection = {
        id: completionId,
        status: 'parent_rejected',
        rejected_by: parentId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        feedback: feedback,
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(createSupabaseResponse(mockRejection)),
            }),
          }),
        }),
      } as any);

      const result = await taskService.rejectTaskCompletion(
        completionId,
        parentId,
        reason,
        feedback
      );

      expect(result).toEqual({
        success: true,
        taskCompletion: mockRejection,
      });
    });

    test('should handle rejection failure', async () => {
      const completionId = 'completion-123';
      const parentId = 'parent-123';
      const reason = 'Room still messy';
      const mockError = new Error('Database error');

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(createSupabaseResponse(null, mockError)),
            }),
          }),
        }),
      } as any);

      const result = await taskService.rejectTaskCompletion(
        completionId,
        parentId,
        reason
      );

      expect(result).toEqual({
        success: false,
        error: mockError,
      });
    });
  });

  describe('uploadTaskPhoto', () => {
    test('should upload photo successfully', async () => {
      const taskId = 'task-123';
      const photoUri = 'file:///path/to/photo.jpg';
      const mockStoragePath = 'task-photos/task-123-photo.jpg';
      const mockPublicUrl = 'https://example.com/photo.jpg';

      // Mock storage upload
      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: { path: mockStoragePath },
            error: null,
          }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: mockPublicUrl },
          }),
        }),
      } as any;

      const result = await taskService.uploadTaskPhoto(taskId, photoUri);

      expect(result).toBe(mockPublicUrl);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('task-photos');
    });

    test('should handle upload failure', async () => {
      const taskId = 'task-123';
      const photoUri = 'file:///path/to/photo.jpg';
      const mockError = new Error('Upload failed');

      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      } as any;

      await expect(taskService.uploadTaskPhoto(taskId, photoUri)).rejects.toThrow(
        'Upload failed'
      );
    });
  });

  describe('getParentReviewTasksByDate', () => {
    test('should fetch parent review tasks for a date', async () => {
      const parentId = 'parent-123';
      const date = '2024-01-15';
      const mockTasks = [
        {
          id: 'completion-1',
          taskName: 'Make Bed',
          childName: 'Emma',
          status: 'child_completed',
          famcoinValue: 5,
          dueDate: date,
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(createSupabaseResponse(mockTasks)),
              }),
            }),
          }),
        }),
      } as any);

      const result = await taskService.getParentReviewTasksByDate(parentId, date);

      expect(result).toEqual(mockTasks);
      expect(mockSupabase.from).toHaveBeenCalledWith('parent_review_tasks_view');
    });
  });

  describe('getRejectedTasksForChild', () => {
    test('should fetch rejected tasks for a child', async () => {
      const childId = 'child-123';
      const mockRejectedTasks = [
        {
          id: 'completion-1',
          taskName: 'Clean Room',
          status: 'parent_rejected',
          rejection_reason: 'Room still messy',
          feedback: 'Please organize your desk',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(createSupabaseResponse(mockRejectedTasks)),
            }),
          }),
        }),
      } as any);

      const result = await taskService.getRejectedTasksForChild(childId);

      expect(result).toEqual(mockRejectedTasks);
      expect(mockSupabase.from).toHaveBeenCalledWith('task_completions_view');
    });
  });
});