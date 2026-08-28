import { deepSeekChat } from "./deepseek-client.ts";

export interface TransferabilityAnalysisInput {
  communityCollege: string;
  intendedMajor?: string;
  courses: Array<{
    courseCode?: string;
    courseName: string;
    units?: number;
    term?: string;
    status?: string;
  }>;
}

export interface IgetcSummaryOutput {
  area1AEnglish: boolean;
  area1BCriticalThinking: boolean;
  area2Math: boolean;
  area3Arts: boolean;
  area4Social: boolean;
  area5Science: boolean;
  area6Language: boolean;
  completedAreas: string[];
  missingAreas: string[];
}

export interface CourseTransferOutput {
  courseCode?: string;
  courseName: string;
  units?: number;
  status: "transferable" | "likely" | "uncertain" | "unlikely";
  igetcArea?: string;
  csuGEArea?: string;
  assistNote: string;
}

export interface UniversityMatchOutput {
  university: string;
  system: string;
  matchScore: number;
  matchReason: string;
  transferableCount: number;
  totalCourses: number;
}

export interface CalgetcSummaryOutput {
  areaA1Oral: boolean;
  areaA2Written: boolean;
  areaA3Critical: boolean;
  areaB1Physical: boolean;
  areaB2Life: boolean;
  areaB3Lab: boolean;
  areaB4Math: boolean;
  areaC1Arts: boolean;
  areaC2Humanities: boolean;
  areaDSocial: boolean;
  areaELifelong: boolean;
  areaFEthnic: boolean;
  completedAreas: string[];
  missingAreas: string[];
}

export interface TransferabilityResultOutput {
  communityCollege: string;
  summary: string;
  bestMatches: UniversityMatchOutput[];
  courseAnalysis: CourseTransferOutput[];
  igetcSummary: IgetcSummaryOutput;
  calgetcSummary?: CalgetcSummaryOutput;
  totalTransferableUnits: number;
  recommendations: string[];
}

const SYSTEM_PROMPT = `You are an expert California community college transfer advisor with comprehensive knowledge of ASSIST.org articulation agreements, IGETC requirements, CSU GE patterns, and transfer pathways between all California community colleges and UC/CSU/private universities.

Your task is to analyze a student's completed courses and produce a detailed transferability analysis.

## Rules

1. Return ONLY valid JSON — no markdown, no code fences, no explanation.
2. For each course, determine its transferability status using known California articulation patterns:
   - "transferable" — clearly matches a lower-division requirement at most UC/CSU schools
   - "likely" — likely transfers but may vary by institution
   - "uncertain" — uncommon course, needs manual verification on ASSIST.org
   - "unlikely" — remedial, vocational, or non-transferable course type
3. For IGETC areas, use standard California community college patterns:
   - Area 1A (English Composition): ENGL 101, ENGL 1A, etc.
   - Area 1B (Critical Thinking): PHIL 105, ENGL 103, etc.
   - Area 2 (Math): MATH courses above Intermediate Algebra
   - Area 3 (Arts/Humanities): ART, MUS, PHIL, THEA, literature courses
   - Area 4 (Social Science): HIST, PSYC, SOC, ECON, ANTH, POLS, etc.
   - Area 5 (Physical/Biological Science): ASTR, BIOL, CHEM, GEOG, PHYS, etc. with lab
   - Area 6 (Language): 2+ semesters of same language (or proficiency)
4. For CalGETC (CSU GE Breadth) areas, use standard CSU patterns:
   - Area A1 (Oral Communication): COMM 101, SPCH 100, etc.
   - Area A2 (Written Communication): ENGL 101, ENGL 1A, etc.
   - Area A3 (Critical Thinking): PHIL 105, ENGL 103, etc.
   - Area B1 (Physical Science): CHEM, PHYS, ASTR, GEOG physical, etc.
   - Area B2 (Life Science): BIOL, ANTH biological, etc.
   - Area B3 (Lab Activity): A lab component of any B1 or B2 course
   - Area B4 (Math): MATH courses above Intermediate Algebra
   - Area C1 (Arts): ART, MUS, THTR, DANCE, etc.
   - Area C2 (Humanities): literature, PHIL, foreign language, etc.
   - Area D (Social Sciences): HIST, PSYC, SOC, ECON, ANTH, POLS, GEOG cultural, etc.
   - Area E (Lifelong Learning): personal development, health, kinesiology, etc.
   - Area F (Ethnic Studies): ETHN, ethnic studies courses
5. A single course can satisfy both an IGETC area AND a CSU GE area. Assign both where applicable.
6. Match the student's course profile against known California universities (UC Berkeley, UCLA, UC Irvine, UC Davis, UC San Diego, UC Santa Barbara, UC Santa Cruz, UC Riverside, UC Merced, CSU schools like San Jose State, Cal Poly SLO, etc., and private CA schools like USC, Stanford, Santa Clara).
5. Provide specific ASSIST.org-style notes for each course (e.g., "Articulated as ENGL 101 at UC campus — satisfies Area 1A").
6. Include actionable recommendations for missing courses or IGETC areas.
7. Keep summaries concise (1-2 sentences).`;

