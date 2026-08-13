import { describe, expect, it } from "vitest";
import { parseLatestGpa, parseTranscriptText, termNear } from "@/lib/parse-transcript";

const EAST_BAY_STYLE_TEXT = `
CALIFORNIA STATE UNIVERSITY EAST BAY
Academic Program History
Program: Computer Science

Fall Semester 2023
Attempted Earned Points
ENGL 110 College Composition 3.000 3.000 A 12.000
COMM 150 Oral Communication 3.000 3.000 B 9.000
Term GPA: 3.500

Spring Semester 2024
Attempted Earned Points
MATH 120 Calculus I 4.000 4.000 B 12.000
HIST 101 United States History 3.000 3.000 A 12.000
Term GPA: 3.428

Summer Session 2024
Attempted Earned Points
CS 221 Computer Org & Assem. Lang. 3.000 3.000 A 12.000
CS 421 Operating Systems 3.000 0.000 W 0.000
Term GPA: 4.000

Fall Semester 2024
Attempted Earned Points
BIOL 210 General Biology 4.000 4.000 B 12.000
CHEM 101 General Chemistry 4.000 4.000 A 16.000
Cum GPA: 2.752
Notes: INFO 3 RT 3 are printing fragments from flattened PDF text and should never become courses.
Overall GPA 3.50
`;

describe("parse-transcript regression coverage", () => {
  it("keeps earned units, terms, and real course titles from East Bay style transcript text", () => {
    const result = parseTranscriptText(EAST_BAY_STYLE_TEXT);

    expect(result.detectedMajor).toBe("Computer Science");
    expect(result.latestGpa).toBe(3.5);
    expect(result.totalUnits).toBe(24);

    expect(result.courses.map((course) => course.code)).toEqual([
      "ENGL 110",
      "COMM 150",
      "MATH 120",
      "HIST 101",
      "CS 221",
      "BIOL 210",
      "CHEM 101",
    ]);

    expect(result.courses.find((course) => course.code === "CS 221")).toMatchObject({
      name: "Computer Org & Assem. Lang",
      term: "Summer 2024",
      units: 3,
      status: "completed",
    });

    expect(result.courses.find((course) => course.code === "COMM 150")?.term).toBe("Fall 2023");
    expect(result.courses.find((course) => course.code === "MATH 120")?.term).toBe("Spring 2024");
    expect(result.courses.find((course) => course.code === "CHEM 101")?.term).toBe("Fall 2024");
  });

  it("does not count withdrawn zero-earned rows as completed units", () => {
    const result = parseTranscriptText(EAST_BAY_STYLE_TEXT);

    expect(result.courses.some((course) => course.code === "CS 421")).toBe(false);
    expect(result.totalUnits).toBe(24);
  });

  it("recognizes semester headings and ignores GPA-like or fragment text as fake courses", () => {
    const csIndex = EAST_BAY_STYLE_TEXT.indexOf("CS 221");
    expect(termNear(EAST_BAY_STYLE_TEXT, csIndex)).toBe("Summer 2024");

    expect(parseLatestGpa("Cum GPA: 2.752")).toBe(2.752);
    expect(parseLatestGpa("Overall GPA 3.50")).toBe(3.5);

    const noisy = parseTranscriptText("INFO 3 RT 3 Cum GPA: 2.752 Overall GPA 3.50");
    expect(noisy.courses).toEqual([]);
  });
});
