import { useState, useEffect, useCallback } from 'react';
import { Teacher } from '../types';
import { dbService, NewTeacherData } from '../services/dbService';

export const useTeachers = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const data = await dbService.getTeachers();
            setTeachers(data as Teacher[]);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch teachers:', err);
            setError('Failed to load teachers');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const addTeacher = async (data: NewTeacherData) => {
        try {
            await dbService.addTeacher(data);
            await refresh();
        } catch (err) {
            console.error('Failed to add teacher:', err);
            throw err;
        }
    };

    return {
        teachers,
        loading,
        error,
        refresh,
        addTeacher
    };
};
