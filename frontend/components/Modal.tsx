import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Modal as PaperModal, Portal, Text, IconButton } from 'react-native-paper';
import { Colors } from '../constants/Colors';

interface ModalProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Modal({ 
  visible, 
  onDismiss, 
  title, 
  children, 
  contentContainerStyle 
}: ModalProps) {
  return (
    <Portal>
      <PaperModal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.container, contentContainerStyle]}
      >
        <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>{title}</Text>
            <IconButton icon="close" size={20} onPress={onDismiss} />
        </View>
        <View style={styles.content}>
            {children}
        </View>
      </PaperModal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
});
