import apiClient from './api.client';

export const stabilityService = {
    async getProtocolsPage(projectId, { page = 0, size = 5 } = {}) {
        return await apiClient.get(`/api/projects/${projectId}/stability-protocols?page=${page}&size=${size}`);
    },

    async getAllProtocols(projectId) {
        const result = await apiClient.get(`/api/projects/${projectId}/stability-protocols?page=0&size=100`);
        return Array.isArray(result?.content) ? result.content : [];
    },

    async createProtocol(projectId, payload) {
        return await apiClient.post(`/api/projects/${projectId}/stability-protocols`, payload);
    },

    async updateProtocolConfig(projectId, protocolId, payload) {
        return await apiClient.put(`/api/projects/${projectId}/stability-protocols/${protocolId}/config`, payload);
    },

    async getObservationsPage(projectId, protocolId, { page = 0, size = 500 } = {}) {
        return await apiClient.get(`/api/projects/${projectId}/stability-protocols/${protocolId}/observations?page=${page}&size=${size}`);
    },

    async getObservations(projectId, protocolId) {
        const result = await apiClient.get(`/api/projects/${projectId}/stability-protocols/${protocolId}/observations?page=0&size=500`);
        return Array.isArray(result?.content) ? result.content : [];
    },

    async upsertObservation(projectId, protocolId, payload) {
        return await apiClient.put(`/api/projects/${projectId}/stability-protocols/${protocolId}/observations`, payload);
    },

    async getGateCriteria(projectId, protocolId) {
        return await apiClient.get(`/api/projects/${projectId}/stability-protocols/${protocolId}/gate/criteria`);
    },

    async saveGateCriteria(projectId, protocolId, payload) {
        return await apiClient.put(`/api/projects/${projectId}/stability-protocols/${protocolId}/gate/criteria`, payload);
    },

    async decideGate(projectId, protocolId, payload) {
        return await apiClient.post(`/api/projects/${projectId}/stability-protocols/${protocolId}/gate/decide`, payload);
    },

    async applySimpleResult(projectId, result) {
        return await apiClient.post(`/api/projects/${projectId}/stability-protocols/simple-result`, { result });
    },

    async applySimpleProtocolResult(projectId, protocolId, payload) {
        return await apiClient.post(`/api/projects/${projectId}/stability-protocols/${protocolId}/simple-result`, payload);
    }
};
