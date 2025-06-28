import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { 
  setSelectedChild, 
  setCurrentStep,
  selectSelectedChild,
  selectIsStepValid
} from '../../store/slices/sequenceCreationSlice';
import { ChevronRight, RefreshCw } from 'lucide-react-native';
import { childService, Child } from '../../services/childService';
import ChildSelectionCard from '../../components/sequence-creation/ChildSelectionCard';
import * as Haptics from 'expo-haptics';

export default function SelectChildScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const selectedChildId = useSelector(selectSelectedChild);
  // Use step 0 validation directly instead of relying on currentStep
  const canAdvance = useSelector((state: RootState) => selectIsStepValid(0)(state));
  const currentStep = useSelector((state: RootState) => state.sequenceCreation.currentStep);
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set current step when screen mounts
    dispatch(setCurrentStep(0));
  }, [dispatch]);
  
  // Debug effect
  useEffect(() => {
    console.log('SelectChild state:', {
      currentStep,
      selectedChildId,
      canAdvance
    });
  }, [currentStep, selectedChildId, canAdvance]);
  
  useEffect(() => {
    fetchChildren();
  }, [user?.id]);

  const fetchChildren = async () => {
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
    } catch (err) {
      setError('Failed to load children');
      console.error('Error fetching children:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChildSelect = async (childId: string) => {
    dispatch(setSelectedChild(childId));
    
    // Add haptic feedback on mobile
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNext = () => {
    if (canAdvance) {
      router.push('/sequence-creation/sequence-settings');
    }
  };

  // Empty state component
  const EmptyState = () => (
    <View className="bg-white rounded-xl p-8 items-center">
      <Text className="text-lg font-semibold text-gray-900 mb-2">
        No Children Found
      </Text>
      <Text className="text-gray-600 text-center">
        Please connect a child device first before creating sequences.
      </Text>
    </View>
  );

  // Error state component
  const ErrorState = () => (
    <View className="bg-red-50 rounded-xl p-4">
      <Text className="text-red-700 text-center mb-2">{error}</Text>
      <TouchableOpacity 
        onPress={fetchChildren}
        className="flex-row items-center justify-center"
      >
        <RefreshCw size={16} color="#b91c1c" />
        <Text className="text-red-700 text-center font-semibold ml-2">
          Tap to retry
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Loading state component
  const LoadingState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color="#4f46e5" />
      <Text className="mt-4 text-gray-600">Loading children...</Text>
    </View>
  );

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
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : (
          <FlatList
            data={children}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChildSelectionCard
                child={item}
                isSelected={selectedChildId === item.id}
                onSelect={handleChildSelect}
              />
            )}
            ListEmptyComponent={<EmptyState />}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}
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