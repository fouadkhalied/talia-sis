CREATE TYPE "public"."curriculum_system" AS ENUM('National', 'IG', 'IB', 'American');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('Full-time', 'Part-time', 'Contract');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('Active', 'At Risk', 'Inactive');--> statement-breakpoint
CREATE TABLE "class_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"grade_level" text NOT NULL,
	"curriculum_system" "curriculum_system",
	"academic_year" text NOT NULL,
	"room" text,
	"homeroom_teacher_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY NOT NULL,
	"class_id" uuid,
	"grade_level" text NOT NULL,
	"status" "student_status" DEFAULT 'Active',
	"dob" date,
	"national_id" text,
	"enrollment_date" date,
	"attendance_score" numeric DEFAULT '100',
	"performance_score" numeric DEFAULT '0',
	CONSTRAINT "students_national_id_unique" UNIQUE("national_id")
);
--> statement-breakpoint
CREATE TABLE "teacher_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_name" text NOT NULL,
	CONSTRAINT "teacher_classes_teacher_id_class_id_subject_name_unique" UNIQUE("teacher_id","class_id","subject_name")
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"specialization" text,
	"hiring_date" date,
	"employment_type" "employment_type",
	"phone" text,
	"academic_load" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"avatar" text,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_homeroom_teacher_id_teachers_id_fk" FOREIGN KEY ("homeroom_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_class_sections_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."class_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_classes" ADD CONSTRAINT "teacher_classes_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_classes" ADD CONSTRAINT "teacher_classes_class_id_class_sections_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."class_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;