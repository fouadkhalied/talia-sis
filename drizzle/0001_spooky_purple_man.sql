CREATE TYPE "public"."academic_term_status" AS ENUM('Active', 'Locked', 'Archived', 'Draft');--> statement-breakpoint
CREATE TYPE "public"."academic_year_status" AS ENUM('Active', 'Archived', 'Draft');--> statement-breakpoint
CREATE TYPE "public"."grade_entry_status" AS ENUM('Submitted', 'Graded', 'Missing', 'Late', 'Excused');--> statement-breakpoint
CREATE TYPE "public"."term_division" AS ENUM('Semesters', 'Trimesters', 'Quarters');--> statement-breakpoint
CREATE TABLE "academic_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"status" "academic_term_status" DEFAULT 'Draft'
);
--> statement-breakpoint
CREATE TABLE "academic_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" "academic_year_status" DEFAULT 'Draft',
	"term_division" "term_division"
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"max_score" numeric NOT NULL,
	"assessment_date" date,
	"term_id" uuid,
	"subject_id" uuid,
	"class_id" uuid
);
--> statement-breakpoint
CREATE TABLE "grade_entries" (
	"student_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"score" numeric,
	"status" "grade_entry_status" DEFAULT 'Graded',
	"feedback" text,
	CONSTRAINT "grade_entries_student_id_assessment_id_unique" UNIQUE("student_id","assessment_id")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"grade_level" text NOT NULL,
	"credits" numeric,
	"department" text,
	CONSTRAINT "subjects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_class_id_class_sections_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."class_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_entries" ADD CONSTRAINT "grade_entries_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_entries" ADD CONSTRAINT "grade_entries_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;