import { GRADUATION_UNITS } from "../src/lib/course-progress.ts";
import { deepSeekChat } from "./deepseek-client.ts";

export interface PathwayGenerationInput {
  profileId: number;
  fullName?: string;
  communityCollege?: string;
  intendedMajor?: string;
  careerGoal?: string;
  currentGpa?: number;
  transferTimeline?: string;
  financialSituation?: string;
  isFirstGen?: string;
  courses?: Array<{
    courseCode?: string;
    courseName?: string;
    units?: number;
    term?: string;
    status?: string;
  }>;
  totalUnits?: number;
}

export interface PathwayProgressSummary {
  completedUnits: number;
  graduationRequirement: number;
  unitsRemaining: number;
  percentComplete: number;
  courseAnalysis: string;
}

export interface GeneratedPathway {
  id: number;
  profileId: number;
  pathwayType: "least_compatible" | "moderately_compatible" | "most_compatible";
  compatibilityScore: number;
  isSelected: "false";
  reportJson: {
    type: string;
    university: string;
    compatibilityScore: number;
    whyItFits: string;
    concerns: string;
    riskAnalysis: string;
    gpaTarget: number;
    requiredUnits: number;
    courseGaps: string[];
    coursesAnalyzed: string[];
    transferTimeline: string;
    scholarshipOptions: string[];
    internshipRecommendations: string[];
    extracurricularRecommendations: string[];
    campusOpportunities: Array<{
      name: string;
      type: string;
      description: string;
      admitProfileNote: string;
    }>;
    risks: string[];
    nextSteps: string[];
  };
}

export interface PathwayGenerationResult {
  pathways: GeneratedPathway[];
  progressSummary: PathwayProgressSummary;
}

const SYSTEM_PROMPT = `You are Kaleon, an expert California community college transfer advisor.

Generate personalized transfer pathways: one stretch school, one match school, and one safety school.

For each school you must:
1. Provide a concise pathway report — why it fits, GPA target, timeline, and next steps.
2. Include a brief risk analysis (competition, major impaction, GPA gap, missing prep, timeline risk).
3. Analyze the student's completed/in-progress courses against that school's major prep — list key course gaps needed and note which completed courses help.

Also analyze all courses holistically and compute graduation progress toward ${GRADUATION_UNITS} semester units for the progress bar.

BE CONCISE. Keep all text fields as short as possible. Avoid paragraphs longer than 2-3 sentences. Cap each array at 3-4 items maximum.

Return JSON only — no markdown outside the JSON object:

{
  "progressSummary": {
    "completedUnits": number,
    "graduationRequirement": ${GRADUATION_UNITS},
    "unitsRemaining": number,
    "percentComplete": number (0-100),
    "courseAnalysis": string (1 sentence on course progress and what's left)
  },
  "pathways": [
    {
      "pathwayType": "least_compatible" | "moderately_compatible" | "most_compatible",
      "compatibilityScore": number (0-100),
      "reportJson": {
        "type": same as pathwayType,
        "university": string (real California UC or CSU),
        "compatibilityScore": number,
        "whyItFits": string (2-3 sentences max),
        "concerns": string (2-3 sentences max),
        "riskAnalysis": string (3-4 sentences max, concise),
        "gpaTarget": number,
        "requiredUnits": number (number of semester units needed to transfer to this school, typically 60–70),
        "courseGaps": string[] (max 4 items),
        "coursesAnalyzed": string[] (max 4 items),
        "transferTimeline": string (1 sentence),
        "scholarshipOptions": string[] (max 4),
        "internshipRecommendations": string[] (max 4),
        "extracurricularRecommendations": string[] (max 3),
        "campusOpportunities": [{ "name", "type", "description", "admitProfileNote" }] (max 3 items, each description 1 sentence),
        "risks": string[] (max 4 bullet points),
        "nextSteps": string[] (max 4 items)
      }
    }
  ]
}

Rules:
- least_compatible = stretch, moderately_compatible = match, most_compatible = safety
- Exactly 3 pathways
- Use real UC/CSU campuses
- progressSummary must reflect the student's course list and unit totals
- unitsRemaining = graduationRequirement - completedUnits (minimum 0)

Financial & background context:
- If the student's financial situation is "Limited" or "Very limited", prioritize affordable/accessible programs and include tuition information.
- If the student is first-generation, prioritize programs and campusOpportunities that offer first-gen support services (EOP, Bridge programs, TRiO, etc.).
- If financial situation is "Comfortable" or "Very comfortab\le", focus on merit-based scholarships and competitive programs.
- If the student is not first-gen, still include general scholarship and program recommendations.`;

function extractJsonPayload(text: string): unknown {
  const trimmed = text.trim();
  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }

  // Try markdown code block extraction
  const block = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block?.[1]) {
    try {
      return JSON.parse(block[1].trim());
    } catch {
      // fall through
    }
  }

  // Try extracting content between outermost { }
  const objStart = trimmed.indexOf("{");
  const objEnd = trimmed.lastIndexOf("}");
  if (objStart >= 0 && objEnd > objStart) {
    try {
      return JSON.parse(trimmed.slice(objStart, objEnd + 1));
    } catch {
      // fall through
    }
  }

  // Try extracting content between outermost [ ]
  const arrStart = trimmed.indexOf("[");
  const arrEnd = trimmed.lastIndexOf("]");
  if (arrStart >= 0 && arrEnd > arrStart) {
    try {
      return JSON.parse(trimmed.slice(arrStart, arrEnd + 1));
    } catch {
      // fall through
    }
  }

  throw new Error(
    "Could not parse pathway JSON from model response. " +
      `First 200 chars: ${trimmed.slice(0, 200)}`,
  );
}

