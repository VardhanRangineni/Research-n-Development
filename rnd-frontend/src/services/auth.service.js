// In production this should be an empty string when the frontend is served from the
// same origin as the backend (e.g. behind an nginx reverse proxy).
// Set VITE_API_BASE_URL in .env.production when they differ.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const getCookieValue = (name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
};

export const authService = {
    async initCsrf() {
        try {
            await fetch(`${API_BASE_URL}/api/auth/csrf`, {
                method: 'GET',
                credentials: 'include'
            });
        } catch {
            // no-op: login flow will still surface explicit error if auth fails
        }
    },

    // Hits the backend Local Dev Auth endpoint
    async login(email, password) {
        await this.initCsrf();

        // We use username in backend but frontend sends email. We will map email -> username.
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': getCookieValue('XSRF-TOKEN')
            },
            credentials: 'include',
            body: JSON.stringify({ username: email, password: password })
        });

        if (!response.ok) {
            throw new Error('Invalid email or password');
        }

        await response.json();
        await this.initCsrf();
        const profile = await this.getProfile();
        const user = {
            name: profile.username,
            email: email,
            role: profile.role || 'EXECUTIVE',
            roles: Array.isArray(profile.roles) ? profile.roles : [profile.role || 'EXECUTIVE'],
            allowedPages: Array.isArray(profile.allowedPages) ? profile.allowedPages : []
        };
        localStorage.setItem('currentUser', JSON.stringify(user));
        return { user };
    },

    async getProfile() {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Unauthorized');
        }

        return response.json();
    },

    async logout() {
        try {
            await this.initCsrf();
            await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'X-XSRF-TOKEN': getCookieValue('XSRF-TOKEN')
                },
                credentials: 'include'
            });
        } catch {
            // Continue local logout cleanup even if backend call fails
        }
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
    },

    // A method to check if the user is authenticated by hitting a protected endpoint
    async checkAuth() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                method: 'GET',
                credentials: 'include', // Important to send JSESSIONID cookie
            });
            return response.ok;
        } catch {
            return false;
        }
    },

    getCurrentUser() {
        const stored = localStorage.getItem('currentUser');
        return stored ? JSON.parse(stored) : null;
    },

    isAuthenticated() {
        return !!this.getCurrentUser();
    }
};
