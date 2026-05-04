import { create } from 'zustand';
import { api } from '@/lib/api';

export const useAuthStore = create((set, get) => ({
    user: null,
    loading: true,
    error: null,
    initialized: false,

    initAuth: async () => {
        if (get().initialized) return;

        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const userData = await api.users.getMe();
                    set({ user: userData, loading: false, initialized: true });
                    return;
                } catch (err) {
                    localStorage.removeItem('token');
                    console.error('Token verification failed:', err);
                }
            }
        }
        set({ user: null, loading: false, initialized: true });
    },

    login: async (email, password) => {
        set({ loading: true, error: null });
        try {
            const data = await api.auth.login(email, password);
            if (typeof window !== 'undefined') {
                localStorage.setItem('token', data.access_token);
            }
            const userData = await api.users.getMe();
            set({ user: userData, loading: false });
            return userData;
        } catch (err) {
            set({ error: err.message, loading: false });
            throw err;
        }
    },

    logout: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
        }
        set({ user: null, error: null });
    },

    register: async (userData) => {
        set({ loading: true, error: null });
        try {
            const result = await api.users.register(userData);
            set({ loading: false });
            return result;
        } catch (err) {
            set({ error: err.message, loading: false });
            throw err;
        }
    }
}));
