import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export function usePhysio() {
    const [patients, setPatients] = useState([]);
    const [exercises, setExercises] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchMyPatients = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.physio.getMyPatients();
            setPatients(data);
            return data;
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchExercises = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.physio.getAllExercises();
            setExercises(data);
            return data;
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.physio.getPendingRequests();
            setRequests(data);
            return data;
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const addExercise = async (exerciseData) => {
        setError(null);
        try {
            const newExercise = await api.physio.addExercise(exerciseData);
            setExercises(prev => [...prev, newExercise]);
            return newExercise;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const createPlan = async (planData) => {
        setError(null);
        try {
            return await api.physio.createPlan(planData);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const respondToRequest = async (requestId, accept) => {
        setError(null);
        try {
            await api.physio.respondRequest(requestId, accept);
            await fetchRequests();
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    return {
        patients, exercises, requests, loading, error,
        fetchMyPatients, fetchExercises, fetchRequests,
        addExercise, createPlan, respondToRequest
    };
}
