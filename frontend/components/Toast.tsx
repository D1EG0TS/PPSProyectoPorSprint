import React from 'react';
import { StyleSheet, View } from 'react-native';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { Colors } from '../constants/Colors';

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: Colors.success }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.success
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: Colors.danger }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.danger
      }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: Colors.info }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.info
      }}
    />
  ),
  warning: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: Colors.warning }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.warning
      }}
    />
  )
};

export const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
  });
};
