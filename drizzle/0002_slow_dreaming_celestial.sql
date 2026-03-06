CREATE TYPE "public"."attendance_method" AS ENUM('QR', 'Manual', 'Geo');--> statement-breakpoint
CREATE TYPE "public"."attendance_session_status" AS ENUM('Active', 'Closed');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('Present', 'Absent', 'Late', 'Excused', 'Left Early');--> statement-breakpoint
CREATE TYPE "public"."fee_status" AS ENUM('Paid', 'Pending', 'Overdue');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('ACADEMIC', 'FINANCIAL', 'BEHAVIORAL', 'ADMINISTRATIVE');--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"student_id" uuid,
	"status" "attendance_status" NOT NULL,
	"scan_time" timestamp with time zone DEFAULT now(),
	"method" "attendance_method" DEFAULT 'Manual',
	"notes" text,
	CONSTRAINT "attendance_records_session_id_student_id_unique" UNIQUE("session_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid,
	"subject_id" uuid,
	"session_date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"status" "attendance_session_status" DEFAULT 'Active'
);
--> statement-breakpoint
CREATE TABLE "fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid,
	"title" text NOT NULL,
	"amount" numeric NOT NULL,
	"due_date" date NOT NULL,
	"status" "fee_status" DEFAULT 'Pending'
);
--> statement-breakpoint
CREATE TABLE "lesson_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"grade_level" text NOT NULL,
	"subject_id" uuid,
	"teacher_id" uuid,
	"objectives" jsonb,
	"materials" jsonb,
	"outline" jsonb,
	"quiz" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_triggers" (
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
--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_class_id_class_sections_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."class_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;