function buildUserPrompt(input: TransferabilityAnalysisInput): string {
  const { communityCollege, intendedMajor, courses } = input;

  const completed = courses.filter((c) => c.status === "completed" || !c.status);
  const inProgress = courses.filter((c) => c.status === "in_progress");

  return [
    "Analyze these courses for transferability. Address the student directly using \"you\" and \"your\" throughout the summary (e.g. \"You have completed...\" not \"The student has completed...\").",
    "",
    `**Community College**: ${communityCollege || "Not specified"}`,
    `**Intended Major**: ${intendedMajor || "Undecided"}`,
    "",
    completed.length > 0
      ? "**Completed courses:**\n" +
        completed
          .map((c) => {
            const code = c.courseCode || c.courseName;
            return `- ${code}${c.units ? ` (${c.units} units)` : ""}${c.term ? ` -- ${c.term}` : ""}`;
          })
          .join("\n")
      : "**Completed courses:** (none)",
    "",
    inProgress.length > 0
      ? "**In-progress courses:**\n" +
        inProgress
          .map((c) => {
            const code = c.courseCode || c.courseName;
            return `- ${code}${c.units ? ` (${c.units} units)` : ""}${c.term ? ` -- ${c.term}` : ""}`;
          })
          .join("\n")
      : "",
    "",
    `Return a JSON object with this exact schema (using the field names below — do NOT rename them):`,
    JSON.stringify(
      {
        communityCollege: "string — the student's community college",
        summary: "string — 1-2 sentence overall assessment",
        bestMatches: [
          {
            university: "string — university name",
            system: '"UC" | "CSU" | "Private"',
            matchScore: "number 0-100 — how well the course profile matches this university",
            matchReason: "string — why this university is a good fit",
            transferableCount: "number — count of courses that would transfer",
            totalCourses: "number — total courses analyzed",
          },
        ],
        courseAnalysis: [
          {
            courseCode: "string — e.g. MATH 101",
            courseName: "string",
            units: "number",
            status: '"transferable" | "likely" | "uncertain" | "unlikely"',
            igetcArea: "string or null — e.g. Area 1A, Area 2, etc.",
            csuGEArea: "string or null — e.g. A2, B4, etc.",
            assistNote: "string — specific articulation/ASSIST.org note",
          },
        ],
        igetcSummary: {
          area1AEnglish: "boolean",
          area1BCriticalThinking: "boolean",
          area2Math: "boolean",
          area3Arts: "boolean",
          area4Social: "boolean",
          area5Science: "boolean",
          area6Language: "boolean",
          completedAreas: "string[] — list of completed IGETC area labels",
          missingAreas: "string[] — list of missing IGETC area labels",
        },
        calgetcSummary: {
          areaA1Oral: "boolean",
          areaA2Written: "boolean",
          areaA3Critical: "boolean",
          areaB1Physical: "boolean",
          areaB2Life: "boolean",
          areaB3Lab: "boolean",
          areaB4Math: "boolean",
          areaC1Arts: "boolean",
          areaC2Humanities: "boolean",
          areaDSocial: "boolean",
          areaELifelong: "boolean",
          areaFEthnic: "boolean",
          completedAreas: "string[] — list of completed CSU GE area labels",
          missingAreas: "string[] — list of missing CSU GE area labels",
        },
        totalTransferableUnits: "number — sum of units for transferable + likely courses",
        recommendations: "string[] — max 5 actionable next-step recommendations",
      },
      null,
      2,
    ),
  ].join("\n");
}

