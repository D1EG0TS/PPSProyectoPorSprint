import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
// Note: We mock react-native, so importing from it gets the mock
import { useWindowDimensions } from 'react-native';
import DashboardLayout from '../_layout';
import { useAuth } from '../../../hooks/useAuth';

// Mock dependencies
jest.mock('expo-router', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    Slot: () => <View testID="slot-content"><Text>Main Content</Text></View>,
    useRouter: () => ({ push: jest.fn() }),
    usePathname: () => '/dashboard',
  };
});

jest.mock('../../../components/Sidebar', () => {
  const React = require('react');
  const { View, Text, Button } = require('react-native');
  return {
    Sidebar: ({ onClose }: any) => (
      <View testID="sidebar">
        <Text>Sidebar Content</Text>
        {onClose && <Button title="Close Sidebar" onPress={onClose} testID="close-sidebar-btn" />}
      </View>
    ),
  };
});

jest.mock('../../../components/Topbar', () => {
  const React = require('react');
  const { View, Button } = require('react-native');
  return {
    Topbar: ({ onMenuPress }: any) => (
      <View testID="topbar">
        <Button title="Menu" onPress={onMenuPress} testID="menu-btn" />
      </View>
    ),
  };
});

jest.mock('../../../hooks/useProtectedRoute', () => ({
  useProtectedRoute: jest.fn(),
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock react-native-paper to avoid internal dependencies on react-native
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Drawer: {
      Section: ({ children }: any) => <View>{children}</View>,
      Item: ({ label }: any) => <View>{label}</View>,
    },
  };
});

// Manual mock for react-native
jest.mock('react-native', () => {
  const React = require('react');
  return {
    View: ({ children, testID, style, ...props }: any) => React.createElement('View', { testID, style, ...props }, children),
    Text: ({ children, testID, style, ...props }: any) => React.createElement('Text', { testID, style, ...props }, children),
    Button: ({ title, onPress, testID, ...props }: any) => React.createElement('Button', { title, onPress, testID, ...props }),
    StyleSheet: { 
      create: (obj: any) => obj,
      flatten: (style: any) => (Array.isArray(style) ? Object.assign({}, ...style) : style),
    },
    useWindowDimensions: jest.fn(),
    Platform: { OS: 'ios', select: (obj: any) => obj.ios },
    // Add other commonly used components if needed by other mocks
    TouchableOpacity: ({ children, onPress, ...props }: any) => React.createElement('TouchableOpacity', { onPress, ...props }, children),
    Image: 'Image',
    ScrollView: 'ScrollView',
  };
});

describe('DashboardLayout Responsive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { role_id: 1, full_name: 'Admin' },
    });
  });

  it('renders permanent sidebar on large screens (Desktop)', () => {
    // Mock large screen
    (useWindowDimensions as jest.Mock).mockReturnValue({ width: 1024, height: 768, scale: 1, fontScale: 1 });

    const { getByTestId } = render(<DashboardLayout />);

    // Sidebar should be visible immediately
    expect(getByTestId('sidebar')).toBeTruthy();
    
    // Topbar should be visible
    expect(getByTestId('topbar')).toBeTruthy();
    
    // Slot content should be visible
    expect(getByTestId('slot-content')).toBeTruthy();
  });

  it('hides sidebar by default on small screens (Mobile)', () => {
    // Mock small screen
    (useWindowDimensions as jest.Mock).mockReturnValue({ width: 375, height: 812, scale: 1, fontScale: 1 });

    const { queryByTestId, getByTestId } = render(<DashboardLayout />);

    // Sidebar should NOT be visible initially
    expect(queryByTestId('sidebar')).toBeNull();
    
    // Topbar should be visible
    expect(getByTestId('topbar')).toBeTruthy();
  });

  it('opens sidebar when menu is pressed on small screens', () => {
    // Mock small screen
    (useWindowDimensions as jest.Mock).mockReturnValue({ width: 375, height: 812, scale: 1, fontScale: 1 });

    const { getByTestId, queryByTestId } = render(<DashboardLayout />);

    // Initially hidden
    expect(queryByTestId('sidebar')).toBeNull();

    // Press menu button
    fireEvent.press(getByTestId('menu-btn'));

    // Sidebar should now be visible
    expect(getByTestId('sidebar')).toBeTruthy();
  });

  it('closes sidebar when close button is pressed on small screens', () => {
    // Mock small screen
    (useWindowDimensions as jest.Mock).mockReturnValue({ width: 375, height: 812, scale: 1, fontScale: 1 });

    const { getByTestId, queryByTestId } = render(<DashboardLayout />);

    // Open first
    fireEvent.press(getByTestId('menu-btn'));
    expect(getByTestId('sidebar')).toBeTruthy();

    // Close
    fireEvent.press(getByTestId('close-sidebar-btn'));

    // Sidebar should be hidden again
    expect(queryByTestId('sidebar')).toBeNull();
  });
});
