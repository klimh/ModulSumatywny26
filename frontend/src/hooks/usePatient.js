import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export function usePatient() {
    const [plan, setPlan] = useState(null);
    const [physio, setPhysio] = useState(null);
    const [physioLoading, setPhysioLoading] = useState(false);
    const [allPhysios, setAllPhysios] = useState([]);
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

    const fetchMyPhysio = useCallback(async () => {
        setPhysioLoading(true);
        try {
            const data = await api.patient.getMyPhysio();
            setPhysio(data);
            return data;
        } catch (err) {
            // 404 means no physio assigned — not an error for the user
            if (!err.message.includes("Brak przypisanego")) {
                setError(err.message);
            }
            setPhysio(null);
        } finally {
            setPhysioLoading(false);
        }
    }, []);

    const fetchAllPhysios = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.users.getAllPhysiotherapists();
            setAllPhysios(data);
            return data;
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const requestPhysio = async (physioId) => {
        setLoading(true);
        try {
            return await api.users.requestPhysio(physioId);
        } catch (err) {
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

    const disconnectPhysio = async () => {
        setLoading(true);
        try {
            await api.users.disconnectPhysio();
            setPhysio(null);
            setPlan(null);
        } catch (err) {
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        plan, physio, physioLoading, allPhysios, loading, error,
        fetchMyPlan, fetchMyPhysio, fetchAllPhysios, requestPhysio, submitSession, disconnectPhysio
    };
}
