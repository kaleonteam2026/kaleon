import { describe, expect, it } from "vitest";
import { parseTranscriptText } from "@/lib/parse-transcript";

describe("parse-transcript — in-progress course handling (regex fallback path)", () => {
  it("mislabels an in-progress course as 'completed' when the transcript states units directly (no Attempted/Earned split)", () => {
    // Simple style some CC transcripts use: one "units" value stated plainly,
    // with grade shown separately — no Attempted/Earned/Points columns.
    const text = `
Fall 2025
PHYS 400 Physics for Scientists and Engineers I 4.00 units IP
`;
    const result = parseTranscriptText(text);
    const course = result.courses.find((c) => c.code === "PHYS 400");

    expect(course).toBeDefined();
    // BUG: should be "in_progress" — deriveCourseStatus checks units>0 before
    // it ever checks whether the grade indicates an in-progress course, so a
    // course with real units and grade "IP" is mislabeled "completed".
    expect(course?.status).toBe("completed");
  });

  it("silently drops an in-progress course entirely when the transcript uses a real Attempted/Earned/Grade/Points format", () => {
    // Realistic official-transcript style (matches the existing East Bay test
    // fixture): Earned units are 0.000 until the course is actually completed.
    const text = `
CALIFORNIA STATE UNIVERSITY EAST BAY
Academic Program History

Fall Semester 2025
Attempted Earned Points
PHYS 400 Physics for Scientists and Engineers I 4.000 0.000 IP 0.000
Term GPA: 3.500
`;
    const result = parseTranscriptText(text);
    const course = result.courses.find((c) => c.code === "PHYS 400");

    // BUG: the course is dropped from the result entirely — not mislabeled,
    // just missing. deriveCourseStatus correctly computes "in_progress" here
    // (Earned=0, grade=IP), but parseTranscriptText's final filter requires
    // units > 0 to keep a course, discarding it.
    expect(course).toBeUndefined();
  });
});
