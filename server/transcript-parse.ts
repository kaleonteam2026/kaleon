import { deepSeekChat } from "./deepseek-client.ts";

const SYSTEM_PROMPT = `You are a college transcript parser. Given the raw text of a student transcript, extract all course information as accurately as possible and return a JSON object.

Return ONLY valid JSON with this exact structure — no markdown, no code fences, no extra text:

{
  "courses": [
    {
      "code": "MATH 101",
      "name": "Calculus I",
      "units": 5,
      "term": "Fall 2023"
    }
  ],
  "latestGpa": 3.45,
  "totalUnits": 60
}

Rules:
- Course codes are typically DEPARTMENT + NUMBER (e.g. "MATH 101", "ENGL 110", "BIOL 3A", "CS 106B").
- Course name is the full description (e.g. "Calculus I", "Introduction to Psychology").
- Units are a number typically between 1 and 6, usually appearing right after or right before the course code/name.
- Terms look like "Fall 2023", "Spring 2024", "Summer 2023", "Winter 2024". Group each course under the nearest term header that precedes it.
- GPA is a decimal between 0.0 and 4.0 labeled with "cumulative", "overall", "total", "GPA", or similar. If multiple GPAs appear, take the latest cumulative/overall one.
- totalUnits is the sum of all course unit values.
- If a course has no discernible term, omit the "term" field entirely.
- If you can't find any course codes, return {"courses":[], "latestGpa":null, "totalUnits":0}.
- Do NOT skip courses just because the code format looks unfamiliar — transcript formats vary widely between colleges.`;
const USER_PROMPT_PREFIX = "Here is a college transcript. Parse it and return the JSON:\n\n";

export async function parseTranscriptWithAI(
  text: string,
  apiKey: string,
): Promise<{ courses: { code: string; name: string; units?: number; term?: string }[]; latestGpa: number | null; totalUnits: number }> {
  const raw = await deepSeekChat({
    system: SYSTEM_PROMPT,
    user: USER_PROMPT_PREFIX + text,
    apiKey,
  });

  // Strip any markdown fences the LLM might wrap the JSON in
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as {
    courses?: { code?: string; name?: string; units?: number; term?: string }[];
    latestGpa?: number | null;
    totalUnits?: number;
  };

  // Validate and shape the result
  const courses = (parsed.courses ?? []).map(c => ({
    code: c.code ?? "UNKNOWN",
    name: c.name ?? c.code ?? "Unknown Course",
    units: typeof c.units === "number" && c.units > 0 ? c.units : undefined,
    term: typeof c.term === "string" && c.term.trim().length > 0 ? c.term.trim() : undefined,
  }));

  const latestGpa =
    parsed.latestGpa != null && parsed.latestGpa >= 0 && parsed.latestGpa <= 4.0
      ? parsed.latestGpa
      : null;

  const totalUnits = courses.reduce((sum, c) => sum + (c.units ?? 0), 0);

  return { courses, latestGpa, totalUnits };
}
