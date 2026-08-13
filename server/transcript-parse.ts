import { deepSeekChat } from "./deepseek-client.ts";

function buildSystemPrompt(detectMultipleColleges?: boolean): string {
  const collegeField = detectMultipleColleges
    ? `{
        "code": "MATH 101",
        "name": "Calculus I",
        "units": 5,
        "term": "Fall 2023",
        "college": "East Los Angeles College"
      }`
    : `{
        "code": "MATH 101",
        "name": "Calculus I",
        "units": 5,
        "term": "Fall 2023"
      }`;

  const multiCollegeRule = detectMultipleColleges
    ? `\n- If the transcript contains courses from MULTIPLE colleges, detect each college's name and its abbreviations (e.g., "ELAC" for East Los Angeles College, "PCC" for Pasadena City College, "SMC" for Santa Monica College). Assign a "college" field to each course indicating which college it came from.
- The college name may appear as a header, footer, watermark, run of courses under that college, or abbreviation in course listings. Look for institutional names and common abbreviations of California community colleges.
- If all courses appear to be from a single college, still include the "college" field on each course with that college's name.`
    : "";

  return `You are a college transcript parser. Given the raw text of a student transcript, extract all course information as accurately as possible and return a JSON object.

Return ONLY valid JSON with this exact structure — no markdown, no code fences, no extra text:

{
  "courses": [${collegeField}
  ],
  "latestGpa": 3.45,
  "totalUnits": 60,
  "detectedMajor": "Computer Science"
}

Rules:
- Course codes are typically DEPARTMENT + NUMBER (e.g. "MATH 101", "ENGL 110", "BIOL 3A", "CS 106B").
- Course name is the full description (e.g. "Calculus I", "Introduction to Psychology").
- Units represent the number of course credits. Transcripts often have separate "Earned" and "Attempted" columns. Extract the value from the "Earned" column (or "Earned Units", "Units Earned") — NOT from "Attempted", "Units Attempted", or similar labels. The typical range is 1–6.
- If a course has 0.00 Earned units (indicating failure or withdrawal), DO NOT include it in the output at all — skip it entirely.
- Terms look like "Fall 2023", "Spring 2024", "Summer 2023", "Winter 2024". Group each course under the nearest term header that precedes it.
- GPA is a decimal between 0.0 and 4.0 labeled with "cumulative", "overall", "total", "GPA", or similar. If multiple GPAs appear, take the latest cumulative/overall one.
- totalUnits is the sum of all course unit values.
- If a course has no discernible term, omit the "term" field entirely.
- If you can't find any course codes, return {"courses":[], "latestGpa":null, "totalUnits":0}.
- Do NOT skip courses just because the code format looks unfamiliar — transcript formats vary widely between colleges.
- Look for the student's major, program, or area of study. It may appear as "Major:", "Program:", "Degree Objective:", "Academic Program:", "Curriculum:", "Goal:", "Intended Major:", or similar labels. If found, include it as "detectedMajor". If not found, set to null.${multiCollegeRule}`;
}

const USER_PROMPT_PREFIX = "Here is a college transcript. Parse it and return the JSON:\n\n";

export async function parseTranscriptWithAI(
  text: string,
  apiKey: string,
  detectMultipleColleges?: boolean,
): Promise<{
  courses: { code: string; name: string; units?: number; term?: string; college?: string }[];
  latestGpa: number | null;
  totalUnits: number;
  detectedMajor?: string | null;
}> {
  const systemPrompt = buildSystemPrompt(detectMultipleColleges);
  const raw = await deepSeekChat({
    system: systemPrompt,
    user: USER_PROMPT_PREFIX + text,
    apiKey,
  });

  // Strip any markdown fences the LLM might wrap the JSON in
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as {
    courses?: { code?: string; name?: string; units?: number; term?: string; college?: string }[];
    latestGpa?: number | null;
    totalUnits?: number;
    detectedMajor?: string | null;
  };

  // Validate and shape the result. Preserve recognizable courses even when the
  // parser cannot confidently recover earned units so downstream pages still
  // have real course records to work from.
  const courses = (parsed.courses ?? [])
    .filter((c) => {
      const hasCode = typeof c.code === "string" && c.code.trim().length > 0;
      const hasName = typeof c.name === "string" && c.name.trim().length > 0;
      return (hasCode || hasName) && c.units !== 0;
    })
    .map(c => ({
      code: c.code?.trim() || c.name?.trim() || "UNKNOWN",
      name: c.name?.trim() || c.code?.trim() || "Unknown Course",
      units: typeof c.units === "number" && c.units > 0 ? c.units : undefined,
      term: typeof c.term === "string" && c.term.trim().length > 0 ? c.term.trim() : undefined,
      college: typeof c.college === "string" && c.college.trim().length > 0 ? c.college.trim() : undefined,
    }));

  const latestGpa =
    parsed.latestGpa != null && parsed.latestGpa >= 0 && parsed.latestGpa <= 4.0
      ? parsed.latestGpa
      : null;

  const totalUnits = courses.reduce((sum, c) => sum + (c.units ?? 0), 0);

  const detectedMajor =
    typeof parsed.detectedMajor === "string" && parsed.detectedMajor.trim().length > 0
      ? parsed.detectedMajor.trim()
      : null;

  return { courses, latestGpa, totalUnits, detectedMajor };
}
