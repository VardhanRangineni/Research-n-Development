import apiClient from './api.client';

export const auditService = {
    async getTrailByBenchmarkId(benchmarkId) {
        return await apiClient.get(`/api/audit/trail?benchmarkId=${encodeURIComponent(benchmarkId)}`);
    },

    async getDocumentsByBenchmarkId(benchmarkId, { page = 0, size = 10 } = {}) {
        return await apiClient.get(`/api/audit/documents?benchmarkId=${encodeURIComponent(benchmarkId)}&page=${page}&size=${size}`);
    }
};
