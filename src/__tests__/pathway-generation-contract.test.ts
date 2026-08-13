import { describe, expect, it } from "vitest";
import {
  buildPathwayUserPrompt,
  extractJsonPayload,
  normalizePathways,
  normalizeProgressSummary,
  type GeneratedPathway,
} from "@/lib/pathway-generation-contract";
import {
  PathwayGenerationError,
  assertDeepSeekConfigured,
  getDeepSeekRuntimeConfig,
  normalizePathwayError,
} from "../../server/pathway-provider";

function makePathway(
  pathwayType: GeneratedPathway["pathwayType"],
  university: string,
): Record<string, unknown> {
  return {
    pathwayType,
    compatibilityScore: 78,
    reportJson: {
      type: pathwayType,
      university,
      compatibilityScore: 78,
      whyItFits: `${university} fits the student's coursework.`,
      concerns: "A few major-prep classes are still open.",
      riskAnalysis: "Impacted major and GPA competition remain the main risks.",
      gpaTarget: 3.2,
      requiredUnits: 60,
      courseGaps: ["MATH 120 Calculus I"],
      coursesAnalyzed: ["CS 221", "ENGL 110"],
      transferTimeline: "Target Fall 2027 transfer.",
      scholarshipOptions: ["Transfer grant"],
      internshipRecommendations: ["Campus research"],
      extracurricularRecommendations: ["Engineering club"],
      campusOpportunities: [
        {
          name: "EOP",
          type: "program",
          description: "First-gen support and advising.",
          admitProfileNote: "Helpful if the student wants transition support.",
        },
      ],
      risks: ["Impacted major review"],
      nextSteps: ["Meet with a counselor about math planning."],
    },
  };
}

