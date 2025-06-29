import React from 'react';
import { Stack } from 'expo-router';
import SequenceCreationHeader from '../../components/sequence-creation/SequenceCreationHeader';

export default function SequenceCreationLayout() {
  // Remove all navigation guards for now to fix the navigation context error
  // Guards can be implemented at the screen level instead

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