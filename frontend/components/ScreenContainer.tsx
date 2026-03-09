
import React, { ReactNode } from 'react';
import { StyleSheet, View, ScrollView, ViewStyle, StyleProp, ScrollViewProps } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Layout } from '../constants/Layout';

interface ScreenContainerProps extends ScrollViewProps {
  children: ReactNode;
  scrollable?: boolean;
  withPadding?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function ScreenContainer({ 
  children, 
  scrollable = true, 
  withPadding = true,
  style,
  contentContainerStyle,
  ...rest
}: ScreenContainerProps) {
  const theme = useTheme();

  const containerStyles = [
    styles.container,
    { backgroundColor: theme.colors.background },
    style
  ];

  const contentStyles = [
    withPadding && styles.padding,
    contentContainerStyle
  ];

  if (scrollable) {
    return (
      <View style={containerStyles}>
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent, 
            contentStyles
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          {...rest}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[containerStyles, contentStyles]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  padding: {
    padding: Layout.spacing.md,
  }
});
