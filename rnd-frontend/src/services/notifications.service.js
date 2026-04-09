import apiClient from './api.client';

export const notificationsService = {
    async getAll() {
        return await apiClient.get('/api/notifications');
    }
};
