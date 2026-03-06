import { drizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';

// For browser persistence, use idb:// prefix
// For Node.js persistence, use a file path
let client: PGlite;
try {
	client = new PGlite('idb://faheem-school-db-v5');
} catch (e) {
	console.error("Failed to initialize PGLite client:", e);
	// Fallback to in-memory if IndexedDB fails (e.g. Incognito or Node environment)
	client = new PGlite();
}

export const db = drizzle(client, { schema });

// Initialization logic
export const initDb = async () => {
	try {
		console.log("Syncing database schema...");

		const migrationSql = `
-- Enums (using DO blocks to avoid errors if they already exist)
DO $$ BEGIN CREATE TYPE "public"."curriculum_system" AS ENUM('National', 'IG', 'IB', 'American'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."employment_type" AS ENUM('Full-time', 'Part-time', 'Contract'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."role" AS ENUM('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."student_status" AS ENUM('Active', 'At Risk', 'Inactive'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."academic_term_status" AS ENUM('Active', 'Locked', 'Archived', 'Draft'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."academic_year_status" AS ENUM('Active', 'Archived', 'Draft'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."grade_entry_status" AS ENUM('Submitted', 'Graded', 'Missing', 'Late', 'Excused'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."term_division" AS ENUM('Semesters', 'Trimesters', 'Quarters'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."attendance_method" AS ENUM('QR', 'Manual', 'Geo'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."attendance_session_status" AS ENUM('Active', 'Closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."attendance_status" AS ENUM('Present', 'Absent', 'Late', 'Excused', 'Left Early'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."fee_status" AS ENUM('Paid', 'Pending', 'Overdue'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."notification_category" AS ENUM('ACADEMIC', 'FINANCIAL', 'BEHAVIORAL', 'ADMINISTRATIVE'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text CONSTRAINT "users_email_unique" UNIQUE,
	"avatar" text,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "teachers" (
	"id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"specialization" text,
	"hiring_date" date,
	"employment_type" "employment_type",
	"phone" text,
	"academic_load" integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "class_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"grade_level" text NOT NULL,
	"curriculum_system" "curriculum_system",
	"academic_year" text NOT NULL,
	"room" text,
	"homeroom_teacher_id" uuid REFERENCES "teachers"("id") ON DELETE set null,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "students" (
	"id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"class_id" uuid REFERENCES "class_sections"("id") ON DELETE set null,
	"grade_level" text NOT NULL,
	"status" "student_status" DEFAULT 'Active',
	"dob" date,
	"national_id" text CONSTRAINT "students_national_id_unique" UNIQUE,
	"enrollment_date" date,
	"attendance_score" numeric DEFAULT '100',
	"performance_score" numeric DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS "teacher_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL REFERENCES "teachers"("id") ON DELETE cascade,
	"class_id" uuid NOT NULL REFERENCES "class_sections"("id") ON DELETE cascade,
	"subject_name" text NOT NULL,
	CONSTRAINT "teacher_classes_teacher_id_class_id_subject_name_unique" UNIQUE("teacher_id","class_id","subject_name")
);

CREATE TABLE IF NOT EXISTS "academic_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" "academic_year_status" DEFAULT 'Draft',
	"term_division" "term_division"
);

CREATE TABLE IF NOT EXISTS "academic_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid REFERENCES "academic_years"("id") ON DELETE cascade,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"status" "academic_term_status" DEFAULT 'Draft'
);

CREATE TABLE IF NOT EXISTS "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text CONSTRAINT "subjects_code_unique" UNIQUE,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"grade_level" text NOT NULL,
	"credits" numeric,
	"department" text
);

CREATE TABLE IF NOT EXISTS "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"max_score" numeric NOT NULL,
	"assessment_date" date,
	"term_id" uuid REFERENCES "academic_terms"("id") ON DELETE cascade,
	"subject_id" uuid REFERENCES "subjects"("id") ON DELETE cascade,
	"class_id" uuid REFERENCES "class_sections"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "grade_entries" (
	"student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE cascade,
	"assessment_id" uuid NOT NULL REFERENCES "assessments"("id") ON DELETE cascade,
	"score" numeric,
	"status" "grade_entry_status" DEFAULT 'Graded',
	"feedback" text,
	CONSTRAINT "grade_entries_student_id_assessment_id_unique" UNIQUE("student_id","assessment_id")
);

CREATE TABLE IF NOT EXISTS "lesson_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"grade_level" text NOT NULL,
	"subject_id" uuid REFERENCES "subjects"("id") ON DELETE cascade,
	"teacher_id" uuid REFERENCES "teachers"("id") ON DELETE cascade,
	"objectives" jsonb,
	"materials" jsonb,
	"outline" jsonb,
	"quiz" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid REFERENCES "class_sections"("id") ON DELETE cascade,
	"subject_id" uuid REFERENCES "subjects"("id") ON DELETE set null,
	"session_date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"status" "attendance_session_status" DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid REFERENCES "attendance_sessions"("id") ON DELETE cascade,
	"student_id" uuid REFERENCES "students"("id") ON DELETE cascade,
	"status" "attendance_status" NOT NULL,
	"scan_time" timestamp with time zone DEFAULT now(),
	"method" "attendance_method" DEFAULT 'Manual',
	"notes" text,
	CONSTRAINT "attendance_records_session_id_student_id_unique" UNIQUE("session_id","student_id")
);

CREATE TABLE IF NOT EXISTS "fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid REFERENCES "students"("id") ON DELETE cascade,
	"title" text NOT NULL,
	"amount" numeric NOT NULL,
	"due_date" date NOT NULL,
	"status" "fee_status" DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS "notification_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"category" "notification_category" NOT NULL,
	"enabled" boolean DEFAULT true,
	"channels" jsonb,
	"recipients" jsonb,
	"ai_purpose_en" text,
	"ai_purpose_ar" text
);

        `;

		await client.exec(migrationSql);
		console.log("Database schema synced successfully.");
	} catch (err) {
		console.error("Database initialization failed:", err);
	}
};

