import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/testHelpers';
import { createMockChildState, createMockTaskState, createMockChild } from '../utils/mockFactories';

// Simple component to test our setup
const SimpleComponent = () => (
  <View>
    <Text>Simple Test</Text>
  </View>
);

describe('Simple Task List Tests', () => {
  test('test setup works', () => {
    const { getByText } = render(<SimpleComponent />);
    expect(getByText('Simple Test')).toBeTruthy();
  });

  test('can render with providers', () => {
    const mockChild = createMockChild();
    
    try {
      const { getByText, debug } = renderWithProviders(
        <SimpleComponent />,
        {
          preloadedState: {
            child: createMockChildState({
              currentChild: mockChild,
              profile: mockChild,
            }),
            tasks: createMockTaskState({}),
          },
        }
      );
      
      // Log what we got
      console.log('Rendered successfully');
      debug();
      
      expect(getByText('Simple Test')).toBeTruthy();
    } catch (error) {
      console.error('Render error:', error);
      throw error;
    }
  });
});