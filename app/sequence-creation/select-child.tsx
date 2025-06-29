import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Platform, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { 
  setSelectedChild, 
  setCurrentStep,
  selectSelectedChild,
  selectIsStepValid,
  setEditingMode,
  fetchSequenceForEditing
} from '../../store/slices/sequenceCreationSlice';
import { ChevronRight } from 'lucide-react-native';
import { childService, Child } from '../../services/childService';
import ChildSelectionCard from '../../components/sequence-creation/ChildSelectionCard';
import { StateContainer, LoadingState } from '../../components/common/StateDisplays';
import { useNavigationSafety } from '../../hooks/useNavigationSafety';
import { useGetActiveSequencesByChildrenQuery } from '../../store/api/sequenceApi';
import * as Haptics from 'expo-haptics';

export default function SelectChildScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { navigate, isNavigationReady } = useNavigationSafety();
  const selectedChildId = useSelector(selectSelectedChild);
  // Use step 0 validation directly instead of relying on currentStep
  const canAdvance = useSelector((state: RootState) => selectIsStepValid(0)(state));
  const currentStep = useSelector((state: RootState) => state.sequenceCreation.currentStep);
  const user = useSelector((state: RootState) => state.auth.user);
  const isEditing = useSelector((state: RootState) => state.sequenceCreation.isEditing);
  const editingSequenceId = useSelector((state: RootState) => state.sequenceCreation.editingSequenceId);
  
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use RTK Query for active sequences
  const childIds = children.map(c => c.id);
  const { data: activeSequences = {}, refetch: refetchSequences } = useGetActiveSequencesByChildrenQuery(
    childIds,
    { skip: childIds.length === 0 }
  );

  useEffect(() => {
    // Set current step when screen mounts
    dispatch(setCurrentStep(0));
  }, [dispatch]);
  
  useEffect(() => {
    fetchChildren();
  }, [user?.id]);

  const fetchChildren = useCallback(async () => {
    if (!user?.id) {
      setError('No user found');
      setIsLoading(false);
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      const childrenData = await childService.getChildrenByParentId(user.id);
      setChildren(childrenData);
      
      // RTK Query will automatically fetch sequences when childIds change
    } catch (err) {
      setError('Failed to load children');
      console.error('Error fetching children:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const handleChildSelect = useCallback(async (childId: string) => {
    const sequence = activeSequences[childId];
    
    if (sequence) {
      // Child has active sequence - show confirmation
      const childName = children.find(c => c.id === childId)?.name;
      
      Alert.alert(
        'Active Sequence Found',
        `${childName} already has an active sequence. You can only have one active sequence per child.`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Edit Existing',
            onPress: async () => {
              dispatch(setSelectedChild(childId));
              dispatch(setEditingMode({ sequenceId: sequence.id, isEditing: true }));
              
              // Show loading indicator
              setIsLoading(true);
              
              try {
                // Fetch and load the sequence data
                await dispatch(fetchSequenceForEditing(sequence.id)).unwrap();
                
                // Navigate to settings screen
                navigate('/sequence-creation/sequence-settings');
              } catch (error) {
                console.error('Error loading sequence for editing:', error);
                Alert.alert(
                  'Error',
                  'Failed to load sequence data. Please try again.',
                  [{ text: 'OK' }]
                );
              } finally {
                setIsLoading(false);
              }
            }
          }
        ]
      );
    } else {
      // No active sequence - proceed normally
      dispatch(setSelectedChild(childId));
    }
    
    // Add haptic feedback on mobile
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [activeSequences, children, dispatch, navigate]);

  const handleNext = useCallback(() => {
    if (canAdvance) {
      navigate('/sequence-creation/sequence-settings');
    }
  }, [canAdvance, navigate]);

  // Wait for navigation to be ready
  if (!isNavigationReady()) {
    return <LoadingState message="Initializing..." fullScreen />;
  }

  return (
    <View className="flex-1 bg-gray-100">
      <View className="flex-1 px-4 pt-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Select Child
        </Text>
        <Text className="text-gray-600 mb-6">
          {children.length > 0 
            ? `Choose from ${children.length} child${children.length > 1 ? 'ren' : ''}`
            : 'Choose which child this sequence is for'
          }
        </Text>

        {/* Main Content */}
        <StateContainer
          isLoading={isLoading}
          error={error}
          isEmpty={children.length === 0}
          onRetry={fetchChildren}
          loadingMessage="Loading children..."
          emptyTitle="No Children Found"
          emptyMessage="Please connect a child device first before creating sequences."
        >
          <FlatList
            data={children}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChildSelectionCard
                child={item}
                isSelected={selectedChildId === item.id}
                onSelect={handleChildSelect}
                activeSequence={activeSequences[item.id]}
              />
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        </StateContainer>
      </View>

      {/* Next Button */}
      <View className="px-4 pb-6 pt-4 bg-white border-t border-gray-200">
        <TouchableOpacity
          onPress={handleNext}
          disabled={!canAdvance}
          className={`flex-row items-center justify-center py-4 px-6 rounded-xl ${
            canAdvance ? 'bg-indigo-600' : 'bg-gray-300'
          }`}
        >
          <Text className={`font-semibold mr-2 ${
            canAdvance ? 'text-white' : 'text-gray-500'
          }`}>
            Next
          </Text>
          <ChevronRight size={20} color={canAdvance ? '#ffffff' : '#6b7280'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}