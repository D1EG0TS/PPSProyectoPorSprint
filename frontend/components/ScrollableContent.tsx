import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface Props extends ScrollViewProps {
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function ScrollableContent({ children, containerStyle, contentContainerStyle, ...props }: Props) {
  return (
    <ScrollView 
      style={[styles.container, containerStyle]} 
      contentContainerStyle={[styles.content, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={true}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 80, // Extra padding for FAB
  },
});
