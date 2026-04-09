import apiClient from './api.client';

const API_BASE_URL = '/api/ingredients';

export const ingredientsService = {
    async getAll() {
        return await apiClient.get(API_BASE_URL);
    },

    async getById(id) {
        return await apiClient.get(`${API_BASE_URL}/${id}`);
    },

    async create(ingredient) {
        return await apiClient.post(API_BASE_URL, ingredient);
    },

    async bulkCreate(ingredients) {
        return await apiClient.post(`${API_BASE_URL}/bulk`, ingredients);
    },

    async update(id, updates) {
        return await apiClient.put(`${API_BASE_URL}/${id}`, updates);
    },

    async delete(id) {
        return await apiClient.delete(`${API_BASE_URL}/${id}`);
    }
};
