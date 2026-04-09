import apiClient from './api.client';

export const batchFormulaService = {
    async getAllByProject(projectId) {
        return await apiClient.get(`/api/projects/${projectId}/batches`);
    },

    async getById(projectId, batchId) {
        return await apiClient.get(`/api/projects/${projectId}/batches/${batchId}`);
    },

    async create(projectId, payload) {
        return await apiClient.post(`/api/projects/${projectId}/batches`, payload);
    },

    async updateRemark(projectId, batchId, remark) {
        return await apiClient.put(`/api/projects/${projectId}/batches/${batchId}/remark`, { remark });
    },

    async applyDecision(projectId, batchId, status, remark) {
        return await apiClient.put(`/api/projects/${projectId}/batches/${batchId}/decision`, { status, remark });
    }
};