function extractJsonPayload(text: string): unknown {
  const trimmed = text.trim();
  const debugPrefix = "[transferability-json]";

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
    // Try to extract a balanced JSON object by counting braces
    let braceDepth = 0;
    let actualEnd = -1;
    for (let i = objStart; i < trimmed.length; i++) {
      if (trimmed[i] === "{") braceDepth++;
      else if (trimmed[i] === "}") braceDepth--;
      if (braceDepth === 0) { actualEnd = i; break; }
    }
    if (actualEnd > objStart) {
      const candidate = trimmed.slice(objStart, actualEnd + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        // fall through to extended candidate
      }
    }
    // Fall back to full slice between first and last brace
    try {
      return JSON.parse(trimmed.slice(objStart, objEnd + 1));
    } catch {
      // fall through
    }
  }

  // Aggressive regex: match any top-level JSON object
  const objMatch = trimmed.match(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}/s);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch {
      // fall through
    }
  }

  // Last resort: try to repair common JSON issues (trailing commas, single quotes)
  const repaired = trimmed
    .replace(/,\s*}/g, "}")                       // remove trailing commas before }
    .replace(/,\s*]/g, "]")                       // remove trailing commas before ]
    .replace(/([{,])\s*'([^']+)'\s*:/g, '$1"$2":') // single-quoted keys → double-quoted
    .replace(/:\s*'([^']*)'/g, ':"$1"')            // single-quoted values → double-quoted
    .replace(/\/\/.*$/gm, "")                      // remove line comments
    .trim();
  try {
    return JSON.parse(repaired);
  } catch {
    // fall through
  }

  // Log the actual raw response for debugging before throwing
  console.error(debugPrefix, "Failed to parse DeepSeek response. First 500 chars:", trimmed.slice(0, 500));
  console.error(debugPrefix, "Response length:", trimmed.length);
  throw new Error("Could not extract valid JSON from DeepSeek response");
}

