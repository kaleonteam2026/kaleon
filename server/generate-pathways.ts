import { GRADUATION_UNITS } from "../src/lib/course-progress.ts";
import {
  buildPathwayUserPrompt,
  extractJsonPayload,
  normalizePathways,
  normalizeProgressSummary,
  type PathwayGenerationInput,
  type PathwayGenerationResult,
} from "../src/lib/pathway-generation-contract.ts";
import { deepSeekChat } from "./deepseek-client.ts";
import { normalizePathwayError } from "./pathway-provider.ts";
import { createClient } from "@supabase/supabase-js";

export type {
  GeneratedPathway,
  PathwayGenerationInput,
  PathwayGenerationResult,
  PathwayProgressSummary,
} from "../src/lib/pathway-generation-contract.ts";

// Initialize Supabase client for server-side use
const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
const hasServerSupabase = Boolean(supabaseUrl && supabaseServiceKey);

export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Normalize a school name for comparison purposes
 * Converts to lowercase, removes extra spaces, and handles common variations
 */
function normalizeSchoolName(name: string): string {
  if (!name) return "";

  // Convert to lowercase and trim
  let normalized = name.toLowerCase().trim();

  // Replace multiple spaces with single space
  normalized = normalized.replace(/\s+/g, " ");

  // Handle common abbreviations and variations
  // UC -> University of California
  normalized = normalized.replace(/\buc\b/g, "university of california");
  // Handle "University of California" variations
  normalized = normalized.replace(/university\s+of\s+california/g, "university of california");

  // CSU -> California State University
  normalized = normalized.replace(/\bcsu\b/g, "california state university");
  // Handle "California State University" variations
  normalized = normalized.replace(/california\s+state\s+university/g, "california state university");

  // Remove common words that don't affect identity for comparison
  normalized = normalized.replace(/\b(of|the|and|of|in|for)\b/g, "");

  // Remove punctuation that doesn't affect identity
  normalized = normalized.replace(/[,\.\-]/g, "");

  // Clean up extra spaces again
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Fetch existing pathways for a profile and extract normalized university names
 */
async function getExistingPathwayUniversals(profileId: number): Promise<Set<string>> {
  if (!hasServerSupabase || !supabase) {
    return new Set();
  }

  try {
    const { data, error } = await supabase
      .from("pathways")
      .select("report_json->university")
      .eq("profile_id", profileId);

    if (error) {
      console.error("Error fetching existing pathways:", error);
      // Return empty set to allow generation to proceed without avoidance
      return new Set();
    }

    const universities = new Set<string>();

    for (const row of (data ?? [])) {
      const university = (row as any)?.university;
      if (university && typeof university === 'string') {
        const normalized = normalizeSchoolName(university);
        if (normalized) {
          universities.add(normalized);
        }
      }
    }

    return universities;
  } catch (error) {
    console.error("Error in getExistingPathwayUniversals:", error);
    // Return empty set to allow generation to proceed without avoidance
    return new Set();
  }
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
- CRITICAL: You MUST generate pathways for schools that are DIFFERENT from any previously shown to the student. Do not repeat schools even with slight naming variations (e.g., if "UC Berkeley" was shown before, do not generate "University of California, Berkeley").
- Prioritize school diversity in your recommendations to give students a broad range of options.

Financial & background context:
- If the student's financial situation is "Limited" or "Very limited", prioritize affordable/accessible programs and include tuition information.
- If the student is first-generation, prioritize programs and campusOpportunities that offer first-gen support services (EOP, Bridge programs, TRiO, etc.).
- If financial situation is "Comfortable" or "Very comfortable", focus on merit-based scholarships and competitive programs.
- If the student is not first-gen, still include general scholarship and program recommendations.`;

export async function generatePathwaysWithDeepSeek(
  input: PathwayGenerationInput,
  apiKey: string,
  options?: {
    baseUrl?: string;
    model?: string;
  },
): Promise<PathwayGenerationResult> {
  // Fetch existing pathways to avoid generating duplicates
  const existingUniversities = await getExistingPathwayUniversals(input.profileId);

  // Build the user prompt with information about existing universities
  const userPromptWithAvoidance = [
    buildPathwayUserPrompt(input),
    "",
    "IMPORTANT CONSTRAINT: The student has already seen pathways for the following schools:",
    Array.from(existingUniversities)
      .map(name => `- ${name}`)
      .join("\n"),
    "",
    "Please generate pathways for DIFFERENT schools. Do NOT repeat any of the above schools.",
    "If you would normally suggest a school that matches one of the above (even with slight variations like 'UC Berkeley' vs 'University of California, Berkeley'), please choose a different school instead.",
    ""
  ].join("\n");

  try {
    const content = await deepSeekChat({
      apiKey,
      system: SYSTEM_PROMPT,
      user: userPromptWithAvoidance,
      responseFormat: { type: "json_object" },
      baseUrl: options?.baseUrl,
      model: options?.model,
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
  } catch (error) {
    throw normalizePathwayError(error);
  }
}
