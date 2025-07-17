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
import { incrementPendingEarnings } from '../../store/slices/childSlice';
import { updateTaskStatus, removeRejectedTask } from '../../store/slices/taskSlice';
import * as ImagePicker from 'expo-image-picker';

// Mock the services
jest.mock('../../services/taskService');
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => ({ id: 'task-1' }),
}));

describe('Task Completion Flow', () => {
  const mockChild = createMockChild();
  const mockSession = createMockChildSession();
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(require('expo-router').useRouter).mockReturnValue(mockRouter);
  });

  test('successful completion without photo', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      photoRequired: false,
      famcoinValue: 5,
    });

    (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);
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
      expect(getByText('Complete Task')).toBeTruthy();
    });

    // Complete the task
    fireEvent.press(getByText('Complete Task'));

    await waitFor(() => {
      expect(taskService.completeTask).toHaveBeenCalledWith('task-1', mockChild.id, null);
      
      // Check Redux state updates
      const state = store.getState();
      expect(state.child.pendingEarnings).toBe(15); // 10 + 5
      
      // Check navigation
      expect(mockRouter.replace).toHaveBeenCalledWith('/(child)/tasks');
    });
  });

  test('successful completion with photo', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      photoRequired: true,
      famcoinValue: 10,
    });
    const mockPhoto = createMockPhoto();
    const mockPhotoUrl = createMockStorageUrl('task-photos/test.jpg');

    (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);
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
      expect(getByText('Take Photo')).toBeTruthy();
    });

    // Take photo
    fireEvent.press(getByText('Take Photo'));

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    });

    // Complete task
    await waitFor(() => {
      const completeButton = getByText('Complete Task');
      fireEvent.press(completeButton);
    });

    await waitFor(() => {
      expect(taskService.uploadTaskPhoto).toHaveBeenCalledWith(
        mockPhoto.uri,
        mockChild.id,
        'task-1'
      );
      expect(taskService.completeTask).toHaveBeenCalledWith(
        'task-1',
        mockChild.id,
        mockPhotoUrl
      );
      
      // Check Redux state updates
      const state = store.getState();
      expect(state.child.pendingEarnings).toBe(10);
      
      expect(mockRouter.replace).toHaveBeenCalledWith('/(child)/tasks');
    });
  });

  test('error handling during completion', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      photoRequired: false,
    });

    (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);
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
      expect(getByText('Complete Task')).toBeTruthy();
    });

    fireEvent.press(getByText('Complete Task'));

    await waitFor(() => {
      // Redux state should not change on error
      const state = store.getState();
      expect(state.child.pendingEarnings).toBe(10);
      
      // Should not navigate on error
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  test('Redux state updates after completion', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      photoRequired: false,
      famcoinValue: 7,
      status: 'pending',
    });

    (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);
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
      expect(getByText('Complete Task')).toBeTruthy();
    });

    fireEvent.press(getByText('Complete Task'));

    await waitFor(() => {
      const state = store.getState();
      
      // Check task status update
      const updatedTask = state.tasks.dailyTasks.find(t => t.id === 'task-1');
      expect(updatedTask?.status).toBe('child_completed');
      
      // Check pending earnings increment
      expect(state.child.pendingEarnings).toBe(27); // 20 + 7
    });
  });

  test('pending FAMCOINs increment', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      photoRequired: false,
      famcoinValue: 15,
    });

    (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);
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
      expect(getByText('Complete Task')).toBeTruthy();
    });

    fireEvent.press(getByText('Complete Task'));

    await waitFor(() => {
      const state = store.getState();
      expect(state.child.pendingEarnings).toBe(15);
    });
  });

  test('rejected task re-submission flow', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      status: 'parent_rejected',
      rejectionReason: 'Photo not clear',
      photoRequired: true,
      famcoinValue: 8,
    });
    const mockPhoto = createMockPhoto();
    const mockPhotoUrl = createMockStorageUrl('task-photos/new-photo.jpg');

    (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);
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
      expect(getByText('Parent Feedback')).toBeTruthy();
      expect(getByText('Photo not clear')).toBeTruthy();
      expect(getByText('Update Photo')).toBeTruthy();
    });

    // Update photo
    fireEvent.press(getByText('Update Photo'));

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    });

    // Complete task again
    await waitFor(() => {
      const completeButton = getByText('Complete Task');
      fireEvent.press(completeButton);
    });

    await waitFor(() => {
      expect(taskService.completeTask).toHaveBeenCalledWith(
        'task-1',
        mockChild.id,
        mockPhotoUrl
      );
      
      // Check Redux state updates
      const state = store.getState();
      expect(state.child.pendingEarnings).toBe(13); // 5 + 8
      
      // Task should be removed from rejected list
      expect(state.tasks.rejectedTasks).not.toContainEqual(
        expect.objectContaining({ id: 'task-1' })
      );
      
      expect(mockRouter.replace).toHaveBeenCalledWith('/(child)/tasks');
    });
  });

  test('handles photo requirement validation', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      photoRequired: true,
      famcoinValue: 5,
    });

    (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);

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
      expect(getByText('Take Photo')).toBeTruthy();
    });

    // Try to complete without photo
    const completeButton = getByText('Complete Task');
    expect(completeButton.parent?.props.accessibilityState?.disabled).toBe(true);

    // Button should remain disabled
    fireEvent.press(completeButton);

    await waitFor(() => {
      expect(taskService.completeTask).not.toHaveBeenCalled();
    });
  });

  test('handles concurrent completion attempts', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      photoRequired: false,
    });

    let resolveCompletion: any;
    const completionPromise = new Promise(resolve => {
      resolveCompletion = resolve;
    });

    (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);
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
      expect(getByText('Complete Task')).toBeTruthy();
    });

    // Try to complete multiple times
    const completeButton = getByText('Complete Task');
    fireEvent.press(completeButton);
    fireEvent.press(completeButton);
    fireEvent.press(completeButton);

    // Should only call once
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