function normalizeProgressSummary(
  raw: unknown,
  input: PathwayGenerationInput,
): PathwayProgressSummary {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const completed = Number(row.completedUnits ?? input.totalUnits ?? 0);
  const requirement = Number(row.graduationRequirement ?? GRADUATION_UNITS);
  const remaining = Math.max(0, Number(row.unitsRemaining ?? requirement - completed));
  const percent = Math.min(
    100,
    Number(row.percentComplete ?? (completed / requirement) * 100),
  );
  return {
    completedUnits: completed,
    graduationRequirement: requirement,
    unitsRemaining: remaining,
    percentComplete: percent,
    courseAnalysis: String(row.courseAnalysis ?? ""),
  };
}

function normalizePathways(raw: unknown, profileId: number): GeneratedPathway[] {
  const list = Array.isArray(raw) ? raw : [];
  if (list.length === 0) {
    throw new Error("Expected a non-empty pathways array");
  }

  const baseId = Date.now();
  return list.slice(0, 3).map((item, index) => {
    const row = item as Record<string, unknown>;
    const report = (row.reportJson ?? row) as Record<string, unknown>;
    const pathwayType = String(row.pathwayType ?? report.type ?? "moderately_compatible");
    const compatibilityScore = Number(row.compatibilityScore ?? report.compatibilityScore ?? 70);
    const risks = Array.isArray(report.risks) ? report.risks.map(String) : [];

    return {
      id: baseId + index,
      profileId,
      pathwayType: pathwayType as GeneratedPathway["pathwayType"],
      compatibilityScore,
      isSelected: "false" as const,
      reportJson: {
        type: pathwayType,
        university: String(report.university ?? "UC Campus"),
        compatibilityScore,
        whyItFits: String(report.whyItFits ?? ""),
        concerns: String(report.concerns ?? ""),
        riskAnalysis: String(report.riskAnalysis ?? risks.join(" ")),
        gpaTarget: Number(report.gpaTarget ?? 3.0),
        requiredUnits: Number(report.requiredUnits ?? 60),
        courseGaps: Array.isArray(report.courseGaps) ? report.courseGaps.map(String) : [],
        coursesAnalyzed: Array.isArray(report.coursesAnalyzed) ? report.coursesAnalyzed.map(String) : [],
        transferTimeline: String(report.transferTimeline ?? ""),
        scholarshipOptions: Array.isArray(report.scholarshipOptions) ? report.scholarshipOptions.map(String) : [],
        internshipRecommendations: Array.isArray(report.internshipRecommendations) ? report.internshipRecommendations.map(String) : [],
        extracurricularRecommendations: Array.isArray(report.extracurricularRecommendations) ? report.extracurricularRecommendations.map(String) : [],
        campusOpportunities: Array.isArray(report.campusOpportunities)
          ? report.campusOpportunities.map((o) => {
              const opp = o as Record<string, unknown>;
              return {
                name: String(opp.name ?? ""),
                type: String(opp.type ?? "program"),
                description: String(opp.description ?? ""),
                admitProfileNote: String(opp.admitProfileNote ?? ""),
              };
            })
          : [],
        risks,
        nextSteps: Array.isArray(report.nextSteps) ? report.nextSteps.map(String) : [],
      },
    };
  });
}

function buildUserPrompt(input: PathwayGenerationInput): string {
  const completed = (input.courses ?? []).filter((c) => c.status === "completed");
  const inProgress = (input.courses ?? []).filter((c) => c.status === "in_progress");
  const formatCourse = (c: NonNullable<PathwayGenerationInput["courses"]>[number]) =>
    `${c.courseCode ?? c.courseName}${c.units ? ` (${c.units}u)` : ""}${c.term ? ` — ${c.term}` : ""}`;

  return [
    "Student profile:",
    `- College: ${input.communityCollege ?? "Unknown"}`,
    `- Major: ${input.intendedMajor ?? "Undecided"}`,
    `- Career: ${input.careerGoal ?? "Not specified"}`,
    `- GPA: ${input.currentGpa ?? "Unknown"}`,
    `- Timeline: ${input.transferTimeline ?? "Undecided"}`,
    `- Finances: ${input.financialSituation ?? "Not specified"}`,
    `- First-gen: ${input.isFirstGen ?? "Not specified"}`,
    `- Units completed: ${input.totalUnits ?? "Unknown"} / ${GRADUATION_UNITS}`,
    "",
    "Completed courses:",
    completed.map(formatCourse).join("\n") || "(none)",
    "",
    "In-progress courses:",
    inProgress.map(formatCourse).join("\n") || "(none)",
  ].join("\n");
}

export async function generatePathwaysWithDeepSeek(
  input: PathwayGenerationInput,
  apiKey: string,
): Promise<PathwayGenerationResult> {
  const content = await deepSeekChat({
    apiKey,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(input),
  });

  const parsed = extractJsonPayload(content);

  if (Array.isArray(parsed)) {
    return {
      pathways: normalizePathways(parsed, input.profileId),
      progressSummary: normalizeProgressSummary({}, input),
    };
  }

  const payload = parsed as Record<string, unknown>;
  return {
    pathways: normalizePathways(payload.pathways, input.profileId),
    progressSummary: normalizeProgressSummary(payload.progressSummary, input),
  };
}
