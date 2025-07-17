import { supabase } from '../../lib/supabase';
import { createSupabaseResponse } from '../utils/mockFactories';

// Mock Supabase client
jest.mock('../../lib/supabase');

// Import the actual service after mocking
const { childService } = require('../../services/childService');

describe('ChildService', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getChildrenByParentId', () => {
    test('should fetch children for a parent successfully', async () => {
      const parentId = 'parent-123';
      const mockChildren = [
        {
          id: 'child-1',
          parent_id: parentId,
          name: 'Emma',
          age: 8,
          pin_hash: 'hash123',
          famcoin_balance: 50,
          avatar_url: null,
          focus_areas: ['reading', 'chores'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'child-2',
          parent_id: parentId,
          name: 'Liam',
          age: 10,
          pin_hash: 'hash456',
          famcoin_balance: 75,
          avatar_url: 'https://example.com/avatar.jpg',
          focus_areas: ['math', 'sports'],
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(createSupabaseResponse(mockChildren)),
          }),
        }),
      } as any);

      const result = await childService.getChildrenByParentId(parentId);

      expect(result).toEqual(mockChildren);
      expect(mockSupabase.from).toHaveBeenCalledWith('children');
    });

    test('should handle parent with no children', async () => {
      const parentId = 'parent-123';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(createSupabaseResponse([])),
          }),
        }),
      } as any);

      const result = await childService.getChildrenByParentId(parentId);

      expect(result).toEqual([]);
    });

    test('should handle database error', async () => {
      const parentId = 'parent-123';
      const mockError = new Error('Database error');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(createSupabaseResponse(null, mockError)),
          }),
        }),
      } as any);

      await expect(childService.getChildrenByParentId(parentId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('createChild', () => {
    test('should create a new child successfully', async () => {
      const childData = {
        parent_id: 'parent-123',
        name: 'Emma',
        age: 8,
        pin_hash: 'hash123',
        famcoin_balance: 0,
        focus_areas: ['reading', 'chores'],
      };

      const mockCreatedChild = {
        id: 'child-123',
        ...childData,
        avatar_url: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(createSupabaseResponse(mockCreatedChild)),
          }),
        }),
      } as any);

      const result = await childService.createChild(childData);

      expect(result).toEqual(mockCreatedChild);
      expect(mockSupabase.from).toHaveBeenCalledWith('children');
    });

    test('should handle creation failure', async () => {
      const childData = {
        parent_id: 'parent-123',
        name: 'Emma',
        age: 8,
        pin_hash: 'hash123',
      };

      const mockError = new Error('Unique constraint violation');

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(createSupabaseResponse(null, mockError)),
          }),
        }),
      } as any);

      await expect(childService.createChild(childData)).rejects.toThrow(
        'Unique constraint violation'
      );
    });
  });

  describe('updateChild', () => {
    test('should update child profile successfully', async () => {
      const childId = 'child-123';
      const updateData = {
        name: 'Emma Rose',
        age: 9,
        focus_areas: ['reading', 'chores', 'music'],
      };

      const mockUpdatedChild = {
        id: childId,
        parent_id: 'parent-123',
        ...updateData,
        pin_hash: 'hash123',
        famcoin_balance: 50,
        avatar_url: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(createSupabaseResponse(mockUpdatedChild)),
            }),
          }),
        }),
      } as any);

      const result = await childService.updateChild(childId, updateData);

      expect(result).toEqual(mockUpdatedChild);
      expect(mockSupabase.from).toHaveBeenCalledWith('children');
    });

    test('should handle update failure', async () => {
      const childId = 'child-123';
      const updateData = { name: 'Emma Rose' };
      const mockError = new Error('Child not found');

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(createSupabaseResponse(null, mockError)),
            }),
          }),
        }),
      } as any);

      await expect(childService.updateChild(childId, updateData)).rejects.toThrow(
        'Child not found'
      );
    });
  });

  describe('deleteChild', () => {
    test('should delete child successfully', async () => {
      const childId = 'child-123';

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createSupabaseResponse(null)),
        }),
      } as any);

      await childService.deleteChild(childId);

      expect(mockSupabase.from).toHaveBeenCalledWith('children');
      expect(mockSupabase.from().delete).toHaveBeenCalled();
    });

    test('should handle deletion failure', async () => {
      const childId = 'child-123';
      const mockError = new Error('Child not found');

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createSupabaseResponse(null, mockError)),
        }),
      } as any);

      await expect(childService.deleteChild(childId)).rejects.toThrow('Child not found');
    });
  });

  describe('getChildById', () => {
    test('should fetch child by ID successfully', async () => {
      const childId = 'child-123';
      const mockChild = {
        id: childId,
        parent_id: 'parent-123',
        name: 'Emma',
        age: 8,
        pin_hash: 'hash123',
        famcoin_balance: 50,
        avatar_url: null,
        focus_areas: ['reading', 'chores'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(createSupabaseResponse(mockChild)),
          }),
        }),
      } as any);

      const result = await childService.getChildById(childId);

      expect(result).toEqual(mockChild);
      expect(mockSupabase.from).toHaveBeenCalledWith('children');
    });

    test('should handle child not found', async () => {
      const childId = 'nonexistent-child';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(
              createSupabaseResponse(null, { code: 'PGRST116' })
            ),
          }),
        }),
      } as any);

      await expect(childService.getChildById(childId)).rejects.toThrow();
    });
  });

  describe('updateChildBalance', () => {
    test('should update child balance successfully', async () => {
      const childId = 'child-123';
      const newBalance = 75;

      const mockUpdatedChild = {
        id: childId,
        parent_id: 'parent-123',
        name: 'Emma',
        age: 8,
        pin_hash: 'hash123',
        famcoin_balance: newBalance,
        avatar_url: null,
        focus_areas: ['reading', 'chores'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(createSupabaseResponse(mockUpdatedChild)),
            }),
          }),
        }),
      } as any);

      const result = await childService.updateChildBalance(childId, newBalance);

      expect(result).toEqual(mockUpdatedChild);
      expect(mockSupabase.from).toHaveBeenCalledWith('children');
    });

    test('should handle balance update failure', async () => {
      const childId = 'child-123';
      const newBalance = 75;
      const mockError = new Error('Child not found');

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(createSupabaseResponse(null, mockError)),
            }),
          }),
        }),
      } as any);

      await expect(childService.updateChildBalance(childId, newBalance)).rejects.toThrow(
        'Child not found'
      );
    });
  });

  describe('validateChildPin', () => {
    test('should validate correct PIN successfully', async () => {
      const childId = 'child-123';
      const pin = '1234';
      const hashedPin = 'hashed_pin_123';

      const mockChild = {
        id: childId,
        pin_hash: hashedPin,
        name: 'Emma',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(createSupabaseResponse(mockChild)),
          }),
        }),
      } as any);

      // Mock PIN validation logic (would normally use bcrypt or similar)
      const mockValidatePinHash = jest.fn().mockReturnValue(true);
      (childService as any).validatePinHash = mockValidatePinHash;

      const result = await childService.validateChildPin(childId, pin);

      expect(result).toBe(true);
      expect(mockValidatePinHash).toHaveBeenCalledWith(pin, hashedPin);
    });

    test('should reject incorrect PIN', async () => {
      const childId = 'child-123';
      const pin = '9999';
      const hashedPin = 'hashed_pin_123';

      const mockChild = {
        id: childId,
        pin_hash: hashedPin,
        name: 'Emma',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(createSupabaseResponse(mockChild)),
          }),
        }),
      } as any);

      const mockValidatePinHash = jest.fn().mockReturnValue(false);
      (childService as any).validatePinHash = mockValidatePinHash;

      const result = await childService.validateChildPin(childId, pin);

      expect(result).toBe(false);
      expect(mockValidatePinHash).toHaveBeenCalledWith(pin, hashedPin);
    });

    test('should handle child not found', async () => {
      const childId = 'nonexistent-child';
      const pin = '1234';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(
              createSupabaseResponse(null, { code: 'PGRST116' })
            ),
          }),
        }),
      } as any);

      await expect(childService.validateChildPin(childId, pin)).rejects.toThrow();
    });
  });

  describe('updateChildAvatar', () => {
    test('should update child avatar URL successfully', async () => {
      const childId = 'child-123';
      const avatarUrl = 'https://example.com/new-avatar.jpg';

      const mockUpdatedChild = {
        id: childId,
        parent_id: 'parent-123',
        name: 'Emma',
        age: 8,
        pin_hash: 'hash123',
        famcoin_balance: 50,
        avatar_url: avatarUrl,
        focus_areas: ['reading', 'chores'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(createSupabaseResponse(mockUpdatedChild)),
            }),
          }),
        }),
      } as any);

      const result = await childService.updateChildAvatar(childId, avatarUrl);

      expect(result).toEqual(mockUpdatedChild);
      expect(mockSupabase.from).toHaveBeenCalledWith('children');
    });

    test('should handle avatar update failure', async () => {
      const childId = 'child-123';
      const avatarUrl = 'https://example.com/new-avatar.jpg';
      const mockError = new Error('Child not found');

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(createSupabaseResponse(null, mockError)),
            }),
          }),
        }),
      } as any);

      await expect(childService.updateChildAvatar(childId, avatarUrl)).rejects.toThrow(
        'Child not found'
      );
    });
  });
});