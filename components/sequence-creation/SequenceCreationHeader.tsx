import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { X } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { selectCurrentStep, selectTotalTaskCount, resetWizard } from '../../store/slices/sequenceCreationSlice';
import { useRouter } from 'expo-router';

interface SequenceCreationHeaderProps {
  onCancel?: () => void;
}

const SequenceCreationHeader: React.FC<SequenceCreationHeaderProps> = ({ onCancel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const currentStep = useSelector(selectCurrentStep);
  const totalTaskCount = useSelector(selectTotalTaskCount);
  const hasData = useSelector((state: RootState) => {
    const { selectedChildId, groups } = state.sequenceCreation;
    return !!(selectedChildId || groups.length > 0 || totalTaskCount > 0);
  });

  const totalSteps = 5;
  
  const handleCancel = () => {
    if (hasData) {
      Alert.alert(
        'Cancel Sequence Creation',
        'Are you sure you want to cancel? All progress will be lost.',
        [
          { text: 'Continue Editing', style: 'cancel' },
          {
            text: 'Cancel',
            style: 'destructive',
            onPress: () => {
              dispatch(resetWizard());
              if (onCancel) {
                onCancel();
              } else {
                // Navigate back to parent dashboard, exiting the modal
                navigate('/parent/dashboard', { replace: true });
              }
            },
          },
        ]
      );
    } else {
      dispatch(resetWizard());
      if (onCancel) {
        onCancel();
      } else {
        // Navigate back to parent dashboard, exiting the modal
        router.replace('/parent/dashboard');
      }
    }
  };

  return (
    <View className="bg-white border-b border-gray-200">
      {/* Header Row */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <TouchableOpacity
          onPress={handleCancel}
          className="p-2 -ml-2"
          accessibilityLabel="Cancel sequence creation"
          accessibilityHint="Exits sequence creation and returns to tasks screen"
        >
          <X size={24} color="#6b7280" />
        </TouchableOpacity>
        
        <Text className="text-lg font-semibold text-gray-900">
          Create Sequence
        </Text>
        
        {/* Empty view for centering */}
        <View style={{ width: 40 }} />
      </View>
      
      {/* Progress Dots */}
      <View className="flex-row justify-center items-center pb-3 px-4">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View key={index} className="flex-row items-center">
            <View
              className={`w-2 h-2 rounded-full mx-1 ${
                index === currentStep
                  ? 'bg-indigo-600'
                  : index < currentStep
                  ? 'bg-indigo-400'
                  : 'bg-gray-300'
              }`}
              accessibilityLabel={`Step ${index + 1} of ${totalSteps}`}
            />
            {index < totalSteps - 1 && (
              <View
                className={`w-4 h-0.5 ${
                  index < currentStep ? 'bg-indigo-400' : 'bg-gray-300'
                }`}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

export default SequenceCreationHeader;