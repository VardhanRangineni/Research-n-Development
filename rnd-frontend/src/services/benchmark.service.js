import apiClient from './api.client';

const API_BASE_URL = '/api/benchmarks';

export const benchmarkService = {
    async getAll() {
        return await apiClient.get(API_BASE_URL);
    },

    async getById(id) {
        return await apiClient.get(`${API_BASE_URL}/${id}`);
    },

    async getByBenchmarkId(benchmarkId) {
        return await apiClient.get(`${API_BASE_URL}/by-benchmark-id?benchmarkId=${encodeURIComponent(benchmarkId)}`);
    },

    async getByProjectIds(projectIds = []) {
        if (!Array.isArray(projectIds) || projectIds.length === 0) {
            return [];
        }
        const params = new URLSearchParams();
        projectIds.forEach((projectId) => params.append('projectIds', projectId));
        return await apiClient.get(`${API_BASE_URL}/by-project-ids?${params.toString()}`);
    },

    async create(product) {
        return await apiClient.post(API_BASE_URL, product);
    },

    async update(id, updates) {
        return await apiClient.put(`${API_BASE_URL}/${id}`, updates);
    },

    async stopDevelopment(id) {
        return await apiClient.put(`${API_BASE_URL}/${id}/stop-development`, {});
    },

    async delete(id) {
        return await apiClient.delete(`${API_BASE_URL}/${id}`);
    }
};
