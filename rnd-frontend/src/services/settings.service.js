import apiClient from './api.client';

const BASE = '/api/settings';

export const settingsService = {
    async getRoles() {
        return await apiClient.get(`${BASE}/roles`);
    },

    async getUsers() {
        return await apiClient.get(`${BASE}/users`);
    },

    async createUser(payload) {
        return await apiClient.post(`${BASE}/users`, payload);
    },

    async updateUser(id, payload) {
        return await apiClient.put(`${BASE}/users/${id}`, payload);
    },

    async deleteUser(id) {
        return await apiClient.delete(`${BASE}/users/${id}`);
    }
};
