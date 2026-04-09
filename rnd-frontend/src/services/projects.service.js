import apiClient from './api.client';

const API_BASE_URL = '/api/projects';

export const projectsService = {
    async getPage({ page = 0, size = 9, query = '' } = {}) {
        const params = new URLSearchParams({ page: `${page}`, size: `${size}` });
        if (query?.trim()) {
            params.set('q', query.trim());
        }
        return await apiClient.get(`${API_BASE_URL}?${params.toString()}`);
    },

    async getAll() {
        const result = await apiClient.get(`${API_BASE_URL}?page=0&size=500`);
        return Array.isArray(result?.content) ? result.content : [];
    },

    async getById(id) {
        return await apiClient.get(`${API_BASE_URL}/${id}`);
    },

    async updateName(id, projectName) {
        return await apiClient.put(`${API_BASE_URL}/${id}/name`, { projectName });
    }
};
