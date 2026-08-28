import { describe, expect, it, vi } from "vitest";

vi.mock("../../server/deepseek-client.ts", () => ({
  deepSeekChat: vi.fn(),
}));

import { deepSeekChat } from "../../server/deepseek-client.ts";
import {
  generateTransferabilityAnalysis,
  type TransferabilityAnalysisInput,
} from "../../server/transferability-analysis.ts";

function baseInput(communityCollege: string): TransferabilityAnalysisInput {
  return {
    communityCollege,
    intendedMajor: "Computer Science",
    courses: [
      { courseCode: "CS 101", courseName: "Intro to Programming", units: 3, status: "completed" },
    ],
  };
}

function fakeAiResponse(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    communityCollege: "Unknown",
    summary: "You have completed foundational coursework.",
    bestMatches: [],
    courseAnalysis: [],
    igetcSummary: {},
    calgetcSummary: {},
    totalTransferableUnits: 3,
    recommendations: [],
    ...overrides,
  });
}

describe("generateTransferabilityAnalysis — communityCollege attribution", () => {
  it("uses the known input college, not the AI's echoed 'Unknown'", async () => {
    vi.mocked(deepSeekChat).mockResolvedValue(fakeAiResponse({ communityCollege: "Unknown" }));

    const result = await generateTransferabilityAnalysis(
      baseInput("Sacramento City College"),
      "fake-api-key",
    );

    expect(result.communityCollege).toBe("Sacramento City College");
  });

  it("uses the known input college even when the AI omits the field entirely", async () => {
    const { communityCollege: _omit, ...withoutCollege } = JSON.parse(fakeAiResponse());
    vi.mocked(deepSeekChat).mockResolvedValue(JSON.stringify(withoutCollege));

    const result = await generateTransferabilityAnalysis(
      baseInput("American River College"),
      "fake-api-key",
    );

    expect(result.communityCollege).toBe("American River College");
  });

  it("falls back to the AI's value only if the input itself has no college", async () => {
    vi.mocked(deepSeekChat).mockResolvedValue(fakeAiResponse({ communityCollege: "Fallback College" }));

    const result = await generateTransferabilityAnalysis(baseInput(""), "fake-api-key");

    expect(result.communityCollege).toBe("Fallback College");
  });
});
