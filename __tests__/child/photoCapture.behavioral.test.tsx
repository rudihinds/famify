import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PhotoCapture from '../../components/PhotoCapture';
import { render } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { createMockPhoto } from '../utils/mockFactories';

describe('Photo Capture - Behavioral Tests', () => {
  const mockOnPhotoTaken = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Child needs camera permission to take task photos', () => {
    test('child is told why camera access is needed', async () => {
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
        // Child should understand why they need to give permission
        expect(getByText('Camera Permission Required')).toBeTruthy();
        expect(getByText('Please grant camera access to take photos for tasks.')).toBeTruthy();
        
        // Child should be able to grant permission
        expect(getByText('Grant Permission')).toBeTruthy();
      });
    });

    test('child can grant camera permission to take photos', async () => {
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

      // Child grants permission
      fireEvent.press(getByText('Grant Permission'));

      await waitFor(() => {
        expect(requestPermission).toHaveBeenCalled();
      });
    });

    test('child is informed when camera requires physical device', async () => {
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

      // Child tries to grant permission
      fireEvent.press(getByText('Grant Permission'));
      
      // Should be told about device requirement (in test environment)
      expect(Alert.alert).toHaveBeenCalledWith(
        'Scanner Disabled',
        expect.stringContaining('physical device')
      );
    });
  });

  describe('Child can take photos to prove task completion', () => {
    test('child can take photo when camera permission is granted', async () => {
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

      // Child should see camera interface
      await waitFor(() => {
        expect(getByText('Take Photo')).toBeTruthy();
      });

      // Child takes photo
      fireEvent.press(getByText('Take Photo'));

      await waitFor(() => {
        // Photo should be taken with appropriate quality
        expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
        
        // Parent component should receive the photo
        expect(mockOnPhotoTaken).toHaveBeenCalledWith(mockPhoto.uri);
      });
    });

    test('child can review photo before using it', async () => {
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
        // Child should see photo preview
        expect(getByText('Use This Photo')).toBeTruthy();
        expect(getByText('Retake')).toBeTruthy();
      });

      // Child decides to use the photo
      fireEvent.press(getByText('Use This Photo'));

      expect(mockOnPhotoTaken).toHaveBeenCalledWith(mockPhoto.uri);
    });

    test('child can retake photo if not satisfied', async () => {
      const mockPhoto = createMockPhoto();
      const newMockPhoto = { ...mockPhoto, uri: 'file:///better-photo.jpg' };
      
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

      // Child takes initial photo
      fireEvent.press(getByText('Take Photo'));

      await waitFor(() => {
        expect(mockOnPhotoTaken).toHaveBeenCalledWith(mockPhoto.uri);
      });

      // Child sees preview and wants to retake
      await waitFor(() => {
        expect(getByText('Retake')).toBeTruthy();
      });

      fireEvent.press(getByText('Retake'));

      await waitFor(() => {
        expect(getByText('Take Photo')).toBeTruthy();
      });

      // Child takes new photo
      fireEvent.press(getByText('Take Photo'));

      await waitFor(() => {
        expect(mockOnPhotoTaken).toHaveBeenCalledWith(newMockPhoto.uri);
        expect(mockOnPhotoTaken).toHaveBeenCalledTimes(2);
      });
    });

    test('child can cancel photo taking and return to task', async () => {
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

      // Child decides not to take photo
      fireEvent.press(getByText('Cancel'));

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnPhotoTaken).not.toHaveBeenCalled();
    });
  });

  describe('Child experiences are handled gracefully', () => {
    test('child is informed when camera fails', async () => {
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
        // Child should be told what went wrong
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to access camera. Please try again.'
        );
        
        // Task should not be marked as having photo
        expect(mockOnPhotoTaken).not.toHaveBeenCalled();
      });
    });

    test('child can change their mind about taking photo', async () => {
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
        // Child cancelled during camera interface
        expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
        expect(mockOnPhotoTaken).not.toHaveBeenCalled();
        
        // Child should remain on camera screen to try again
        expect(getByText('Take Photo')).toBeTruthy();
      });
    });

    test('child only sees camera interface when photo capture is needed', () => {
      const { queryByText, rerender } = render(
        <PhotoCapture
          visible={false}
          onPhotoTaken={mockOnPhotoTaken}
          onCancel={mockOnCancel}
        />
      );

      // Child shouldn't see camera interface when not needed
      expect(queryByText('Take Photo')).toBeFalsy();

      // Camera appears when needed
      rerender(
        <PhotoCapture
          visible={true}
          onPhotoTaken={mockOnPhotoTaken}
          onCancel={mockOnCancel}
        />
      );

      expect(queryByText('Take Photo')).toBeTruthy();
    });

    test('child still cannot grant permission when permission is denied', async () => {
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

      // Child tries to grant permission
      fireEvent.press(getByText('Grant Permission'));

      await waitFor(() => {
        expect(requestPermission).toHaveBeenCalled();
      });

      // Should still show permission screen if not granted
      expect(getByText('Camera Permission Required')).toBeTruthy();
    });
  });
});