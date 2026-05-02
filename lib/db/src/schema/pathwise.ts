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

// Zod insert schemas
export const insertStudentProfileSchema = createInsertSchema(studentProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true });
export const insertPathwaySchema = createInsertSchema(pathwaysTable).omit({ id: true, createdAt: true });
export const insertGuidebookSchema = createInsertSchema(guidebooksTable).omit({ id: true, createdAt: true, updatedAt: true });

export type StudentProfile = typeof studentProfilesTable.$inferSelect;
export type InsertStudentProfile = z.infer<typeof insertStudentProfileSchema>;
export type Course = typeof coursesTable.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Pathway = typeof pathwaysTable.$inferSelect;
export type InsertPathway = z.infer<typeof insertPathwaySchema>;
export type Guidebook = typeof guidebooksTable.$inferSelect;
export type InsertGuidebook = z.infer<typeof insertGuidebookSchema>;
