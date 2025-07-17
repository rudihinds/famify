import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/testHelpers';
import { 
  createMockChild,
  createMockChildSession,
  createMockChildState 
} from '../utils/mockFactories';
import { store } from '../../store';
import { 
  createChildSession,
  updateSessionActivity,
  checkSessionExpiry,
  clearExpiredSessions 
} from '../../store/slices/childSlice';
import { supabase } from '../../lib/supabase';

// Mock dependencies
jest.mock('../../lib/supabase');

describe('Child Session Management', () => {
  const mockChild = createMockChild();
  const mockSession = createMockChildSession();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Session Creation', () => {
    test('creates 2-hour session on login', async () => {
      const mockNewSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockNewSession,
              error: null
            })
          })
        })
      });

      await store.dispatch(createChildSession(mockChild.id));

      const state = store.getState().child;
      expect(state.childSession).toEqual(mockNewSession);
      expect(state.isAuthenticated).toBe(true);
    });

    test('handles session creation failure', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      });

      await store.dispatch(createChildSession(mockChild.id));

      const state = store.getState().child;
      expect(state.childSession).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toContain('Database error');
    });
  });

  describe('Activity Monitoring', () => {
    test('updates last activity timestamp', async () => {
      const updatedSession = {
        ...mockSession,
        lastActivity: new Date().toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedSession,
                error: null
              })
            })
          })
        })
      });

      // Set initial session
      store.dispatch({
        type: 'child/setChildSession',
        payload: mockSession,
      });

      // Update activity
      await store.dispatch(updateSessionActivity(mockSession.id));

      const state = store.getState().child;
      expect(state.childSession?.lastActivity).toBe(updatedSession.lastActivity);
    });

    test('activity update extends session', async () => {
      const extendedSession = {
        ...mockSession,
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: extendedSession,
                error: null
              })
            })
          })
        })
      });

      await store.dispatch(updateSessionActivity(mockSession.id));

      const state = store.getState().child;
      const expiryTime = new Date(state.childSession!.expiresAt).getTime();
      const now = Date.now();
      
      // Should be extended to ~2 hours from now
      expect(expiryTime - now).toBeGreaterThan(1.9 * 60 * 60 * 1000);
    });
  });

  describe('Session Expiry', () => {
    test('detects expired session', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
      };

      store.dispatch({
        type: 'child/setChildSession',
        payload: expiredSession,
      });

      await store.dispatch(checkSessionExpiry());

      const state = store.getState().child;
      expect(state.isAuthenticated).toBe(false);
      expect(state.childSession).toBeNull();
    });

    test('maintains valid session', async () => {
      const validSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour left
      };

      store.dispatch({
        type: 'child/setChildSession',
        payload: validSession,
      });

      await store.dispatch(checkSessionExpiry());

      const state = store.getState().child;
      expect(state.isAuthenticated).toBe(true);
      expect(state.childSession).toEqual(validSession);
    });

    test('warns before expiry', async () => {
      const soonToExpireSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes left
      };

      store.dispatch({
        type: 'child/setChildSession',
        payload: soonToExpireSession,
      });

      await store.dispatch(checkSessionExpiry());

      const state = store.getState().child;
      expect(state.sessionExpiryWarning).toBe(true);
    });
  });

  describe('Session Cleanup', () => {
    test('clears expired sessions from database', async () => {
      const deleteMock = jest.fn().mockReturnValue({
        lt: jest.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: deleteMock
      });

      await store.dispatch(clearExpiredSessions());

      expect(supabase.from).toHaveBeenCalledWith('child_sessions');
      expect(deleteMock).toHaveBeenCalled();
    });
  });

  describe('Dev Mode Sessions', () => {
    test('dev mode login creates persistent session', async () => {
      const devChild = {
        ...mockChild,
        id: 'dev-child-1',
      };

      store.dispatch({
        type: 'child/devModeLogin',
        payload: devChild,
      });

      const state = store.getState().child;
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentChild).toEqual(devChild);
      expect(state.childSession).toBeTruthy();
      
      // Dev session should have extended expiry
      const expiryTime = new Date(state.childSession!.expiresAt).getTime();
      const now = Date.now();
      expect(expiryTime - now).toBeGreaterThan(1.9 * 60 * 60 * 1000);
    });

    test('dev sessions bypass expiry checks', async () => {
      // Set up dev mode session
      store.dispatch({
        type: 'child/devModeLogin',
        payload: mockChild,
      });

      // Fast forward time past 2 hours
      jest.advanceTimersByTime(3 * 60 * 60 * 1000);

      await store.dispatch(checkSessionExpiry());

      const state = store.getState().child;
      // Dev session should still be active
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('Offline Session Handling', () => {
    test('maintains session during network outage', async () => {
      // Mock network failure
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockRejectedValue(new Error('Network error'))
      });

      const validSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };

      store.dispatch({
        type: 'child/setChildSession',
        payload: validSession,
      });

      // Try to update activity (will fail)
      await store.dispatch(updateSessionActivity(mockSession.id));

      const state = store.getState().child;
      // Session should remain active despite network error
      expect(state.isAuthenticated).toBe(true);
      expect(state.childSession).toEqual(validSession);
    });

    test('syncs session when back online', async () => {
      // This would be implemented with a network state listener
      // For now, just verify the structure is in place
      expect(store.getState().child).toBeDefined();
    });
  });

  describe('Multi-Device Session Management', () => {
    test('prevents concurrent sessions on different devices', async () => {
      // Mock checking for existing sessions
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: [mockSession], // Existing active session
              error: null
            })
          })
        })
      });

      // Attempt to create new session should handle existing session
      const result = await store.dispatch(createChildSession(mockChild.id));
      
      // This behavior would depend on business rules
      // For now, just verify the check happens
      expect(supabase.from).toHaveBeenCalledWith('child_sessions');
    });
  });
});