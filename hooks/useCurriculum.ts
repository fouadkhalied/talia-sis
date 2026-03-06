import { useState, useEffect, useCallback, useMemo } from 'react';
import { dbService, NewSubjectData } from '../services/dbService';
import { CurriculumSystem, GradeLevelNode, SubjectNode } from '../types';

interface CurriculumSystemRow {
    id: string;
    system: CurriculumSystem;
    academicYear: string;
}

interface GradeLevelRow {
    id: string;
    curriculumSystemId: string;
    name: string;
    orderIndex: number | null;
}

export const useCurriculum = () => {
    const [systemRow, setSystemRow] = useState<CurriculumSystemRow | null>(null);
    const [gradeLevelRows, setGradeLevelRows] = useState<GradeLevelRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const sys = await dbService.getCurriculumSystem();
            setSystemRow(sys as CurriculumSystemRow | null);
            if (sys) {
                const grades = await dbService.getGradeLevels(sys.id);
                setGradeLevelRows(grades as GradeLevelRow[]);
            } else {
                setGradeLevelRows([]);
            }
            setError(null);
        } catch (err) {
            console.error('Failed to fetch curriculum:', err);
            setError('Failed to load curriculum');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    /** Create a curriculum system (National / IG / IB / American) */
    const createSystem = async (system: CurriculumSystem | string) => {
        const year = new Date().getFullYear();
        const academicYear = `${year}/${year + 1}`;
        await dbService.createCurriculumSystem(system as any, academicYear);
        await refresh();
    };

    /** Get subjects for a grade level (fetched lazily, returns array) */
    const getSubjects = async (gradeLevelId: string): Promise<SubjectNode[]> => {
        const raw = await dbService.getSubjectsByGradeLevel(gradeLevelId);
        return raw.map(s => ({
            id: s.id,
            name: s.nameEn,
            code: s.code,
            nameEn: s.nameEn,
            nameAr: s.nameAr,
            department: s.department,
            weeks: [],
            resources: [],
            folders: [],
            lessonPlans: [],
            assignedTeacherIds: s.assignedTeacherIds,
        }));
    };

    /** Add a subject to a grade level */
    const addSubject = async (data: NewSubjectData) => {
        await dbService.addSubject(data);
    };

    /** Delete a subject */
    const deleteSubject = async (subjectId: string) => {
        await dbService.deleteSubject(subjectId);
    };

    /** Toggle teacher assignment on a subject */
    const toggleTeacher = async (subjectId: string, teacherId: string, gradeLevelId: string, currently: boolean) => {
        if (currently) {
            await dbService.removeTeacherFromSubject(subjectId, teacherId);
        } else {
            await dbService.assignTeacherToSubject(subjectId, teacherId, gradeLevelId);
        }
    };

    /** Save a lesson plan for a subject */
    const saveLessonPlan = async (plan: any, subjectId: string, gradeLevel: string) => {
        return await dbService.saveLessonPlan(plan, subjectId, gradeLevel);
    };

    /** Get lesson plans for a subject */
    const getLessonPlans = async (subjectId: string) => {
        return await dbService.getLessonPlansBySubject(subjectId);
    };

    /** Memoized grade level nodes — stable reference, only recalculated when DB rows change */
    const gradeNodes = useMemo<GradeLevelNode[]>(() =>
        gradeLevelRows.map(g => ({
            id: g.id,
            name: g.name,
            subjects: [],
        })),
        [gradeLevelRows]
    );

    return {
        systemRow,
        selectedSystem: systemRow?.system ?? null,
        gradeNodes,
        academicYear: systemRow?.academicYear ?? '',
        loading,
        error,
        refresh,
        createSystem,
        getSubjects,
        addSubject,
        deleteSubject,
        toggleTeacher,
        saveLessonPlan,
        getLessonPlans,
    };
};
