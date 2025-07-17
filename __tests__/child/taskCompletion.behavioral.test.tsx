import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import TaskDetailScreen from '../../app/(child)/tasks/[id]';
import { renderWithProviders } from '../utils/testHelpers';
import { 
  createMockTask, 
  createMockChild, 
  createMockChildSession,
  createMockChildState,
  createMockTaskState,
  createMockPhoto,
  createMockStorageUrl
} from '../utils/mockFactories';
import { taskService } from '../../services/taskService';
import * as ImagePicker from 'expo-image-picker';

// Mock the services
jest.mock('../../services/taskService', () => ({
  taskService: {
    getTaskDetails: jest.fn(),
    completeTask: jest.fn(),
    uploadTaskPhoto: jest.fn(),
  },
}));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => ({ id: 'task-1' }),
}));

describe('Task Completion - Behavioral Tests', () => {
  const mockChild = createMockChild();
  const mockSession = createMockChildSession();
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    require('expo-router').useRouter = jest.fn().mockReturnValue(mockRouter);
  });

  describe('Child completes tasks to earn FAMCOINs', () => {
    test('child can complete simple tasks without photos', async () => {
      const mockTask = createMockTask({
        id: 'task-1',
        taskName: 'Make Bed',
        photoRequired: false,
        famcoinValue: 5,
      });

      (taskService.getTaskDetails as jest.Mock).mockResolvedValue(mockTask);
      (taskService.completeTask as jest.Mock).mockResolvedValue({ 
        success: true,
        taskCompletion: { ...mockTask, status: 'child_completed' }
      });

      const { getByText, store } = renderWithProviders(
        <TaskDetailScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              currentChild: mockChild,
              childSession: mockSession,
              pendingEarnings: 10,
            }),
            tasks: createMockTaskState({
              dailyTasks: [mockTask],
            }),
          },
        }
      );

      await waitFor(() => {
        expect(getByText('Make Bed')).toBeTruthy();
        expect(getByText('Mark as Complete')).toBeTruthy();
      });

      // Child completes the task
      fireEvent.press(getByText('Mark as Complete'));

      await waitFor(() => {
        // Child should see their pending earnings increased
        const state = store.getState();
        expect(state.child.pendingEarnings).toBe(15); // 10 + 5
        
        // Child should be returned to their task list
        expect(mockRouter.replace).toHaveBeenCalledWith('/(child)/tasks');
      });
    });

    test('child must provide photo when task requires it', async () => {
      const mockTask = createMockTask({
        id: 'task-1',
        taskName: 'Clean Room',
        photoRequired: true,
        famcoinValue: 10,
      });
      const mockPhoto = createMockPhoto();
      const mockPhotoUrl = createMockStorageUrl('task-photos/clean-room.jpg');

      (taskService.getTaskDetails as jest.Mock).mockResolvedValue(mockTask);
      (taskService.uploadTaskPhoto as jest.Mock).mockResolvedValue(mockPhotoUrl);
      (taskService.completeTask as jest.Mock).mockResolvedValue({ 
        success: true,
        taskCompletion: { ...mockTask, status: 'child_completed', photoUrl: mockPhotoUrl }
      });
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockPhoto],
      });

      const { getByText, store } = renderWithProviders(
        <TaskDetailScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              currentChild: mockChild,
              childSession: mockSession,
              pendingEarnings: 0,
            }),
            tasks: createMockTaskState({
              dailyTasks: [mockTask],
            }),
          },
        }
      );

      await waitFor(() => {
        expect(getByText('Clean Room')).toBeTruthy();
        expect(getByText('Add Photo')).toBeTruthy();
      });

      // Child must take photo first
      fireEvent.press(getByText('Add Photo'));

      await waitFor(() => {
        expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
      });

      // Then child can complete task
      await waitFor(() => {
        const completeButton = getByText('Mark as Complete');
        fireEvent.press(completeButton);
      });

      await waitFor(() => {
        // Child should see their pending earnings increased
        const state = store.getState();
        expect(state.child.pendingEarnings).toBe(10);
        
        // Child should be returned to their task list
        expect(mockRouter.replace).toHaveBeenCalledWith('/(child)/tasks');
      });
    });

    test('child cannot complete photo tasks without taking picture', async () => {
      const mockTask = createMockTask({
        id: 'task-1',
        taskName: 'Show Homework',
        photoRequired: true,
        famcoinValue: 5,
      });

      (taskService.getTaskDetails as jest.Mock).mockResolvedValue(mockTask);

      const { getByText } = renderWithProviders(
        <TaskDetailScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              currentChild: mockChild,
              childSession: mockSession,
            }),
          },
        }
      );

      await waitFor(() => {
        expect(getByText('Show Homework')).toBeTruthy();
        expect(getByText('Add Photo')).toBeTruthy();
      });

      // Complete button should be disabled without photo
      const completeButton = getByText('Mark as Complete');
      expect(completeButton.parent?.props.accessibilityState?.disabled).toBe(true);

      // Child tries to complete anyway
      fireEvent.press(completeButton);

      await waitFor(() => {
        // Task should not be completed
        expect(taskService.completeTask).not.toHaveBeenCalled();
      });
    });

    test('child sees their progress when task fails to complete', async () => {
      const mockTask = createMockTask({
        id: 'task-1',
        taskName: 'Feed Pet',
        photoRequired: false,
        famcoinValue: 3,
      });

      (taskService.getTaskDetails as jest.Mock).mockResolvedValue(mockTask);
      (taskService.completeTask as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByText, store } = renderWithProviders(
        <TaskDetailScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              currentChild: mockChild,
              childSession: mockSession,
              pendingEarnings: 10,
            }),
          },
        }
      );

      await waitFor(() => {
        expect(getByText('Feed Pet')).toBeTruthy();
        expect(getByText('Mark as Complete')).toBeTruthy();
      });

      fireEvent.press(getByText('Mark as Complete'));

      await waitFor(() => {
        // Child's progress should not change when completion fails
        const state = store.getState();
        expect(state.child.pendingEarnings).toBe(10); // Unchanged
        
        // Child should remain on task page to try again
        expect(mockRouter.replace).not.toHaveBeenCalled();
      });
    });

    test('child can only complete task once even if they click multiple times', async () => {
      const mockTask = createMockTask({
        id: 'task-1',
        taskName: 'Water Plants',
        photoRequired: false,
        famcoinValue: 2,
      });

      let resolveCompletion: any;
      const completionPromise = new Promise(resolve => {
        resolveCompletion = resolve;
      });

      (taskService.getTaskDetails as jest.Mock).mockResolvedValue(mockTask);
      (taskService.completeTask as jest.Mock).mockReturnValue(completionPromise);

      const { getByText } = renderWithProviders(
        <TaskDetailScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              currentChild: mockChild,
              childSession: mockSession,
            }),
          },
        }
      );

      await waitFor(() => {
        expect(getByText('Water Plants')).toBeTruthy();
        expect(getByText('Mark as Complete')).toBeTruthy();
      });

      // Child clicks complete button multiple times
      const completeButton = getByText('Mark as Complete');
      fireEvent.press(completeButton);
      fireEvent.press(completeButton);
      fireEvent.press(completeButton);

      // Should only call completion once
      expect(taskService.completeTask).toHaveBeenCalledTimes(1);

      // Resolve the completion
      resolveCompletion({ 
        success: true,
        taskCompletion: { ...mockTask, status: 'child_completed' }
      });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/(child)/tasks');
      });
    });
  });

  describe('Child can fix rejected tasks', () => {
    test('child sees parent feedback when task was rejected', async () => {
      const mockTask = createMockTask({
        id: 'task-1',
        taskName: 'Clean Room',
        status: 'parent_rejected',
        rejectionReason: 'Room still messy in the photo',
        photoRequired: true,
        famcoinValue: 8,
      });

      (taskService.getTaskDetails as jest.Mock).mockResolvedValue(mockTask);

      const { getByText } = renderWithProviders(
        <TaskDetailScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              currentChild: mockChild,
              childSession: mockSession,
            }),
            tasks: createMockTaskState({
              rejectedTasks: [mockTask],
            }),
          },
        }
      );

      await waitFor(() => {
        // Child should see what parent said
        expect(getByText('Parent Feedback')).toBeTruthy();
        expect(getByText('Room still messy in the photo')).toBeTruthy();
        
        // Child should be able to take new photo
        expect(getByText('Retake Photo')).toBeTruthy();
      });
    });

    test('child can fix rejected task and resubmit', async () => {
      const mockTask = createMockTask({
        id: 'task-1',
        taskName: 'Take out trash',
        status: 'parent_rejected',
        rejectionReason: 'Trash still in bin',
        photoRequired: true,
        famcoinValue: 8,
      });
      const mockPhoto = createMockPhoto();
      const mockPhotoUrl = createMockStorageUrl('task-photos/trash-fixed.jpg');

      (taskService.getTaskDetails as jest.Mock).mockResolvedValue(mockTask);
      (taskService.uploadTaskPhoto as jest.Mock).mockResolvedValue(mockPhotoUrl);
      (taskService.completeTask as jest.Mock).mockResolvedValue({ 
        success: true,
        taskCompletion: { ...mockTask, status: 'child_completed', photoUrl: mockPhotoUrl }
      });
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [mockPhoto],
      });

      const { getByText, store } = renderWithProviders(
        <TaskDetailScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              currentChild: mockChild,
              childSession: mockSession,
              pendingEarnings: 5,
            }),
            tasks: createMockTaskState({
              rejectedTasks: [mockTask],
            }),
          },
        }
      );

      await waitFor(() => {
        expect(getByText('Take out trash')).toBeTruthy();
        expect(getByText('Trash still in bin')).toBeTruthy();
        expect(getByText('Retake Photo')).toBeTruthy();
      });

      // Child takes new photo
      fireEvent.press(getByText('Retake Photo'));

      await waitFor(() => {
        expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
      });

      // Child resubmits the task
      await waitFor(() => {
        const completeButton = getByText('Mark as Complete');
        fireEvent.press(completeButton);
      });

      await waitFor(() => {
        // Child should see their pending earnings increased
        const state = store.getState();
        expect(state.child.pendingEarnings).toBe(13); // 5 + 8
        
        // Task should be removed from rejected list
        expect(state.tasks.rejectedTasks).not.toContainEqual(
          expect.objectContaining({ id: 'task-1' })
        );
        
        // Child should be returned to their task list
        expect(mockRouter.replace).toHaveBeenCalledWith('/(child)/tasks');
      });
    });
  });

  describe('Child earns FAMCOINs for completed tasks', () => {
    test('child sees pending earnings increase when task is completed', async () => {
      const mockTask = createMockTask({
        id: 'task-1',
        taskName: 'Practice Piano',
        photoRequired: false,
        famcoinValue: 15,
      });

      (taskService.getTaskDetails as jest.Mock).mockResolvedValue(mockTask);
      (taskService.completeTask as jest.Mock).mockResolvedValue({ 
        success: true,
        taskCompletion: { ...mockTask, status: 'child_completed' }
      });

      const { getByText, store } = renderWithProviders(
        <TaskDetailScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              currentChild: mockChild,
              childSession: mockSession,
              pendingEarnings: 0,
            }),
          },
        }
      );

      await waitFor(() => {
        expect(getByText('Practice Piano')).toBeTruthy();
        expect(getByText('Mark as Complete')).toBeTruthy();
      });

      fireEvent.press(getByText('Mark as Complete'));

      await waitFor(() => {
        // Child should see their pending earnings increased
        const state = store.getState();
        expect(state.child.pendingEarnings).toBe(15);
      });
    });

    test('child task status changes to show completion', async () => {
      const mockTask = createMockTask({
        id: 'task-1',
        taskName: 'Do Homework',
        photoRequired: false,
        famcoinValue: 7,
        status: 'pending',
      });

      (taskService.getTaskDetails as jest.Mock).mockResolvedValue(mockTask);
      (taskService.completeTask as jest.Mock).mockResolvedValue({ 
        success: true,
        taskCompletion: { ...mockTask, status: 'child_completed' }
      });

      const { getByText, store } = renderWithProviders(
        <TaskDetailScreen />,
        {
          preloadedState: {
            child: createMockChildState({
              currentChild: mockChild,
              childSession: mockSession,
              pendingEarnings: 20,
            }),
            tasks: createMockTaskState({
              dailyTasks: [mockTask],
            }),
          },
        }
      );

      await waitFor(() => {
        expect(getByText('Do Homework')).toBeTruthy();
        expect(getByText('Mark as Complete')).toBeTruthy();
      });

      fireEvent.press(getByText('Mark as Complete'));

      await waitFor(() => {
        const state = store.getState();
        
        // Task should be marked as completed
        const updatedTask = state.tasks.dailyTasks.find(t => t.id === 'task-1');
        expect(updatedTask?.status).toBe('child_completed');
        
        // Child should see their pending earnings increased
        expect(state.child.pendingEarnings).toBe(27); // 20 + 7
      });
    });
  });
});