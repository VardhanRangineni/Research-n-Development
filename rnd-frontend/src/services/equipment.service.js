import apiClient from './api.client';

const API_BASE_URL = '/api/equipment';

export const equipmentService = {
    async getAll() {
        return await apiClient.get(API_BASE_URL);
    },

    async getCalibrationEligible() {
        return await apiClient.get(`${API_BASE_URL}/calibration-eligible`);
    },

    async getById(id) {
        return await apiClient.get(`${API_BASE_URL}/${id}`);
    },

    async create(equipment) {
        return await apiClient.post(API_BASE_URL, equipment);
    },

    async bulkCreate(equipmentList) {
        return await apiClient.post(`${API_BASE_URL}/bulk`, equipmentList);
    },

    async update(id, updates) {
        return await apiClient.put(`${API_BASE_URL}/${id}`, updates);
    },

    async delete(id) {
        return await apiClient.delete(`${API_BASE_URL}/${id}`);
    }
};
