import { deepSeekChat } from "./deepseek-client.ts";

export interface GuidebookGenerationInput {
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

const SYSTEM_PROMPT = `You are Kaleon, an expert California community college transfer advisor. Your task is to generate a comprehensive admissions guidebook for a specific university.

The guidebook must be practical, accurate, and tailored to the student's profile. It should help them understand exactly what they need to do to get admitted to this university as a transfer student from a California community college.

Write in clear, encouraging but realistic markdown. Use headings (##, ###), bullet lists, checkboxes (- [ ] for tasks), and tables where appropriate.

Structure the guidebook with these sections:

## 📋 Admission Requirements
- Minimum GPA requirement and target GPA
- Major-specific requirements (course prep, impaction status)
- IGETC/CSU GE completion status
- Unit minimums

## 🗓️ Key Deadlines
- Application filing period (UC is Oct 1–Nov 30, CSU is Oct 1–Nov 30 typically)
- Financial aid deadlines
- Scholarship deadlines
- Document submission dates

## ✍️ Application Components
- Personal Insight Questions / essays
- Letters of recommendation (if needed)
- Transcript submission process
- Supplemental applications (if any)

## 💰 Financial Aid & Scholarships
- University-specific scholarships
- State aid (Cal Grant, etc.)
- Work-study opportunities
- Estimated cost of attendance

## 📝 Checklist
Include a checklist with - [ ] items for everything the student needs to do. Use a reasonable number of items (10-20).

Keep the guidebook concise but thorough. Aim for the entire guidebook to be around 2000-4000 words. Do not use JSON. Return only markdown.`;

function buildUserPrompt(input: GuidebookGenerationInput): string {
  const { pathway, profile, courses } = input;
  const completed = (courses ?? []).filter((c) => c.status === "completed");
  const inProgress = (courses ?? []).filter((c) => c.status === "in_progress");

  return [
    `Generate a transfer admissions guidebook for:`,
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
    `**Pathway Type**: ${pathway.pathwayType} (${pathway.compatibilityScore}% compatibility)`,
    `**GPA Target**: ${pathway.gpaTarget}`,
    `**Transfer Requirements**: ${pathway.requiredUnits} semester units`,
    `**Why it Fits**: ${pathway.whyItFits}`,
    `**Concerns**: ${pathway.concerns}`,
    `**Timeline**: ${pathway.transferTimeline}`,
    `**Course Gaps**: ${(pathway.courseGaps ?? []).join(", ") || "None identified"}`,
    ``,
    `Completed courses:`,
    completed.map((c) => `- ${c.courseCode ?? c.courseName}${c.units ? ` (${c.units}u)` : ""}`).join("\n") || "(none)",
    ``,
    `In-progress courses:`,
    inProgress.map((c) => `- ${c.courseCode ?? c.courseName}${c.units ? ` (${c.units}u)` : ""}`).join("\n") || "(none)",
  ].join("\n");
}

export async function generateGuidebookWithDeepSeek(
  input: GuidebookGenerationInput,
  apiKey: string,
): Promise<GenerationResult> {
  const content = await deepSeekChat({
    apiKey,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(input),
  });

  const title = `Guidebook: ${input.pathway.university}`;

  return { title, contentMarkdown: content };
}
