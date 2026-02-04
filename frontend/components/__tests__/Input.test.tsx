import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../Input';
import { PaperProvider } from 'react-native-paper';
import { useForm } from 'react-hook-form';

// Mock react-native-paper TextInput.Icon since it can be tricky in tests
jest.mock('react-native-paper', () => {
  const ActualPaper = jest.requireActual('react-native-paper');
  const { View, Text, TouchableOpacity } = require('react-native');
  
  return {
    ...ActualPaper,
    TextInput: Object.assign(
      // Mock the TextInput component
      (props: any) => {
        // Render right component if present
        return (
          <View testID={props.testID}>
            <Text>{props.label}</Text>
            <Text testID={`${props.testID}-secure`}>{props.secureTextEntry ? 'SECURE' : 'VISIBLE'}</Text>
            {props.right}
          </View>
        );
      },
      {
        // Mock subcomponents
        Icon: ({ icon, onPress, testID }: any) => (
          <TouchableOpacity onPress={onPress} testID={testID}>
            <Text>{icon}</Text>
          </TouchableOpacity>
        ),
      }
    ),
  };
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
);

describe('Input Component', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Input label="Test Input" />, { wrapper: Wrapper });
    expect(getByText('Test Input')).toBeTruthy();
  });

  it('renders password toggle when secureTextEntry is true', () => {
    const { getByTestId, getByText } = render(
      <Input label="Password" secureTextEntry testID="password-input" />,
      { wrapper: Wrapper }
    );
    
    // Check if toggle button exists
    const toggleButton = getByTestId('password-toggle');
    expect(toggleButton).toBeTruthy();
    
    // Check initial state (should be eye)
    expect(getByText('eye')).toBeTruthy();
    
    // Check secure state
    expect(getByText('SECURE')).toBeTruthy();
  });

  it('toggles password visibility when icon is pressed', () => {
    const { getByTestId, getByText } = render(
      <Input label="Password" secureTextEntry testID="password-input" />,
      { wrapper: Wrapper }
    );
    
    const toggleButton = getByTestId('password-toggle');
    
    // Initial state: Secure, Icon is 'eye' (meaning "show me")
    expect(getByText('SECURE')).toBeTruthy();
    expect(getByText('eye')).toBeTruthy();
    
    // Press toggle
    fireEvent.press(toggleButton);
    
    // New state: Visible, Icon is 'eye-off' (meaning "hide me")
    expect(getByText('VISIBLE')).toBeTruthy();
    expect(getByText('eye-off')).toBeTruthy();
    
    // Press toggle again
    fireEvent.press(toggleButton);
    
    // Back to secure
    expect(getByText('SECURE')).toBeTruthy();
    expect(getByText('eye')).toBeTruthy();
  });

  it('does not render password toggle when secureTextEntry is false', () => {
    const { queryByTestId } = render(
      <Input label="Text" testID="text-input" />,
      { wrapper: Wrapper }
    );
    
    expect(queryByTestId('password-toggle')).toBeNull();
  });
});
