import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export function useAI() {
    const [patternData, setPatternData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPattern = useCallback(async (exerciseId) => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.ai.getPattern(exerciseId);
            if (data.error) {
                throw new Error(data.error);
            }
            setPatternData(data.pattern);
            return data.pattern;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        patternData, loading, error, fetchPattern
    };
}
