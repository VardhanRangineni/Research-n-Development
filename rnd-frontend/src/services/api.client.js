import { authService } from './auth.service';

const BASE = import.meta.env.VITE_API_BASE_URL || '';

const getCookieValue = (name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
};

const handleResponse = async (response) => {
    if (response.status === 401) {
        authService.logout();
        throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
        let errorMessage = 'An error occurred during the request';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
            // non-JSON error body — fall through to generic message
        }
        throw new Error(errorMessage);
    }

    if (response.status === 204) return null;

    try {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch {
        return null;
    }
};

const getAuthHeaders = (extraHeaders = {}) => {
    const headers = { ...extraHeaders };
    const csrfToken = getCookieValue('XSRF-TOKEN');
    if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken;
    }
    return headers;
};

export const apiClient = {
    async get(url) {
        const response = await fetch(`${BASE}${url}`, {
            method: 'GET',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include'
        });
        return handleResponse(response);
    },

    async post(url, data) {
        const response = await fetch(`${BASE}${url}`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    async postForm(url, formData) {
        const response = await fetch(`${BASE}${url}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: formData
        });
        return handleResponse(response);
    },

    async put(url, data) {
        const response = await fetch(`${BASE}${url}`, {
            method: 'PUT',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    async delete(url) {
        const response = await fetch(`${BASE}${url}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'
        });
        return handleResponse(response);
    }
};

export default apiClient;
