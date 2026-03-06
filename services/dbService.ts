import { db } from '../db';
import { users, students, roleEnum, studentStatusEnum } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface NewStudentData {
    name: string;
    email?: string;
    gradeLevel: string;
    dob?: string;
    status?: 'Active' | 'At Risk' | 'Inactive';
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
    }
};
