import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { MaintenanceDashboard } from '../../../../components/maintenance/MaintenanceDashboard';

export default function MaintenanceDashboardScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Maintenance Dashboard' }} />
      <View style={styles.container}>
        <MaintenanceDashboard />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
