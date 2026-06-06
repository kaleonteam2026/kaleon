import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

export interface ExtractedCourse {
  code: string;
  name: string;
  units?: number;
  term?: string;
  college?: string;
}

export interface TranscriptParseResult {
  courses: ExtractedCourse[];
  latestGpa?: number;
  totalUnits: number;
  detectedMajor?: string | null;
}

export interface TranscriptParseResult {
  courses: ExtractedCourse[];
  latestGpa?: number;
  totalUnits: number;
}

const COURSE_CODE_RE = /\b([A-Z]{2,6})\s+(\d{1,3}[A-Z]{0,2})\b/g;

const CUMULATIVE_GPA_RES = [
  /(?:cumulative|overall|total|cum(?:ulative)?)\s*gpa\s*[:\s]*([0-4]\.\d{1,3})/gi,
  /(?:term|semester)\s*gpa\s*[:\s]*([0-4]\.\d{1,3})/gi,
  /\bgpa\s*[:\s]+([0-4]\.\d{1,3})\b/gi,
];

function formatTerm(season: string, year: string): string {
  return `${season.charAt(0).toUpperCase()}${season.slice(1).toLowerCase()} ${year}`;
}

/** Nearest term header before a course row (e.g. "Fall 2023"). */
export function termNear(text: string, codeStart: number): string | undefined {
  const before = text.slice(Math.max(0, codeStart - 500), codeStart);
  const re = /\b(FALL|SPRING|SUMMER|WINTER)\s+(\d{4})\b/gi;
  let match: RegExpExecArray | null;
  let last: string | undefined;
  while ((match = re.exec(before)) !== null) {
    last = formatTerm(match[1], match[2]);
  }
  return last;
}

/** Latest cumulative / term GPA found in the transcript (last occurrence wins). */
export function parseLatestGpa(text: string): number | undefined {
  let latest: number | undefined;
  let latestIndex = -1;

  for (const re of CUMULATIVE_GPA_RES) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const val = parseFloat(match[1]);
      if (val >= 0 && val <= 4.0 && match.index >= latestIndex) {
        latestIndex = match.index;
        latest = val;
      }
    }
  }

  return latest;
}

const SKIP = new Set([
  "GE","UC","CSU","AP","SAT","ACT","CCC","CC","AB","CA","USA","TOTAL","UNITS","GRADE",
  "PAGE","THE","AND","FOR","NOT","YES","NO","NEW","AA","AS","BA","BS",
  "MS","PHD","GED","HSD","ID","IGETC","DE","CR","NC","MW","EW","IP",
  "TR","SP","HD","LA","SF","SD","SB","SC","SM","SJ","OC","VC",
]);

function isValidCode(dept: string, num: string): boolean {
  if (SKIP.has(dept) || SKIP.has(dept + num)) return false;
  if (dept.length < 2 || dept.length > 6) return false;
  if (!/^\d/.test(num)) return false;
  const n = parseInt(num, 10);
  if (isNaN(n) || n < 1 || n > 999) return false;
  return true;
}

function unitsNear(text: string, codeEnd: number): number | undefined {
  const window = text.slice(codeEnd, codeEnd + 120);

  // Pattern 1: "3.0 UNITS", "3 units", "4.0 unit", "4 U"
  const m = window.match(/\b([1-9]\d?(?:\.\d)?)\s*(?:units?|unit|u\b|credit\s*(?:s|hours?)?)/i);
  if (m) return parseFloat(m[1]);

  // Pattern 2: "(3)" or "(3.0)" — common transcript display
  const mParen = window.match(/\(([1-5](?:\.0)?)\)/);
  if (mParen) return parseFloat(mParen[1]);

  // Pattern 3: "UNITS: 3" or "CREDITS: 4"
  const mLabel = window.match(/(?:units?|credit|credits)\s*[:\s]\s*([1-9]\d?(?:\.\d)?)/i);
  if (mLabel) return parseFloat(mLabel[1]);

  // Pattern 4: "3.0 4.0" — some CC transcripts print units then grade side-by-side
  // e.g. "3.0 A" or "3.0 4.0" where the first number is units (1-5), second is grade (0-4)
  const mGradeNum = window.match(/\b([1-5](?:\.\d)?)\s+(?:[0-9A-Z.+-]+\s+){0,3}(?:CR|GR|NC|[ABCDF][+-]?)\b/);
  if (mGradeNum) return parseFloat(mGradeNum[1]);

  // Pattern 5: "3.0 4.0" where first = units, second = grade on 0-4 scale
  const mSideBySide = window.match(/\b([1-5](?:\.\d))\s+([0-4](?:\.\d)?)\b/);
  if (mSideBySide) return parseFloat(mSideBySide[1]);

  return undefined;
}

/** Extract raw text from a PDF using pdfjs-dist (no regex parsing). */
export async function extractTextFromPDF(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

/**
 * Parse already-extracted transcript text using regex.
 * Used as a fallback when the AI endpoint is unavailable.
 */
export function parseTranscriptText(text: string): TranscriptParseResult {
  const seen = new Set<string>();
  const courses: ExtractedCourse[] = [];

  COURSE_CODE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = COURSE_CODE_RE.exec(text)) !== null) {
    const dept = match[1];
    const num = match[2];
    if (!isValidCode(dept, num)) continue;
    const code = `${dept} ${num}`;
    if (seen.has(code)) continue;
    seen.add(code);
    const codeEnd = match.index + match[0].length;
    const units = unitsNear(text, codeEnd);
    const term = termNear(text, match.index);
    courses.push({ code, name: code, units, term });
  }

  const totalUnits = courses.reduce((sum, c) => sum + (c.units ?? 0), 0);
  const latestGpa = parseLatestGpa(text);

  return { courses, latestGpa, totalUnits };
}

export async function parseTranscriptPDF(file: File): Promise<TranscriptParseResult> {
  const text = await extractTextFromPDF(file);
  return parseTranscriptText(text);
}
