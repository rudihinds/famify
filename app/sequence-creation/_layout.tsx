import React, { useLayoutEffect } from 'react';
import { Stack } from 'expo-router';
import SequenceCreationHeader from '../../components/sequence-creation/SequenceCreationHeader';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { selectIsStepValid, selectIsEditing } from '../../store/slices/sequenceCreationSlice';
import { useRouter, useSegments } from 'expo-router';

export default function SequenceCreationLayout() {
  let router;
  let segments;
  
  try {
    router = useRouter();
    segments = useSegments();
  } catch (error) {
    // Navigation context not ready
    console.warn('Navigation context not ready in SequenceCreationLayout');
    return null;
  }
  
  // Ensure navigation is ready
  if (!router || !segments) {
    return null;
  }
  
  // Get validation for all steps
  const step0Valid = useSelector((state: RootState) => selectIsStepValid(0)(state));
  const step1Valid = useSelector((state: RootState) => selectIsStepValid(1)(state));
  const step2Valid = useSelector((state: RootState) => selectIsStepValid(2)(state));
  const step3Valid = useSelector((state: RootState) => selectIsStepValid(3)(state));
  const isEditing = useSelector(selectIsEditing);

  // Navigation guard - prevent skipping uncompleted steps
  useLayoutEffect(() => {
    // Only run guards after initial navigation
    if (segments.length < 2) return;
    
    const currentRoute = segments[segments.length - 1];
    console.log('[LAYOUT] Navigation guard running for route:', currentRoute);
    console.log('[LAYOUT] Current state:', {
      isEditing,
      step0Valid,
      step1Valid,
      step2Valid,
      step3Valid,
      segments: segments.join('/')
    });
    
    // Skip navigation guards when editing - all data is loaded at once
    if (isEditing) {
      console.log('[LAYOUT] Skipping navigation guard - in editing mode');
      return;
    }
    
    const routeToStepMap: Record<string, number> = {
      'select-child': 0,
      'sequence-settings': 1,
      'groups-setup': 2,
      'add-tasks': 3,
      'review-create': 4,
    };

    // Check if trying to navigate to a route that requires previous steps
    const targetStep = routeToStepMap[currentRoute];
    console.log('[LAYOUT] Target step:', targetStep);
    
    // Check if all previous steps are valid
    let canNavigate = true;
    if (targetStep >= 1 && !step0Valid) {
      canNavigate = false;
      console.log('[LAYOUT] Cannot navigate - step 0 not valid');
    }
    if (targetStep >= 2 && !step1Valid) {
      canNavigate = false;
      console.log('[LAYOUT] Cannot navigate - step 1 not valid');
    }
    if (targetStep >= 3 && !step2Valid) {
      canNavigate = false;
      console.log('[LAYOUT] Cannot navigate - step 2 not valid');
    }
    if (targetStep >= 4 && !step3Valid) {
      canNavigate = false;
      console.log('[LAYOUT] Cannot navigate - step 3 not valid');
    }
    
    if (targetStep > 0 && !canNavigate) {
      // Navigate back if trying to skip steps
      console.log(`[LAYOUT] Navigation blocked: Cannot navigate to step ${targetStep} without completing previous steps`);
      router.back();
    } else {
      console.log('[LAYOUT] Navigation allowed');
    }
  }, [segments, step0Valid, step1Valid, step2Valid, step3Valid, router, isEditing]);

  return (
    <Stack
      screenOptions={{
        header: () => <SequenceCreationHeader />,
        animation: 'slide_from_right',
        gestureEnabled: false, // Disable swipe back to prevent accidental dismissal
        contentStyle: {
          backgroundColor: '#f3f4f6', // bg-gray-100
        },
      }}
    >
      <Stack.Screen
        name="select-child"
        options={{
          title: 'Select Child',
        }}
      />
      <Stack.Screen
        name="sequence-settings"
        options={{
          title: 'Sequence Settings',
        }}
      />
      <Stack.Screen
        name="groups-setup"
        options={{
          title: 'Create Groups',
        }}
      />
      <Stack.Screen
        name="add-tasks/[groupId]"
        options={{
          title: 'Add Tasks',
        }}
      />
      <Stack.Screen
        name="review-create"
        options={{
          title: 'Review & Create',
        }}
      />
    </Stack>
  );
}