import api from './api';

export interface NotificationPreferences {
  id: number;
  user_id: number;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  sms_enabled: boolean;
  purchase_order_created: boolean;
  purchase_order_approved: boolean;
  purchase_order_rejected: boolean;
  purchase_order_sent: boolean;
  purchase_order_confirmed: boolean;
  purchase_order_received: boolean;
  purchase_order_cancelled: boolean;
  low_stock_alert: boolean;
  expiration_warning: boolean;
  payment_due_reminder: boolean;
  email_frequency: string;
  created_at: number;
  updated_at: number | null;
}

export interface UpdatePreferencesRequest {
  email_enabled?: boolean;
  push_enabled?: boolean;
  in_app_enabled?: boolean;
  sms_enabled?: boolean;
  purchase_order_created?: boolean;
  purchase_order_approved?: boolean;
  purchase_order_rejected?: boolean;
  purchase_order_sent?: boolean;
  purchase_order_confirmed?: boolean;
  purchase_order_received?: boolean;
  purchase_order_cancelled?: boolean;
  low_stock_alert?: boolean;
  expiration_warning?: boolean;
  payment_due_reminder?: boolean;
  email_frequency?: string;
}

interface ExpoNotificationsModule {
  setNotificationHandler: (handler: any) => void;
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getExpoPushTokenAsync: () => Promise<{ data: string }>;
}

let Notifications: ExpoNotificationsModule | null = null;

try {
  Notifications = require('expo-notifications') as ExpoNotificationsModule;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.warn('expo-notifications not available:', e);
}

export const notificationPreferencesService = {
  get: async (): Promise<NotificationPreferences> => {
    const response = await api.get('/notifications/preferences');
    return response.data;
  },

  update: async (data: UpdatePreferencesRequest): Promise<NotificationPreferences> => {
    const response = await api.put('/notifications/preferences', data);
    return response.data;
  },

  registerPushToken: async (token: string, platform: string = 'expo', deviceId?: string): Promise<void> => {
    await api.post('/notifications/register-push-token', {
      token,
      platform,
      device_id: deviceId,
    });
  },

  unregisterPushToken: async (token: string): Promise<void> => {
    await api.delete('/notifications/unregister-push-token', {
      params: { token },
    });
  },

  requestPermissions: async (): Promise<boolean> => {
    if (!Notifications) {
      console.warn('expo-notifications not available');
      return false;
    }
    
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        return true;
      }
      
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  },

  getExpoPushToken: async (): Promise<string | null> => {
    if (!Notifications) {
      console.warn('expo-notifications not available');
      return null;
    }
    
    try {
      const hasPermission = await notificationPreferencesService.requestPermissions();
      if (!hasPermission) {
        return null;
      }
      
      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  },
};
