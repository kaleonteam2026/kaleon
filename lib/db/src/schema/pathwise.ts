import { pgTable, text, real, json, timestamp, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const studentProfilesTable = pgTable("student_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  fullName: text("full_name"),
  communityCollege: text("community_college"),
  currentGpa: real("current_gpa"),
  intendedMajor: text("intended_major"),
  careerGoal: text("career_goal"),
  financialSituation: text("financial_situation"),
  transferTimeline: text("transfer_timeline"),
  geographicPreference: text("geographic_preference"),
  targetUniversities: json("target_universities").$type<string[]>(),
  longTermAspirations: text("long_term_aspirations"),
  isFirstGen: text("is_first_gen"),
  interests: json("interests").$type<string[]>(),
  completionPercent: real("completion_percent").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => studentProfilesTable.id),
  courseCode: text("course_code"),
  courseName: text("course_name").notNull(),
  units: real("units"),
  grade: text("grade"),
  status: text("status"), // completed | in_progress | planned
  term: text("term"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pathwaysTable = pgTable("pathways", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => studentProfilesTable.id),
  universityId: text("university_id"),
  compatibilityScore: real("compatibility_score"),
  pathwayType: text("pathway_type"), // least | moderate | most
  reportJson: json("report_json"),
  isSelected: text("is_selected").default("false"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const guidebooksTable = pgTable("guidebooks", {
  id: serial("id").primaryKey(),
  pathwayId: integer("pathway_id").notNull().references(() => pathwaysTable.id),
  profileId: integer("profile_id").notNull().references(() => studentProfilesTable.id),
  contentMarkdown: text("content_markdown"),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const studentProgressTable = pgTable("student_progress", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => studentProfilesTable.id),
  entryType: text("entry_type").notNull(), // gpa_update | certification | opportunity | milestone | achievement | setback | note
  title: text("title").notNull(),
  description: text("description"),
  entryDate: text("entry_date"), // ISO date string
  numericValue: real("numeric_value"), // for GPA updates
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const progressAnalysesTable = pgTable("progress_analyses", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => studentProfilesTable.id),
  contentMarkdown: text("content_markdown"),
  overallScore: real("overall_score"),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const academicRoadmapsTable = pgTable("academic_roadmaps", {
  id: serial("id").primaryKey(),
  pathwayId: integer("pathway_id").notNull().references(() => pathwaysTable.id),
  profileId: integer("profile_id").notNull().references(() => studentProfilesTable.id),
  contentMarkdown: text("content_markdown"),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod insert schemas
export const insertStudentProfileSchema = createInsertSchema(studentProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true });
export const insertPathwaySchema = createInsertSchema(pathwaysTable).omit({ id: true, createdAt: true });
export const insertGuidebookSchema = createInsertSchema(guidebooksTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAcademicRoadmapSchema = createInsertSchema(academicRoadmapsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const internshipSearchesTable = pgTable("internship_searches", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => studentProfilesTable.id),
  resultsJson: json("results_json").$type<Record<string, unknown>>(),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStudentProgressSchema = createInsertSchema(studentProgressTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProgressAnalysisSchema = createInsertSchema(progressAnalysesTable).omit({ id: true, createdAt: true });

export type StudentProfile = typeof studentProfilesTable.$inferSelect;
export type InsertStudentProfile = z.infer<typeof insertStudentProfileSchema>;
export type Course = typeof coursesTable.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Pathway = typeof pathwaysTable.$inferSelect;
export type InsertPathway = z.infer<typeof insertPathwaySchema>;
export type Guidebook = typeof guidebooksTable.$inferSelect;
export type InsertGuidebook = z.infer<typeof insertGuidebookSchema>;
export type AcademicRoadmap = typeof academicRoadmapsTable.$inferSelect;
export type InsertAcademicRoadmap = z.infer<typeof insertAcademicRoadmapSchema>;
export type InternshipSearch = typeof internshipSearchesTable.$inferSelect;
export type StudentProgress = typeof studentProgressTable.$inferSelect;
export type InsertStudentProgress = z.infer<typeof insertStudentProgressSchema>;
export type ProgressAnalysis = typeof progressAnalysesTable.$inferSelect;
export type InsertProgressAnalysis = z.infer<typeof insertProgressAnalysisSchema>;
