import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

describe('Test Setup Validation', () => {
  test('basic render test', () => {
    const { getByText } = render(<Text>Hello Test</Text>);
    expect(getByText('Hello Test')).toBeTruthy();
  });

  test('jest mocks are working', () => {
    expect(jest.fn()).toBeDefined();
  });

  test('react native is mocked', () => {
    const Alert = require('react-native').Alert;
    expect(Alert.alert).toBeDefined();
  });
});