import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
    const { user, loading, error, initialized, initAuth, login, logout, register } = useAuthStore();

    useEffect(() => {
        if (!initialized) {
            initAuth();
        }
    }, [initialized, initAuth]);

    return { user, loading, error, login, logout, register };
}
