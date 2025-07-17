import { supabase } from '../../lib/supabase';

// Mock Supabase client first
jest.mock('../../lib/supabase');

describe('ChildService Integration Tests', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Service Methods Exist and Are Callable', () => {
    test('childService exports and has expected methods', () => {
      const { childService } = require('../../services/childService');
      
      expect(childService).toBeDefined();
      expect(typeof childService.getChildrenByParentId).toBe('function');
      expect(typeof childService.createChild).toBe('function');
      expect(typeof childService.deleteChild).toBe('function');
      expect(typeof childService.deleteAllChildrenForParent).toBe('function');
      expect(typeof childService.updateChild).toBe('function');
      expect(typeof childService.hasChildren).toBe('function');
    });

    test('getChildrenByParentId returns promise', async () => {
      const { childService } = require('../../services/childService');
      
      // Mock Supabase response
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any);

      const result = await childService.getChildrenByParentId('parent-123');
      expect(Array.isArray(result)).toBe(true);
    });

    test('createChild returns promise', async () => {
      const { childService } = require('../../services/childService');
      
      // Mock Supabase response
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { 
                id: 'child-123', 
                parent_id: 'parent-123',
                name: 'Emma',
                age: 8 
              }, 
              error: null 
            }),
          }),
        }),
      } as any);

      const result = await childService.createChild({
        parent_id: 'parent-123',
        name: 'Emma',
        age: 8,
        pin_hash: 'hash123'
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('child-123');
    });

    test('updateChild returns promise', async () => {
      const { childService } = require('../../services/childService');
      
      // Mock Supabase response
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: { 
                  id: 'child-123', 
                  name: 'Emma Rose',
                  age: 9 
                }, 
                error: null 
              }),
            }),
          }),
        }),
      } as any);

      const result = await childService.updateChild('child-123', { name: 'Emma Rose', age: 9 });
      expect(result).toBeDefined();
      expect(result.name).toBe('Emma Rose');
    });

    test('deleteChild returns promise', async () => {
      const { childService } = require('../../services/childService');
      
      // Mock Supabase response
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as any);

      await expect(childService.deleteChild('child-123')).resolves.not.toThrow();
    });

    test('hasChildren returns promise', async () => {
      const { childService } = require('../../services/childService');
      
      // Mock Supabase response
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [{ id: 'child-123' }], error: null }),
          }),
        }),
      } as any);

      const result = await childService.hasChildren('parent-123');
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });

    test('deleteAllChildrenForParent returns promise', async () => {
      const { childService } = require('../../services/childService');
      
      // Mock Supabase response
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as any);

      const result = await childService.deleteAllChildrenForParent('parent-123');
      expect(typeof result).toBe('number');
    });
  });

  describe('Error Handling', () => {
    test('getChildrenByParentId handles database errors', async () => {
      const { childService } = require('../../services/childService');
      
      // Mock Supabase error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
          }),
        }),
      } as any);

      await expect(childService.getChildrenByParentId('parent-123')).rejects.toThrow();
    });

    test('createChild handles validation errors', async () => {
      const { childService } = require('../../services/childService');
      
      // Mock Supabase validation error
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Validation error' } 
            }),
          }),
        }),
      } as any);

      await expect(childService.createChild({ name: 'Emma' })).rejects.toThrow();
    });

    test('updateChild handles child not found', async () => {
      const { childService } = require('../../services/childService');
      
      // Mock Supabase not found error
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: null, 
                error: { code: 'PGRST116', message: 'Child not found' } 
              }),
            }),
          }),
        }),
      } as any);

      await expect(childService.updateChild('nonexistent-child', { name: 'Emma' })).rejects.toThrow();
    });

    test('deleteChild handles child not found', async () => {
      const { childService } = require('../../services/childService');
      
      // Mock Supabase error
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Child not found' } }),
        }),
      } as any);

      await expect(childService.deleteChild('nonexistent-child')).rejects.toThrow();
    });
  });

  describe('Business Logic Validation', () => {
    test('createChild validates required fields', async () => {
      const { childService } = require('../../services/childService');
      
      const childData = {
        parent_id: 'parent-123',
        name: 'Emma',
        age: 8,
        pin_hash: 'hash123'
      };

      // Mock successful creation
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { 
                id: 'child-123', 
                ...childData 
              }, 
              error: null 
            }),
          }),
        }),
      } as any);

      const result = await childService.createChild(childData);
      expect(result.parent_id).toBe('parent-123');
      expect(result.name).toBe('Emma');
      expect(result.age).toBe(8);
    });

    test('hasChildren returns false when no children exist', async () => {
      const { childService } = require('../../services/childService');
      
      // Mock empty response
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any);

      const result = await childService.hasChildren('parent-123');
      expect(result).toBe(false);
    });

    test('deleteAllChildrenForParent returns count', async () => {
      const { childService } = require('../../services/childService');
      
      // Mock successful deletion
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as any);

      const result = await childService.deleteAllChildrenForParent('parent-123');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});