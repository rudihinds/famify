import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Platform, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { 
  setSelectedChild, 
  setCurrentStep,
  selectSelectedChild,
  selectIsStepValid,
  setEditingMode,
  fetchSequenceForEditing,
  resetWizard
} from '../../store/slices/sequenceCreationSlice';
import { childService, Child } from '../../services/childService';
import ChildSelectionCard from '../../components/sequence-creation/ChildSelectionCard';
import { StateContainer, LoadingState } from '../../components/common/StateDisplays';
import BottomNavigation from '../../components/sequence-creation/BottomNavigation';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGetActiveSequencesByChildrenQuery } from '../../store/api/sequenceApi';
import * as Haptics from 'expo-haptics';

export default function SelectChildScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
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
  const { data: activeSequences = {}, refetch: refetchSequences, error: sequencesError } = useGetActiveSequencesByChildrenQuery(
    childIds,
    { skip: childIds.length === 0 }
  );
  
  // Debug logging
  useEffect(() => {
    console.log('[SELECT CHILD] Active sequences:', activeSequences);
    console.log('[SELECT CHILD] Children IDs:', childIds);
    if (sequencesError) {
      console.error('[SELECT CHILD] Error fetching sequences:', sequencesError);
    }
  }, [activeSequences, childIds, sequencesError]);

  useEffect(() => {
    // Set current step when screen mounts
    dispatch(setCurrentStep(0));
  }, [dispatch]);
  
  useEffect(() => {
    fetchChildren();
  }, [user?.id]);

  // Refetch sequences when screen gains focus to ensure fresh data
  useFocusEffect(
    useCallback(() => {
      console.log('[SELECT CHILD] Screen focused - refetching sequences');
      if (childIds.length > 0) {
        refetchSequences();
      }
    }, [childIds.length, refetchSequences])
  );

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
                router.push('/sequence-creation/sequence-settings');
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
      // No active sequence - just set the selected child
      dispatch(setSelectedChild(childId));
    }
    
    // Add haptic feedback on mobile
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [activeSequences, children, dispatch, router]);

  const handleNext = useCallback(() => {
    if (canAdvance) {
      router.push('/sequence-creation/sequence-settings');
    }
  }, [canAdvance, router]);


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

      {/* Bottom Navigation */}
      <BottomNavigation
        showBack={false}
        onNext={handleNext}
        nextDisabled={!canAdvance}
      />
    </View>
  );
}