describe("pathway generation contract", () => {
  it("accepts exactly one stretch, match, and safety pathway", () => {
    const normalized = normalizePathways([
      makePathway("least_compatible", "UC Berkeley"),
      makePathway("moderately_compatible", "UC Davis"),
      makePathway("most_compatible", "San Jose State University"),
    ], 1);

    expect(normalized).toHaveLength(3);
    expect(normalized.map((item) => item.pathwayType).sort()).toEqual([
      "least_compatible",
      "moderately_compatible",
      "most_compatible",
    ]);
    expect(normalized[0].reportJson.university).toBeTruthy();
    expect(normalized[0].reportJson.courseGaps).toEqual(["MATH 120 Calculus I"]);
  });

  it("rejects wrong pathway counts, duplicate categories, and missing required fields", () => {
    expect(() => normalizePathways([
      makePathway("least_compatible", "UC Berkeley"),
      makePathway("moderately_compatible", "UC Davis"),
    ], 1)).toThrow(/exactly 3 pathways/i);

    expect(() => normalizePathways([
      makePathway("least_compatible", "UC Berkeley"),
      makePathway("least_compatible", "UC Davis"),
      makePathway("most_compatible", "San Jose State University"),
    ], 1)).toThrow(/each pathway type once/i);

    const missingUniversity = makePathway("least_compatible", "UC Berkeley");
    (missingUniversity.reportJson as Record<string, unknown>).university = "";
    expect(() => normalizePathways([
      missingUniversity,
      makePathway("moderately_compatible", "UC Davis"),
      makePathway("most_compatible", "San Jose State University"),
    ], 1)).toThrow(/reportJson\.university/i);

    const missingGaps = makePathway("least_compatible", "UC Berkeley");
    delete (missingGaps.reportJson as Record<string, unknown>).courseGaps;
    expect(() => normalizePathways([
      missingGaps,
      makePathway("moderately_compatible", "UC Davis"),
      makePathway("most_compatible", "San Jose State University"),
    ], 1)).toThrow(/reportJson\.courseGaps/i);

    const invalidCompatibility = makePathway("least_compatible", "UC Berkeley");
    (invalidCompatibility as Record<string, unknown>).pathwayType = "invalid_type";
    expect(() => normalizePathways([
      invalidCompatibility,
      makePathway("moderately_compatible", "UC Davis"),
      makePathway("most_compatible", "San Jose State University"),
    ], 1)).toThrow(/pathwayType/i);

    const nullOpportunityField = makePathway("least_compatible", "UC Berkeley");
    (nullOpportunityField.reportJson as Record<string, unknown>).campusOpportunities = [
      {
        name: "EOP",
        type: "program",
        description: null,
        admitProfileNote: "Helpful support.",
      },
    ];
    expect(() => normalizePathways([
      nullOpportunityField,
      makePathway("moderately_compatible", "UC Davis"),
      makePathway("most_compatible", "San Jose State University"),
    ], 1)).toThrow(/campusOpportunities\[0\]\.description/i);
  });

  it("parses JSON payloads from raw or fenced model responses", () => {
    expect(extractJsonPayload('{"pathways": []}')).toEqual({ pathways: [] });
    expect(extractJsonPayload("```json\n{\"pathways\":[]}\n```")).toEqual({ pathways: [] });
    expect(() => extractJsonPayload("not json at all")).toThrow(/could not parse pathway json/i);
  });

  it("builds prompts from actual student values instead of demo constants", () => {
    const prompt = buildPathwayUserPrompt({
      profileId: 1,
      communityCollege: "American River College",
      intendedMajor: "Biotechnology",
      careerGoal: "Transfer",
      currentGpa: 2.75,
      transferTimeline: "Fall 2027",
      financialSituation: "Middle-income (no Pell)",
      isFirstGen: "Yes",
      totalUnits: 51,
      courses: [
        { courseCode: "CS 221", courseName: "Computer Org & Assem. Lang", units: 3, term: "Fall 2024", status: "completed" },
        { courseCode: "MATH 120", courseName: "Calculus I", units: 4, term: "Spring 2024", status: "in_progress" },
      ],
    });

    expect(prompt).toContain("American River College");
    expect(prompt).toContain("Biotechnology");
    expect(prompt).toContain("Transfer");
    expect(prompt).toContain("2.75");
    expect(prompt).toContain("51 / 60");
    expect(prompt).toContain("CS 221 (3u) — Fall 2024");
    expect(prompt).toContain("MATH 120 (4u) — Spring 2024");
    expect(prompt).not.toContain("3.7");
  });

  it("classifies provider config and failures safely", () => {
    const missing = getDeepSeekRuntimeConfig({});
    expect(missing.credentialStatus).toBe("missing");
    expect(() => assertDeepSeekConfigured(missing)).toThrow(PathwayGenerationError);

    const placeholder = getDeepSeekRuntimeConfig({ DEEPSEEK_API_KEY: "your_deepseek_api_key" });
    expect(placeholder.credentialStatus).toBe("placeholder");
    expect(() => assertDeepSeekConfigured(placeholder)).toThrow(/real provider key/i);

    const authFailure = normalizePathwayError(new Error("401 Authentication Fails, Your api key is invalid"));
    expect(authFailure.code).toBe("provider_auth_failed");

    const networkFailure = normalizePathwayError(new Error("socket hang up while contacting provider"));
    expect(networkFailure.code).toBe("provider_network_failed");

    const timeoutFailure = normalizePathwayError(new Error("Request timed out after 180000ms"));
    expect(timeoutFailure.code).toBe("provider_network_failed");

    const malformed = normalizePathwayError(new Error("Could not parse pathway JSON from model response."));
    expect(malformed.code).toBe("provider_malformed_response");

    const emptyResponse = normalizePathwayError(new Error("DeepSeek returned an empty response"));
    expect(emptyResponse.code).toBe("provider_malformed_response");

    const genericFailure = normalizePathwayError(new Error("Generation failed"));
    expect(genericFailure.code).toBe("generation_failed");
  });

  it("keeps progress summary grounded in the provided student totals", () => {
    const summary = normalizeProgressSummary({}, {
      profileId: 1,
      totalUnits: 51,
    });

    expect(summary.completedUnits).toBe(51);
    expect(summary.graduationRequirement).toBe(60);
    expect(summary.unitsRemaining).toBe(9);
  });
});
