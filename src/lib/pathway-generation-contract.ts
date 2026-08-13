import { GRADUATION_UNITS } from "./course-progress.ts";

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

export function extractJsonPayload(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }

  const block = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block?.[1]) {
    try {
      return JSON.parse(block[1].trim());
    } catch {
      // fall through
    }
  }

  const objStart = trimmed.indexOf("{");
  const objEnd = trimmed.lastIndexOf("}");
  if (objStart >= 0 && objEnd > objStart) {
    try {
      return JSON.parse(trimmed.slice(objStart, objEnd + 1));
    } catch {
      // fall through
    }
  }

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

export function normalizeProgressSummary(
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

export function normalizePathways(raw: unknown, profileId: number): GeneratedPathway[] {
  const list = Array.isArray(raw) ? raw : [];
  if (list.length !== 3) {
    throw new Error("Expected exactly 3 pathways from provider");
  }

  const baseId = Date.now();
  const pathways = list.slice(0, 3).map((item, index) => {
    const row = asRecord(item, `pathways[${index}]`);
    const report = asRecord(row.reportJson ?? row, `pathways[${index}].reportJson`);
    const pathwayType = asPathwayType(row.pathwayType ?? report.type, `pathways[${index}].pathwayType`);
    const compatibilityScore = asFiniteNumber(
      row.compatibilityScore ?? report.compatibilityScore,
      `pathways[${index}].compatibilityScore`,
    );

    return {
      id: baseId + index,
      profileId,
      pathwayType,
      compatibilityScore,
      isSelected: "false" as const,
      reportJson: {
        type: pathwayType,
        university: asNonEmptyString(report.university, `pathways[${index}].reportJson.university`),
        compatibilityScore,
        whyItFits: asNonEmptyString(report.whyItFits, `pathways[${index}].reportJson.whyItFits`),
        concerns: asNonEmptyString(report.concerns, `pathways[${index}].reportJson.concerns`),
        riskAnalysis: asNonEmptyString(report.riskAnalysis, `pathways[${index}].reportJson.riskAnalysis`),
        gpaTarget: asFiniteNumber(report.gpaTarget, `pathways[${index}].reportJson.gpaTarget`),
        requiredUnits: asFiniteNumber(report.requiredUnits, `pathways[${index}].reportJson.requiredUnits`),
        courseGaps: asStringArray(report.courseGaps, `pathways[${index}].reportJson.courseGaps`),
        coursesAnalyzed: asStringArray(report.coursesAnalyzed, `pathways[${index}].reportJson.coursesAnalyzed`),
        transferTimeline: asNonEmptyString(report.transferTimeline, `pathways[${index}].reportJson.transferTimeline`),
        scholarshipOptions: asStringArray(report.scholarshipOptions, `pathways[${index}].reportJson.scholarshipOptions`),
        internshipRecommendations: asStringArray(report.internshipRecommendations, `pathways[${index}].reportJson.internshipRecommendations`),
        extracurricularRecommendations: asStringArray(report.extracurricularRecommendations, `pathways[${index}].reportJson.extracurricularRecommendations`),
        campusOpportunities: asCampusOpportunities(report.campusOpportunities, `pathways[${index}].reportJson.campusOpportunities`),
        risks: asStringArray(report.risks, `pathways[${index}].reportJson.risks`),
        nextSteps: asStringArray(report.nextSteps, `pathways[${index}].reportJson.nextSteps`),
      },
    };
  });

  const pathwayTypes = new Set(pathways.map((item) => item.pathwayType));
  if (
    !pathwayTypes.has("least_compatible") ||
    !pathwayTypes.has("moderately_compatible") ||
    !pathwayTypes.has("most_compatible") ||
    pathwayTypes.size !== 3
  ) {
    throw new Error("Expected each pathway type once: stretch, match, and safety");
  }

  return pathways;
}

export function buildPathwayUserPrompt(input: PathwayGenerationInput): string {
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

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Missing or invalid ${field}`);
  }
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required ${field}`);
  }
  return value.trim();
}

function asFiniteNumber(value: unknown, field: string): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new Error(`Missing required ${field}`);
  }
  return numberValue;
}

function asStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Missing required ${field}`);
  }
  return value.map((item, index) => asNonEmptyString(item, `${field}[${index}]`));
}

function asCampusOpportunities(value: unknown, field: string): GeneratedPathway["reportJson"]["campusOpportunities"] {
  if (!Array.isArray(value)) {
    throw new Error(`Missing required ${field}`);
  }

  return value.map((item, index) => {
    const row = asRecord(item, `${field}[${index}]`);
    return {
      name: asNonEmptyString(row.name, `${field}[${index}].name`),
      type: asNonEmptyString(row.type, `${field}[${index}].type`),
      description: asNonEmptyString(row.description, `${field}[${index}].description`),
      admitProfileNote: asNonEmptyString(row.admitProfileNote, `${field}[${index}].admitProfileNote`),
    };
  });
}

function asPathwayType(value: unknown, field: string): GeneratedPathway["pathwayType"] {
  if (
    value === "least_compatible" ||
    value === "moderately_compatible" ||
    value === "most_compatible"
  ) {
    return value;
  }
  throw new Error(`Missing required ${field}`);
}
