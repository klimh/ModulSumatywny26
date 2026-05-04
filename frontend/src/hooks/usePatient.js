import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export function usePatient() {
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchMyPlan = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.patient.getMyPlan();
            setPlan(data);
            return data;
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const requestPhysio = async (physioId) => {
        setLoading(true);
        setError(null);
        try {
            return await api.users.requestPhysio(physioId);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const submitSession = async (rehabId, resultsList) => {
        setLoading(true);
        setError(null);
        try {
            return await api.patient.submitSession(rehabId, resultsList);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        plan, loading, error,
        fetchMyPlan, requestPhysio, submitSession
    };
}
