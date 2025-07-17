import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PhotoCapture from '../../components/PhotoCapture';
import { render } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { createMockPhoto } from '../utils/mockFactories';

describe('Photo Capture Component', () => {
  const mockOnPhotoTaken = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('camera permission request', async () => {
    const requestPermission = jest.fn().mockResolvedValue({ granted: false });
    jest.mocked(require('expo-camera').Camera.useCameraPermissions).mockReturnValue([
      { granted: false },
      requestPermission,
    ]);

    const { getByText } = render(
      <PhotoCapture
        visible={true}
        onPhotoTaken={mockOnPhotoTaken}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(getByText('Camera Permission Required')).toBeTruthy();
      expect(getByText('Please grant camera access to take photos for tasks.')).toBeTruthy();
    });

    // Click request permission
    fireEvent.press(getByText('Grant Permission'));

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalled();
    });
  });

  test('photo capture success', async () => {
    const mockPhoto = createMockPhoto();
    jest.mocked(require('expo-camera').Camera.useCameraPermissions).mockReturnValue([
      { granted: true },
      jest.fn(),
    ]);
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [mockPhoto],
    });

    const { getByText } = render(
      <PhotoCapture
        visible={true}
        onPhotoTaken={mockOnPhotoTaken}
        onCancel={mockOnCancel}
      />
    );

    // Camera should be visible
    await waitFor(() => {
      expect(getByText('Take Photo')).toBeTruthy();
    });

    // Take photo
    fireEvent.press(getByText('Take Photo'));

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      expect(mockOnPhotoTaken).toHaveBeenCalledWith(mockPhoto.uri);
    });
  });

  test('photo preview display', async () => {
    const mockPhoto = createMockPhoto();
    jest.mocked(require('expo-camera').Camera.useCameraPermissions).mockReturnValue([
      { granted: true },
      jest.fn(),
    ]);

    const { getByText, getByTestId, rerender } = render(
      <PhotoCapture
        visible={true}
        onPhotoTaken={mockOnPhotoTaken}
        onCancel={mockOnCancel}
        initialPhoto={mockPhoto.uri}
      />
    );

    await waitFor(() => {
      // Should show preview instead of camera
      expect(getByText('Use This Photo')).toBeTruthy();
      expect(getByText('Retake')).toBeTruthy();
    });
  });

  test('retake photo functionality', async () => {
    const mockPhoto = createMockPhoto();
    const newMockPhoto = { ...mockPhoto, uri: 'file:///new-photo.jpg' };
    
    jest.mocked(require('expo-camera').Camera.useCameraPermissions).mockReturnValue([
      { granted: true },
      jest.fn(),
    ]);
    (ImagePicker.launchCameraAsync as jest.Mock)
      .mockResolvedValueOnce({
        canceled: false,
        assets: [mockPhoto],
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [newMockPhoto],
      });

    const { getByText } = render(
      <PhotoCapture
        visible={true}
        onPhotoTaken={mockOnPhotoTaken}
        onCancel={mockOnCancel}
      />
    );

    // Take initial photo
    fireEvent.press(getByText('Take Photo'));

    await waitFor(() => {
      expect(mockOnPhotoTaken).toHaveBeenCalledWith(mockPhoto.uri);
    });

    // Should now show preview
    await waitFor(() => {
      expect(getByText('Retake')).toBeTruthy();
    });

    // Retake photo
    fireEvent.press(getByText('Retake'));

    await waitFor(() => {
      expect(getByText('Take Photo')).toBeTruthy();
    });

    // Take new photo
    fireEvent.press(getByText('Take Photo'));

    await waitFor(() => {
      expect(mockOnPhotoTaken).toHaveBeenCalledWith(newMockPhoto.uri);
      expect(mockOnPhotoTaken).toHaveBeenCalledTimes(2);
    });
  });

  test('photo upload to Supabase storage', async () => {
    // This is handled by the taskService, not the PhotoCapture component
    // The component only captures the photo and returns the URI
    const mockPhoto = createMockPhoto();
    jest.mocked(require('expo-camera').Camera.useCameraPermissions).mockReturnValue([
      { granted: true },
      jest.fn(),
    ]);
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [mockPhoto],
    });

    const { getByText } = render(
      <PhotoCapture
        visible={true}
        onPhotoTaken={mockOnPhotoTaken}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.press(getByText('Take Photo'));

    await waitFor(() => {
      // Component should only return the URI
      expect(mockOnPhotoTaken).toHaveBeenCalledWith(mockPhoto.uri);
    });
  });

  test('error handling for camera failures', async () => {
    jest.mocked(require('expo-camera').Camera.useCameraPermissions).mockReturnValue([
      { granted: true },
      jest.fn(),
    ]);
    (ImagePicker.launchCameraAsync as jest.Mock).mockRejectedValue(
      new Error('Camera not available')
    );

    const { getByText } = render(
      <PhotoCapture
        visible={true}
        onPhotoTaken={mockOnPhotoTaken}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.press(getByText('Take Photo'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to access camera. Please try again.'
      );
      expect(mockOnPhotoTaken).not.toHaveBeenCalled();
    });
  });

  test('cancel button functionality', async () => {
    jest.mocked(require('expo-camera').Camera.useCameraPermissions).mockReturnValue([
      { granted: true },
      jest.fn(),
    ]);

    const { getByText } = render(
      <PhotoCapture
        visible={true}
        onPhotoTaken={mockOnPhotoTaken}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(getByText('Cancel')).toBeTruthy();
    });

    fireEvent.press(getByText('Cancel'));

    expect(mockOnCancel).toHaveBeenCalled();
    expect(mockOnPhotoTaken).not.toHaveBeenCalled();
  });

  test('modal visibility control', () => {
    const { queryByText, rerender } = render(
      <PhotoCapture
        visible={false}
        onPhotoTaken={mockOnPhotoTaken}
        onCancel={mockOnCancel}
      />
    );

    // Modal should not be visible
    expect(queryByText('Take Photo')).toBeFalsy();

    // Show modal
    rerender(
      <PhotoCapture
        visible={true}
        onPhotoTaken={mockOnPhotoTaken}
        onCancel={mockOnCancel}
      />
    );

    // Modal should now be visible
    expect(queryByText('Take Photo')).toBeTruthy();
  });

  test('handles user canceling photo selection', async () => {
    jest.mocked(require('expo-camera').Camera.useCameraPermissions).mockReturnValue([
      { granted: true },
      jest.fn(),
    ]);
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: [],
    });

    const { getByText } = render(
      <PhotoCapture
        visible={true}
        onPhotoTaken={mockOnPhotoTaken}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.press(getByText('Take Photo'));

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
      expect(mockOnPhotoTaken).not.toHaveBeenCalled();
      // Should remain on camera screen
      expect(getByText('Take Photo')).toBeTruthy();
    });
  });

  test('use photo button in preview', async () => {
    const mockPhoto = createMockPhoto();
    jest.mocked(require('expo-camera').Camera.useCameraPermissions).mockReturnValue([
      { granted: true },
      jest.fn(),
    ]);

    const { getByText } = render(
      <PhotoCapture
        visible={true}
        onPhotoTaken={mockOnPhotoTaken}
        onCancel={mockOnCancel}
        initialPhoto={mockPhoto.uri}
      />
    );

    await waitFor(() => {
      expect(getByText('Use This Photo')).toBeTruthy();
    });

    fireEvent.press(getByText('Use This Photo'));

    expect(mockOnPhotoTaken).toHaveBeenCalledWith(mockPhoto.uri);
  });

  test('permission denied state', async () => {
    const requestPermission = jest.fn().mockResolvedValue({ granted: false });
    jest.mocked(require('expo-camera').Camera.useCameraPermissions).mockReturnValue([
      { granted: false },
      requestPermission,
    ]);

    const { getByText } = render(
      <PhotoCapture
        visible={true}
        onPhotoTaken={mockOnPhotoTaken}
        onCancel={mockOnCancel}
      />
    );

    // Request permission
    fireEvent.press(getByText('Grant Permission'));

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalled();
    });

    // Should still show permission screen if not granted
    expect(getByText('Camera Permission Required')).toBeTruthy();
  });
});