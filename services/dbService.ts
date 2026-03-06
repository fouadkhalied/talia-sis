import { db } from '../db';
import { users, students, teachers, roleEnum, studentStatusEnum, employmentTypeEnum } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface NewStudentData {
    name: string;
    email?: string;
    gradeLevel: string;
    dob?: string;
    status?: 'Active' | 'At Risk' | 'Inactive';
}

export interface NewTeacherData {
    name: string;
    email: string;
    specialization: string;
    hiringDate: string;
    employmentType: 'Full-time' | 'Part-time' | 'Contract';
    phone?: string;
}

export const dbService = {
    async getStudents() {
        const results = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                avatar: users.avatar,
                role: users.role,
                grade: students.gradeLevel,
                status: students.status,
                attendance: students.attendanceScore,
                performance: students.performanceScore,
            })
            .from(users)
            .innerJoin(students, eq(users.id, students.id));

        return results.map(r => ({
            ...r,
            attendance: Number(r.attendance || 0),
            performance: Number(r.performance || 0),
            status: r.status || 'Active',
            fees: [], // Initialize empty for now
            installmentPlans: [],
            reportCards: [],
        }));
    },

    async addStudent(data: NewStudentData) {
        return await db.transaction(async (tx) => {
            const userId = crypto.randomUUID();

            // 1. Create User
            await tx.insert(users).values({
                id: userId,
                name: data.name,
                email: data.email,
                role: 'STUDENT',
            });

            // 2. Create Student record
            await tx.insert(students).values({
                id: userId,
                gradeLevel: data.gradeLevel,
                status: data.status as any || 'Active',
                dob: data.dob,
            });

            return { id: userId, ...data };
        });
    },

    async getTeachers() {
        const results = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                avatar: users.avatar,
                role: users.role,
                specialization: teachers.specialization,
                hiringDate: teachers.hiringDate,
                employmentType: teachers.employmentType,
                phone: teachers.phone,
                academicLoad: teachers.academicLoad,
            })
            .from(users)
            .innerJoin(teachers, eq(users.id, teachers.id));

        return results.map(r => ({
            ...r,
            assignedClasses: [], // Initialize empty for now
            academicLoad: Number(r.academicLoad || 0),
        }));
    },

    async addTeacher(data: NewTeacherData) {
        return await db.transaction(async (tx) => {
            const userId = crypto.randomUUID();

            // 1. Create User
            await tx.insert(users).values({
                id: userId,
                name: data.name,
                email: data.email,
                role: 'TEACHER',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`,
            });

            // 2. Create Teacher record
            await tx.insert(teachers).values({
                id: userId,
                specialization: data.specialization,
                hiringDate: data.hiringDate,
                employmentType: data.employmentType as any,
                phone: data.phone,
            });

            return { id: userId, ...data };
        });
    }
};
