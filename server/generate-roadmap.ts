import { deepSeekChat } from "./deepseek-client.ts";
import { GRADUATION_UNITS } from "../src/lib/course-progress.ts";

export interface RoadmapGenerationInput {
  pathway: {
    university: string;
    pathwayType: string;
    compatibilityScore: number;
    gpaTarget: number;
    requiredUnits: number;
    whyItFits: string;
    concerns: string;
    transferTimeline: string;
    courseGaps: string[];
    risks: string[];
    nextSteps: string[];
  };
  profile: {
    fullName?: string;
    communityCollege?: string;
    intendedMajor?: string;
    careerGoal?: string;
    currentGpa?: number;
    transferTimeline?: string;
    financialSituation?: string;
    isFirstGen?: string;
  };
  courses?: Array<{
    courseCode?: string;
    courseName: string;
    units?: number;
    term?: string;
    status?: string;
  }>;
}

export interface GenerationResult {
  title: string;
  contentMarkdown: string;
}

const SYSTEM_PROMPT = `You are Kaleon, an expert California community college transfer advisor. Your task is to generate a detailed semester-by-semester academic roadmap for a community college transfer student targeting a specific university.

The roadmap must be practical, personalized, and grounded in California transfer requirements. It should show the student exactly what to do each semester to complete their prerequisites, maintain their GPA, and submit a competitive application.

Write in clear, encouraging markdown. Use headings (##, ###), tables, semester blocks, and bullet points.

Structure the roadmap as follows:

## 🎯 Transfer Target
Brief overview of the target university and the student's goal.

## 📊 Your Starting Point
Current GPA, units completed, and key strengths/concerns.

## 🗺️ Semester Plan
For each semester until transfer, provide:
- Semester label (e.g., "Fall 2024", "Spring 2025")
- Course recommendations (specific course names/areas to prioritize)
- GPA target for that semester
- Key action items
- ⚠️ Any semester-specific risks

If the timeline is 2 semesters or fewer, include every remaining semester in detail. If 3+ semesters out, be thorough for the next 2 semesters and give broader guidance for later ones.

## ✅ Prerequisites Checklist
- [ ] items for each required prerequisite, marking those already completed as - [x]
- List IGETC/CSU GE areas needed

## ⚡ Quick Wins
3-5 high-impact actions the student can take immediately.

## 🚧 Potential Roadblocks
Honest assessment of challenges (impaction, competition, GPA gaps, missing courses) and how to address them.

Use a reasonable level of detail — aim for 1500-3000 words. Do not use JSON. Return only markdown.`;

function buildUserPrompt(input: RoadmapGenerationInput): string {
  const { pathway, profile, courses } = input;
  const completed = (courses ?? []).filter((c) => c.status === "completed");
  const inProgress = (courses ?? []).filter((c) => c.status === "in_progress");
  const totalUnits = completed.reduce((s, c) => s + (c.units ?? 0), 0);

  return [
    `Generate a semester-by-semester academic transfer roadmap for:`,
    ``,
    `**Student**: ${profile.fullName ?? "Student"} at ${profile.communityCollege ?? "a California community college"}`,
    `**Intended Major**: ${profile.intendedMajor ?? "Undecided"}`,
    `**Career Goal**: ${profile.careerGoal ?? "Not specified"}`,
    `**Current GPA**: ${profile.currentGpa != null ? profile.currentGpa.toFixed(2) : "Unknown"}`,
    `**Transfer Timeline**: ${profile.transferTimeline ?? "Undecided"}`,
    `**Financial Situation**: ${profile.financialSituation ?? "Not specified"}`,
    `**First-gen**: ${profile.isFirstGen ?? "Not specified"}`,
    ``,
    `**Target University**: ${pathway.university}`,
    `**GPA Target**: ${pathway.gpaTarget}`,
    `**Required Units**: ${pathway.requiredUnits}`,
    `**Completed Units**: ${totalUnits} / ${GRADUATION_UNITS} graduation minimum`,
    `**Pathway Type**: ${pathway.pathwayType} (${pathway.compatibilityScore}% compatibility)`,
    `**Why it Fits**: ${pathway.whyItFits}`,
    `**Concerns**: ${pathway.concerns}`,
    `**Timeline**: ${pathway.transferTimeline}`,
    `**Course Gaps**: ${(pathway.courseGaps ?? []).join(", ") || "None identified"}`,
    ``,
    `Completed courses:`,
    completed.map((c) => `- ${c.courseCode ?? c.courseName}${c.units ? ` (${c.units}u)` : ""}${c.term ? ` — ${c.term}` : ""}`).join("\n") || "(none)",
    ``,
    `In-progress courses:`,
    inProgress.map((c) => `- ${c.courseCode ?? c.courseName}${c.units ? ` (${c.units}u)` : ""}${c.term ? ` — ${c.term}` : ""}`).join("\n") || "(none)",
  ].join("\n");
}

export async function generateRoadmapWithDeepSeek(
  input: RoadmapGenerationInput,
  apiKey: string,
): Promise<GenerationResult> {
  const content = await deepSeekChat({
    apiKey,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(input),
  });

  const title = `Roadmap to ${input.pathway.university}`;
  return { title, contentMarkdown: content };
}
