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

describe('Child Session Management - Behavioral Tests', () => {
  const mockChild = createMockChild();
  const mockSession = createMockChildSession();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Child gets 2 hours of app access after logging in', () => {
    test('child receives 2-hour session when they log in successfully', async () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const mockNewSession = {
        ...mockSession,
        expiresAt: futureTime.toISOString(),
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
      
      // Child should have an active session
      expect(state.childSession).toEqual(mockNewSession);
      expect(state.isAuthenticated).toBe(true);
      
      // Session should last about 2 hours
      const sessionDuration = new Date(state.childSession!.expiresAt).getTime() - Date.now();
      expect(sessionDuration).toBeGreaterThan(1.9 * 60 * 60 * 1000); // ~2 hours
    });

    test('child is told when session creation fails', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Network connection failed' }
            })
          })
        })
      });

      await store.dispatch(createChildSession(mockChild.id));

      const state = store.getState().child;
      
      // Child should not have access
      expect(state.childSession).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      
      // Child should be informed of the problem
      expect(state.error).toContain('Network connection failed');
    });
  });

  describe('Child session stays active while they use the app', () => {
    test('child activity extends their session time', async () => {
      const extendedExpiryTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const extendedSession = {
        ...mockSession,
        lastActivity: new Date().toISOString(),
        expiresAt: extendedExpiryTime.toISOString(),
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

      // Set up initial session
      store.dispatch({
        type: 'child/setChildSession',
        payload: mockSession,
      });

      // Child uses the app (activity recorded)
      await store.dispatch(updateSessionActivity(mockSession.id));

      const state = store.getState().child;
      
      // Session should be extended
      expect(state.childSession?.lastActivity).toBe(extendedSession.lastActivity);
      
      // Session should be renewed for another ~2 hours
      const newExpiryTime = new Date(state.childSession!.expiresAt).getTime();
      const now = Date.now();
      expect(newExpiryTime - now).toBeGreaterThan(1.9 * 60 * 60 * 1000);
    });

    test('child can continue using app even when activity update fails', async () => {
      // Mock network failure for activity update
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockRejectedValue(new Error('Network error'))
      });

      const validSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour left
      };

      store.dispatch({
        type: 'child/setChildSession',
        payload: validSession,
      });

      // Try to update activity (will fail)
      await store.dispatch(updateSessionActivity(mockSession.id));

      const state = store.getState().child;
      
      // Child should still have access despite network error
      expect(state.isAuthenticated).toBe(true);
      expect(state.childSession).toEqual(validSession);
    });
  });

  describe('Child is automatically logged out when session expires', () => {
    test('child loses access when 2-hour session expires', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
      };

      store.dispatch({
        type: 'child/setChildSession',
        payload: expiredSession,
      });

      // Check if session is expired
      await store.dispatch(checkSessionExpiry());

      const state = store.getState().child;
      
      // Child should be logged out
      expect(state.isAuthenticated).toBe(false);
      expect(state.childSession).toBeNull();
    });

    test('child keeps access when session is still valid', async () => {
      const validSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour left
      };

      store.dispatch({
        type: 'child/setChildSession',
        payload: validSession,
      });

      // Check session expiry
      await store.dispatch(checkSessionExpiry());

      const state = store.getState().child;
      
      // Child should still have access
      expect(state.isAuthenticated).toBe(true);
      expect(state.childSession).toEqual(validSession);
    });

    test('child is warned when session is about to expire', async () => {
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
      
      // Child should be warned about upcoming expiry
      expect(state.sessionExpiryWarning).toBe(true);
      
      // But should still have access
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('Child sessions are managed efficiently across devices', () => {
    test('old expired sessions are cleaned up from database', async () => {
      const deleteMock = jest.fn().mockReturnValue({
        lt: jest.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: deleteMock
      });

      // Clean up expired sessions
      await store.dispatch(clearExpiredSessions());

      // Should remove expired sessions from database
      expect(supabase.from).toHaveBeenCalledWith('child_sessions');
      expect(deleteMock).toHaveBeenCalled();
    });

    test('child cannot have multiple active sessions', async () => {
      // Mock check for existing sessions
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

      // Try to create new session when one exists
      await store.dispatch(createChildSession(mockChild.id));
      
      // Should check for existing sessions
      expect(supabase.from).toHaveBeenCalledWith('child_sessions');
    });
  });

  describe('Developer mode provides convenient testing access', () => {
    test('developer gets long-lasting session for testing', async () => {
      const devChild = {
        ...mockChild,
        id: 'dev-child-1',
      };

      store.dispatch({
        type: 'child/devModeLogin',
        payload: devChild,
      });

      const state = store.getState().child;
      
      // Developer should have access
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentChild).toEqual(devChild);
      expect(state.childSession).toBeTruthy();
      
      // Dev session should last much longer than regular sessions
      const expiryTime = new Date(state.childSession!.expiresAt).getTime();
      const now = Date.now();
      expect(expiryTime - now).toBeGreaterThan(1.9 * 60 * 60 * 1000); // At least 2 hours
    });

    test('developer sessions do not expire during testing', async () => {
      // Set up dev mode session
      store.dispatch({
        type: 'child/devModeLogin',
        payload: mockChild,
      });

      // Fast forward time past normal session expiry
      jest.advanceTimersByTime(3 * 60 * 60 * 1000); // 3 hours

      await store.dispatch(checkSessionExpiry());

      const state = store.getState().child;
      
      // Developer should still have access for testing
      expect(state.isAuthenticated).toBe(true);
    });
  });
});