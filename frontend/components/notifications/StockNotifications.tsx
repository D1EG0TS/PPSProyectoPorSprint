import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { getWebSocketClient } from '../../services/websocketClient';
import { useAuth } from '../../hooks/useAuth';

export const StockNotifications = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'error' | 'success'>('info');

  useEffect(() => {
    if (!user?.id) return;
    const client = getWebSocketClient(user.id);

    const handleStockUpdate = (data: any) => {
        // Only notify if significant? Or if explicitly a "notification" type event?
        // For now, let's notify on movement applied if it's relevant to user?
        // Or if backend sends a specific 'notification' event.
        // Let's assume 'stock_updated' is too frequent.
        // But 'movement_applied' is good.
    };

    const handleMovementApplied = (data: any) => {
        setMessage(`Movement #${data.movement_id} applied successfully.`);
        setType('success');
        setVisible(true);
    };

    const handleLowStock = (data: any) => {
        setMessage(`Low stock alert: Product #${data.product_id} is below minimum.`);
        setType('error');
        setVisible(true);
    };

    client.subscribe('movement_applied', handleMovementApplied);
    // client.subscribe('low_stock', handleLowStock); // If backend emits this

    return () => {
        client.unsubscribe('movement_applied', handleMovementApplied);
        // client.unsubscribe('low_stock', handleLowStock);
    };
  }, [user?.id]);

  return (
    <Snackbar
      visible={visible}
      onDismiss={() => setVisible(false)}
      duration={3000}
      style={{
          backgroundColor: type === 'error' ? '#D32F2F' : type === 'success' ? '#388E3C' : '#323232'
      }}
      action={{
        label: 'Close',
        onPress: () => setVisible(false),
      }}
    >
      {message}
    </Snackbar>
  );
};
