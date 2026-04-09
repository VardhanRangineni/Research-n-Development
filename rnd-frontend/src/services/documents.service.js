import apiClient from './api.client';

export const documentsService = {
    async getByProject(projectRefId, { page = 0, size = 10 } = {}) {
        return await apiClient.get(`/api/projects/${projectRefId}/documents?page=${page}&size=${size}`);
    },

    async getByBenchmarkId(benchmarkId, { page = 0, size = 10 } = {}) {
        return await apiClient.get(`/api/audit/documents?benchmarkId=${encodeURIComponent(benchmarkId)}&page=${page}&size=${size}`);
    },

    async upload(projectRefId, file) {
        const formData = new FormData();
        formData.append('file', file);
        return await apiClient.postForm(`/api/projects/${projectRefId}/documents`, formData);
    }
};
