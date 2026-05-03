import { pgTable, text, real, json, timestamp, serial, integer, uniqueIndex } from "drizzle-orm/pg-core";
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
  preferredLocale: text("preferred_locale").default("en"),
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

export const savedInternshipsTable = pgTable("saved_internships", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => studentProfilesTable.id),
  internshipSlug: text("internship_slug").notNull(),
  internshipData: json("internship_data").$type<Record<string, unknown>>().notNull(),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
});

export interface DeepDiveSection {
  key: "admissions" | "cost" | "outcomes" | "campus_life" | "news";
  title: string;
  body: string;
  citations: { title?: string; url: string; snippet?: string }[];
}

export interface DeepDiveReport {
  universityId: string;
  universityName: string;
  major: string;
  generatedAt: string;
  sections: DeepDiveSection[];
  disclaimer: string;
}

export const universityDeepDivesTable = pgTable(
  "university_deep_dives",
  {
    id: serial("id").primaryKey(),
    universityId: text("university_id").notNull(),
    major: text("major").notNull(),
    reportJson: json("report_json").$type<DeepDiveReport>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => ({
    uniMajorIdx: uniqueIndex("university_deep_dives_uni_major_idx").on(t.universityId, t.major),
  }),
);

export const igetcProgressTable = pgTable("igetc_progress", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => studentProfilesTable.id).unique(),
  areas: json("areas").$type<Record<string, boolean>>().notNull().default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const roadmapInfographicsTable = pgTable(
  "roadmap_infographics",
  {
    id: serial("id").primaryKey(),
    roadmapId: integer("roadmap_id").notNull().references(() => academicRoadmapsTable.id),
    profileId: integer("profile_id").notNull().references(() => studentProfilesTable.id),
    versionHash: text("version_hash").notNull(),
    pngObjectPath: text("png_object_path").notNull(),
    pdfObjectPath: text("pdf_object_path").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    roadmapVersionIdx: uniqueIndex("roadmap_infographics_roadmap_version_idx").on(t.roadmapId, t.versionHash),
  }),
);

export const roadmapShareLinksTable = pgTable(
  "roadmap_share_links",
  {
    id: serial("id").primaryKey(),
    roadmapId: integer("roadmap_id").notNull().references(() => academicRoadmapsTable.id),
    profileId: integer("profile_id").notNull().references(() => studentProfilesTable.id),
    token: text("token").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => ({
    tokenIdx: uniqueIndex("roadmap_share_links_token_idx").on(t.token),
  }),
);

export type RoadmapShareLink = typeof roadmapShareLinksTable.$inferSelect;

// ─── Deadline reminders (Task #16) ───────────────────────────────────────────
export const reminderPrefsTable = pgTable("reminder_prefs", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => studentProfilesTable.id).unique(),
  enabled: text("enabled").notNull().default("true"), // "true" | "false"
  channelInApp: text("channel_in_app").notNull().default("true"),
  channelEmail: text("channel_email").notNull().default("false"),
  leadDays: json("lead_days").$type<number[]>().notNull().default([30, 14, 7, 1]),
  lastRunDay: text("last_run_day"), // YYYY-MM-DD; for per-user-day batching
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const remindersTable = pgTable(
  "reminders",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").notNull().references(() => studentProfilesTable.id),
    deadlineId: text("deadline_id").notNull(), // matches DEADLINE source id
    deadlineLabel: text("deadline_label").notNull(),
    deadlineDate: text("deadline_date").notNull(), // ISO yyyy-mm-dd
    leadDays: integer("lead_days").notNull(), // which lead-time bucket fired
    category: text("category").notNull(),
    priority: text("priority").notNull(),
    url: text("url"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("unread"), // unread | read | snoozed | done
    snoozeUntil: timestamp("snooze_until"),
    emailSent: text("email_sent").notNull().default("false"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniquePerBucket: uniqueIndex("reminders_profile_deadline_lead_date_idx").on(
      t.profileId, t.deadlineId, t.leadDays, t.deadlineDate,
    ),
  }),
);

export type ReminderPrefs = typeof reminderPrefsTable.$inferSelect;
export type Reminder = typeof remindersTable.$inferSelect;

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
export type SavedInternship = typeof savedInternshipsTable.$inferSelect;
export type IgetcProgress = typeof igetcProgressTable.$inferSelect;
export type InsertStudentProgress = z.infer<typeof insertStudentProgressSchema>;
export type ProgressAnalysis = typeof progressAnalysesTable.$inferSelect;
export type InsertProgressAnalysis = z.infer<typeof insertProgressAnalysisSchema>;
