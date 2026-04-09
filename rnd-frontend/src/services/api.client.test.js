import { describe, expect, it } from 'vitest';
import apiClient from './api.client';

describe('apiClient contract', () => {
    it('exposes standard HTTP methods', () => {
        expect(typeof apiClient.get).toBe('function');
        expect(typeof apiClient.post).toBe('function');
        expect(typeof apiClient.postForm).toBe('function');
        expect(typeof apiClient.put).toBe('function');
        expect(typeof apiClient.delete).toBe('function');
    });
});
