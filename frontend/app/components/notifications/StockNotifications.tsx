import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Snackbar, Portal } from 'react-native-paper';
import { useAuth } from '../../../hooks/useAuth';

// This component would ideally subscribe to a WebSocket or polling service
// For now, it mocks receiving a notification
export const StockNotifications = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    // Mock simulation of a notification
    // In production, this would be an event listener
    if (!user) return;

    const timer = setTimeout(() => {
      // 5% chance to show a notification on mount/refresh
      if (Math.random() > 0.95) {
        setMessage('Alert: Low stock for "Safety Gloves" in Warehouse A');
        setVisible(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [user]);

  const onDismiss = () => setVisible(false);

  return (
    <Portal>
      <Snackbar
        visible={visible}
        onDismiss={onDismiss}
        duration={5000}
        action={{
          label: 'View',
          onPress: () => {
            // Navigate to detail
          },
        }}
        style={styles.snackbar}
      >
        {message}
      </Snackbar>
    </Portal>
  );
};

const styles = StyleSheet.create({
  snackbar: {
    backgroundColor: '#323232',
  }
});
