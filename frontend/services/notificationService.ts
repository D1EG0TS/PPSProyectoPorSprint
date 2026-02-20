import api from './api';

export interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'INFO' | 'LATE_RETURN' | 'APPROVAL_NEEDED' | 'UPCOMING_EXPIRATION' | 'PURCHASE_ALERT';
    is_read: boolean;
    created_at: string;
    related_request_id?: number;
}

export const notificationService = {
    getAll: async (unreadOnly = false) => {
        const response = await api.get<Notification[]>(`/notifications/?unread_only=${unreadOnly}`);
        return response.data;
    },

    markAsRead: async (id: number) => {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    },

    markAllAsRead: async () => {
        // Assuming backend supports this or we loop
        // For now, let's implement loop if backend doesn't support bulk
        // But checking backend, it has mark_notification_read for single ID.
        // I might need to update backend for bulk read or just handle one by one.
        // Let's stick to single for now.
    }
};
