import { useEffect, useState } from 'react';
import { dbService, NewStudentData } from '../services/dbService';

export function useStudents() {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const data = await dbService.getStudents();
            setStudents(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    const addStudent = async (data: NewStudentData) => {
        try {
            await dbService.addStudent(data);
            await fetchStudents();
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    return { students, loading, error, refresh: fetchStudents, addStudent };
}
