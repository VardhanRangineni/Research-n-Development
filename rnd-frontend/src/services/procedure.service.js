import apiClient from './api.client';

const BASE = '/api/procedure-files';

export const procedureService = {

    async getPassedProjects() {
        return await apiClient.get(`${BASE}/passed-projects`);
    },

    async getByProject(projectRefId) {
        return await apiClient.get(`${BASE}?projectRefId=${projectRefId}`);
    },

    async getById(id) {
        return await apiClient.get(`${BASE}/${id}`);
    },

    async create(payload) {
        return await apiClient.post(BASE, payload);
    },

    async update(id, payload) {
        return await apiClient.put(`${BASE}/${id}`, payload);
    },

    async delete(id) {
        return await apiClient.delete(`${BASE}/${id}`);
    },

    // ── Sections ────────────────────────────────────────────────────────────────

    async addSection(fileId, payload) {
        return await apiClient.post(`${BASE}/${fileId}/sections`, payload);
    },

    async updateSection(fileId, sectionId, payload) {
        return await apiClient.put(`${BASE}/${fileId}/sections/${sectionId}`, payload);
    },

    async deleteSection(fileId, sectionId) {
        return await apiClient.delete(`${BASE}/${fileId}/sections/${sectionId}`);
    },

    // ── Rows ────────────────────────────────────────────────────────────────────

    async addRow(fileId, sectionId, payload) {
        return await apiClient.post(`${BASE}/${fileId}/sections/${sectionId}/rows`, payload);
    },

    async updateRow(fileId, sectionId, rowId, payload) {
        return await apiClient.put(`${BASE}/${fileId}/sections/${sectionId}/rows/${rowId}`, payload);
    },

    async deleteRow(fileId, sectionId, rowId) {
        return await apiClient.delete(`${BASE}/${fileId}/sections/${sectionId}/rows/${rowId}`);
    }
};
