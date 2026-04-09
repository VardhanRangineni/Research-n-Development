import apiClient from './api.client';

const API_BASE_URL = '/api/calibration';

export const calibrationService = {
    async getAll() {
        return await apiClient.get(API_BASE_URL);
    },

    async getByEquipmentId(equipmentId) {
        return await apiClient.get(`${API_BASE_URL}/equipment/${equipmentId}`);
    },

    async create(record) {
        return await apiClient.post(API_BASE_URL, record);
    }
};
