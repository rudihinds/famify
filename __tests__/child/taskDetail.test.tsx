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
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Mock the services and modules
jest.mock('../../services/taskService');
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => ({ id: 'task-1' }),
}));

describe('Child Task Detail Screen', () => {
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

  test('displays task information correctly', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      taskName: 'Clean Your Room',
      taskDescription: 'Make bed and organize toys',
      categoryName: 'Chores',
      categoryIcon: '🧹',
      famcoinValue: 10,
      effortScore: 4,
      photoRequired: true,
    });

    (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);

    const { getByText, findByText } = renderWithProviders(
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

    // Wait for task to load
    await waitFor(() => {
      expect(getByText('Clean Your Room')).toBeTruthy();
    });

    // Check all task details
    expect(getByText('Make bed and organize toys')).toBeTruthy();
    expect(getByText('🧹 Chores')).toBeTruthy();
    expect(getByText('10')).toBeTruthy(); // FAMCOINs
    expect(getByText('Effort: 4/5')).toBeTruthy();
  });

  test('shows photo requirement indicator', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      photoRequired: true,
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
      expect(getByText('Photo Required')).toBeTruthy();
      expect(getByText('Take a photo to complete this task')).toBeTruthy();
    });
  });

  test('complete button disabled without photo when required', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      photoRequired: true,
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
      const completeButton = getByText('Complete Task').parent;
      expect(completeButton?.props.accessibilityState?.disabled).toBe(true);
    });
  });

  test('complete button enabled for non-photo tasks', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      photoRequired: false,
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
      const completeButton = getByText('Complete Task').parent;
      expect(completeButton?.props.accessibilityState?.disabled).toBeFalsy();
    });
  });

  test('shows parent feedback for rejected tasks', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      status: 'parent_rejected',
      rejectionReason: 'The room is still messy. Please clean under the bed too.',
      photoRequired: true,
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
      expect(getByText('Parent Feedback')).toBeTruthy();
      expect(getByText('The room is still messy. Please clean under the bed too.')).toBeTruthy();
    });
  });

  test('shows "Update Photo" button for rejected photo tasks', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      status: 'parent_rejected',
      photoRequired: true,
      rejectionReason: 'Photo not clear',
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
      expect(getByText('Update Photo')).toBeTruthy();
    });
  });

  test('navigation back to tasks list after completion', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      photoRequired: false,
    });

    (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);
    (taskService.completeTask as jest.Mock).mockResolvedValue({ success: true });

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

    // Click complete button
    const completeButton = getByText('Complete Task');
    fireEvent.press(completeButton);

    await waitFor(() => {
      expect(taskService.completeTask).toHaveBeenCalledWith('task-1', mockChild.id, null);
      expect(mockRouter.replace).toHaveBeenCalledWith('/(child)/tasks');
    });
  });

  test('handles task completion with photo', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      photoRequired: true,
    });
    const mockPhoto = createMockPhoto();
    const mockPhotoUrl = createMockStorageUrl('task-photos/test.jpg');

    (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);
    (taskService.uploadTaskPhoto as jest.Mock).mockResolvedValue(mockPhotoUrl);
    (taskService.completeTask as jest.Mock).mockResolvedValue({ success: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [mockPhoto],
    });

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

    // Take photo
    fireEvent.press(getByText('Take Photo'));

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    });

    // Complete task with photo
    await waitFor(() => {
      const completeButton = getByText('Complete Task');
      expect(completeButton.parent?.props.accessibilityState?.disabled).toBeFalsy();
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
      expect(mockRouter.replace).toHaveBeenCalledWith('/(child)/tasks');
    });
  });

  test('shows error when task completion fails', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      photoRequired: false,
    });

    (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);
    (taskService.completeTask as jest.Mock).mockRejectedValue(new Error('Network error'));

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

    fireEvent.press(getByText('Complete Task'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to complete task. Please try again.'
      );
    });
  });

  test('handles photo upload failure', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      photoRequired: true,
    });
    const mockPhoto = createMockPhoto();

    (taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask);
    (taskService.uploadTaskPhoto as jest.Mock).mockRejectedValue(new Error('Upload failed'));
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [mockPhoto],
    });

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

    // Take photo
    fireEvent.press(getByText('Take Photo'));

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    });

    // Try to complete task
    const completeButton = getByText('Complete Task');
    fireEvent.press(completeButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to upload photo. Please try again.'
      );
    });
  });

  test('shows loading state during task fetch', () => {
    (taskService.getTaskById as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { UNSAFE_getByType } = renderWithProviders(
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

    const ActivityIndicator = require('react-native').ActivityIndicator;
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  test('shows already completed state', async () => {
    const mockTask = createMockTask({
      id: 'task-1',
      status: 'parent_approved',
      completedAt: new Date().toISOString(),
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
      expect(getByText('Task Completed! 🎉')).toBeTruthy();
    });
  });
});