function normalizeResult(raw: unknown): TransferabilityResultOutput {
  const obj = raw as Record<string, unknown>;

  const coursesRaw = obj.courseAnalysis ?? obj.courseResults ?? [];
  const courseAnalysis: CourseTransferOutput[] = (Array.isArray(coursesRaw) ? coursesRaw : []).map(
    (c: Record<string, unknown>) => {
      const parsedUnits = Number(c.units);
      return {
        courseCode: String(c.courseCode ?? c.code ?? "") || undefined,
        courseName: String(c.courseName ?? c.name ?? ""),
        units: Number.isFinite(parsedUnits) && parsedUnits > 0 ? parsedUnits : undefined,
        status: (
          ["transferable", "likely", "uncertain", "unlikely"].includes(
            String(c.status),
          )
            ? String(c.status)
            : "uncertain"
        ) as CourseTransferOutput["status"],
        igetcArea: c.igetcArea ? String(c.igetcArea) : undefined,
        csuGEArea: c.csuGEArea ? String(c.csuGEArea) : undefined,
        assistNote: String(c.assistNote ?? ""),
      };
    },
  );

  const matchesRaw = obj.bestMatches ?? obj.universityMatches ?? [];
  const bestMatches: UniversityMatchOutput[] = (
    Array.isArray(matchesRaw) ? matchesRaw : []
  ).map((m: Record<string, unknown>) => ({
    university: String(m.university ?? ""),
    system: String(m.system ?? "UC"),
    matchScore: Math.min(100, Math.max(0, Number(m.matchScore) || 0)),
    matchReason: String(m.matchReason ?? ""),
    transferableCount: Number(m.transferableCount) || 0,
    totalCourses: Number(m.totalCourses) || courseAnalysis.length,
  }));

  const igetcRaw = (obj.igetcSummary ?? {}) as Record<string, unknown>;
  const calgetcRaw = (obj.calgetcSummary ?? {}) as Record<string, unknown>;

  const computedTransferableUnits = courseAnalysis.reduce((sum, course) => (
    course.status === "transferable" || course.status === "likely"
      ? sum + (course.units ?? 0)
      : sum
  ), 0);
  const totalTransferableUnitsRaw = Number(obj.totalTransferableUnits);

  return {
    communityCollege: String(obj.communityCollege ?? ""),
    summary: String(obj.summary ?? "Courses analyzed for transferability."),
    bestMatches,
    courseAnalysis,
    igetcSummary: {
      area1AEnglish: Boolean(igetcRaw.area1AEnglish),
      area1BCriticalThinking: Boolean(igetcRaw.area1BCriticalThinking),
      area2Math: Boolean(igetcRaw.area2Math),
      area3Arts: Boolean(igetcRaw.area3Arts),
      area4Social: Boolean(igetcRaw.area4Social),
      area5Science: Boolean(igetcRaw.area5Science),
      area6Language: Boolean(igetcRaw.area6Language),
      completedAreas: Array.isArray(igetcRaw.completedAreas)
        ? (igetcRaw.completedAreas as string[])
        : [],
      missingAreas: Array.isArray(igetcRaw.missingAreas)
        ? (igetcRaw.missingAreas as string[])
        : [],
    },
    calgetcSummary: {
      areaA1Oral: Boolean(calgetcRaw.areaA1Oral),
      areaA2Written: Boolean(calgetcRaw.areaA2Written),
      areaA3Critical: Boolean(calgetcRaw.areaA3Critical),
      areaB1Physical: Boolean(calgetcRaw.areaB1Physical),
      areaB2Life: Boolean(calgetcRaw.areaB2Life),
      areaB3Lab: Boolean(calgetcRaw.areaB3Lab),
      areaB4Math: Boolean(calgetcRaw.areaB4Math),
      areaC1Arts: Boolean(calgetcRaw.areaC1Arts),
      areaC2Humanities: Boolean(calgetcRaw.areaC2Humanities),
      areaDSocial: Boolean(calgetcRaw.areaDSocial),
      areaELifelong: Boolean(calgetcRaw.areaELifelong),
      areaFEthnic: Boolean(calgetcRaw.areaFEthnic),
      completedAreas: Array.isArray(calgetcRaw.completedAreas)
        ? (calgetcRaw.completedAreas as string[])
        : [],
      missingAreas: Array.isArray(calgetcRaw.missingAreas)
        ? (calgetcRaw.missingAreas as string[])
        : [],
    },
    totalTransferableUnits: Number.isFinite(totalTransferableUnitsRaw) && totalTransferableUnitsRaw >= 0
      ? totalTransferableUnitsRaw
      : computedTransferableUnits,
    recommendations: Array.isArray(obj.recommendations)
      ? (obj.recommendations as string[])
      : [],
  };
}

/**
 * Post-process the analysis result to replace remaining third-person references
 * with second-person address, as a safety net when the model ignores the prompt.
 */
function rewriteToSecondPerson(text: string): string {
  return text
    .replace(/\bThe student has\b/g, "You have")
    .replace(/\bthe student has\b/g, "you have")
    .replace(/\bStudent has\b/g, "You have")
    .replace(/\bThe student's\b/g, "Your")
    .replace(/\bthe student's\b/g, "your")
    .replace(/\bThis student\b/g, "You")
    .replace(/\bthis student\b/g, "you");
}

export async function generateTransferabilityAnalysis(
  input: TransferabilityAnalysisInput,
  apiKey: string,
): Promise<TransferabilityResultOutput> {
  const content = await deepSeekChat({
    apiKey,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(input),
  });

  const parsed = extractJsonPayload(content);
  const result = normalizeResult(parsed);

  // The server already knows the real community college — don't trust the AI's echo of it
  result.communityCollege = input.communityCollege || result.communityCollege;

  // Post-process the summary to ensure second-person framing
  result.summary = rewriteToSecondPerson(result.summary);
  result.recommendations = result.recommendations.map(rewriteToSecondPerson);

  return result;
}
