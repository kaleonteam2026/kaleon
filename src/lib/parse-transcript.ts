import * as pdfjsLib from "pdfjs-dist";

export interface ExtractedCourse {
  code: string;
  name: string;
  units?: number;
  term?: string;
  college?: string;
  grade?: string;
  status?: "completed" | "in_progress" | "planned";
}

export interface TranscriptParseResult {
  courses: ExtractedCourse[];
  latestGpa?: number;
  totalUnits: number;
  detectedMajor?: string | null;
}

const COURSE_CODE_RE = /\b([A-Z]{2,6})\s+(\d{1,3}[A-Z]{0,2})\b/g;
const TRANSCRIPT_COURSE_ROW_RE =
  /\b([A-Z]{2,6})\s+(\d{1,3}[A-Z]{0,2})\s+(.+?)\s+(\d{1,2}\.\d{3})\s+(\d{1,2}\.\d{3})\s+(A-|A\+?|B\+?|B-|C\+?|C-|D\+?|D-|F|CR|NC|NP|P|IP|RP|SP|RD|AU|W|WU|WF|I|IC|IN|AF|AW|U)\s+(\d{1,3}\.\d{3})(?=\s+(?:Repeated:|Attempted\s+Earned\s+Points|Term GPA:|CSUEB GPA:|Cum GPA:|Academic Standing:|[A-Z]{2,6}\s+\d{1,3}[A-Z]{0,2}\s+[A-Z]|OFFICIAL Page|CALIFORNIA STATE UNIVERSITY|$))/g;
const TERM_HEADER_RE = /\b(FALL|SPRING|SUMMER|WINTER)\s+(?:SEMESTER|SESSION|QUARTER|TERM)?\s*(\d{4})\b/gi;
const IN_PROGRESS_GRADES = new Set(["IP", "RP", "SP", "RD", "I", "IC", "IN"]);

const CUMULATIVE_GPA_RES = [
  /(?:cumulative|overall|total|cum(?:ulative)?)\s*gpa\s*[:\s]*([0-4]\.\d{1,3})/gi,
  /(?:term|semester)\s*gpa\s*[:\s]*([0-4]\.\d{1,3})/gi,
  /\bgpa\s*[:\s]+([0-4]\.\d{1,3})\b/gi,
];

/**
 * Detect mobile browser once, cached for the session.
 * Used to skip worker initialization and apply mobile-friendly settings.
 */
let _isMobile: boolean | null = null;
function isMobileBrowser(): boolean {
  if (_isMobile === null) {
    _isMobile = typeof navigator !== "undefined" &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  return _isMobile;
}

/**
 * Lazily initialise pdfjs worker — but only on desktop.
 * On mobile we always use disableWorker (module workers fail in mobile WebKit).
 * This avoids the broken workerSrc load that causes cryptic
 * "undefined is not a function" errors on mobile.
 */
let _workerInitialised = false;
function ensurePdfjsWorker(): void {
  if (_workerInitialised || isMobileBrowser()) return;
  try {
    const workerUrl = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch {
    // Worker URL resolution failed — getDocument will fall back to disableWorker
  }
  _workerInitialised = true;
}

function formatTerm(season: string, year: string): string {
  return `${season.charAt(0).toUpperCase()}${season.slice(1).toLowerCase()} ${year}`;
}

/** Nearest term header before a course row (e.g. "Fall 2023"). */
export function termNear(text: string, codeStart: number): string | undefined {
  const before = text.slice(Math.max(0, codeStart - 1200), codeStart);
  const re = new RegExp(TERM_HEADER_RE.source, "gi");
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
  "MS","PHD","GED","HSD","ID","IGETC","GPA","DE","CR","NC","MW","EW","IP",
  "TR","SP","HD","LA","SF","SD","SB","SC","SM","SJ","OC","VC","INFO3","RT3",
]);

function isValidCode(dept: string, num: string): boolean {
  const deptUpper = dept.toUpperCase();
  if (SKIP.has(deptUpper) || SKIP.has(`${deptUpper}${num}`)) return false;
  if (dept.length < 2 || dept.length > 6) return false;
  if (!/^\d/.test(num)) return false;
  const n = parseInt(num, 10);
  if (isNaN(n) || n < 1 || n > 999) return false;
  return true;
}

function unitsNear(text: string, codeEnd: number): number | undefined {
  const window = text.slice(codeEnd, codeEnd + 120);
  const decimal = String.raw`\d{1,2}(?:\.\d{1,3})?`;

  // Pattern 1: "3.0 UNITS", "3 units", "4.0 unit", "4 U"
  const m = window.match(new RegExp(String.raw`\b(${decimal})\s*(?:units?|unit|u\b|credit\s*(?:s|hours?)?)`, "i"));
  if (m) return parseFloat(m[1]);

  // Pattern 2: "(3)" or "(3.0)" — common transcript display
  const mParen = window.match(new RegExp(String.raw`\(((${decimal}))\)`));
  if (mParen) return parseFloat(mParen[1]);

  // Pattern 3: "UNITS: 3" or "CREDITS: 4"
  const mLabel = window.match(new RegExp(String.raw`(?:units?|credit|credits)\s*[:\s]\s*(${decimal})`, "i"));
  if (mLabel) return parseFloat(mLabel[1]);

  // Pattern 4: "3.0 4.0" — some CC transcripts print units then grade side-by-side
  // e.g. "3.0 A" or "3.0 4.0" where the first number is units (1-5), second is grade (0-4)
  const mGradeNum = window.match(new RegExp(String.raw`\b(${decimal})\s+(?:[0-9A-Z.+-]+\s+){0,3}(?:CR|GR|NC|[ABCDF][+-]?)\b`));
  if (mGradeNum) return parseFloat(mGradeNum[1]);

  // Pattern 5: "3.0 4.0" where first = units, second = grade on 0-4 scale
  const mSideBySide = window.match(new RegExp(String.raw`\b(${decimal})\s+([0-4](?:\.\d{1,3})?)\b`));
  if (mSideBySide) return parseFloat(mSideBySide[1]);

  return undefined;
}

function cleanCourseName(name: string): string {
  return name.replace(/\s+/g, " ").trim().replace(/[.,;:]$/, "");
}

function deriveCourseStatus(
  grade: string | undefined,
  units: number | undefined,
): "completed" | "in_progress" | "planned" {
  if (typeof units === "number" && units > 0) return "completed";
  if (grade && IN_PROGRESS_GRADES.has(grade)) return "in_progress";
  return "planned";
}

function parseDetectedMajor(text: string): string | null {
  const patterns = [
    /\bPlan:\s+(.+?)\s+Academic Program History\b/i,
    /\bProgram:\s+(.+?)(?=\s+(?:Academic Program History|Attempted\s+Earned\s+Points|Transfer Credits|Beginning of Undergraduate Record|Cum GPA:|OFFICIAL Page|FALL|SPRING|SUMMER|WINTER|$))/i,
    /\b(?:Major Program|Intended Major|Academic Program|Degree Objective|Curriculum|Program|Goal):\s+(.+?)(?=\s+(?:Program:|Transfer Credits|Beginning of Undergraduate Record|Cum GPA:|OFFICIAL Page|$))/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.replace(/\s+/g, " ").trim();
    if (value && value.length >= 3 && value.length <= 80) {
      return value;
    }
  }

  return null;
}

function parseStructuredCourses(text: string): ExtractedCourse[] {
  const courses: ExtractedCourse[] = [];
  const seen = new Set<string>();

  TRANSCRIPT_COURSE_ROW_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TRANSCRIPT_COURSE_ROW_RE.exec(text)) !== null) {
    const dept = match[1];
    const num = match[2];
    if (!isValidCode(dept, num)) continue;

    const code = `${dept} ${num}`;
    const name = cleanCourseName(match[3]);
    const units = parseFloat(match[5]);
    const grade = match[6].trim();
    const term = termNear(text, match.index);
    const status = deriveCourseStatus(grade, units);
    const key = [code, name, term ?? "", grade, units.toFixed(3)].join("|");
    if (seen.has(key)) continue;
    seen.add(key);

    courses.push({
      code,
      name,
      units,
      term,
      grade,
      status,
    });
  }

  return courses;
}

/**
 * Extract text from a PDF using pdfjs-dist.
 *
 * — On mobile, always disables the web worker (module workers crash WebKit)
 *   and caps page count / batch size to stay within mobile memory limits.
 * — On desktop, lazily initialises the worker once.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  // Validate file type — mobile often sends empty type even for real PDFs,
  // so only reject when type is explicitly set to something that isn't PDF.
  if (file.type && file.type !== "application/pdf") {
    throw new Error(
      "The selected file is not a PDF. Please upload a PDF transcript exported from your student portal.",
    );
  }

  const isMobile = isMobileBrowser();

  // Warn on mobile for files over 10 MB — main-thread parsing is slower
  if (isMobile && file.size > 10 * 1024 * 1024) {
    throw new Error(
      "This PDF is quite large for a mobile device (over 10 MB). " +
      "If scanning fails, try a smaller file or add your courses manually.",
    );
  }

  // Reject files over 20 MB — likely scanned/image-based or corrupted
  if (file.size > 20 * 1024 * 1024) {
    throw new Error(
      "This PDF is too large to process. Try a smaller file (under 20 MB).",
    );
  }

  // Ensure worker is not loaded on mobile (lazy init skips mobile)
  ensurePdfjsWorker();

  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  // Build mobile-friendly PDF loading options.
  // pdfjs-dist supports these at runtime even when TS types don't list them.
  const loadingTask = pdfjsLib.getDocument({
    data,
    ...(isMobile
      ? {
          disableWorker: true,
          disableFontFace: true,
          useSystemFonts: false,
          verbosity: 0,
          cMapUrl: undefined,
          cMapPacked: false,
          maxImageSize: 1024 * 1024,
          isEvalSupported: false,
        }
      : {}),
  } as any);

  let pdf: pdfjsLib.PDFDocumentProxy;
  try {
    pdf = await loadingTask.promise;
  } catch {
    // If the first attempt failed (cryptic worker error from partial worker
    // support), retry with worker disabled and font loading off.
    // This catches mobile devices that aren't properly detected or hybrid
    // browsers with partial worker support.
    const retryTask = pdfjsLib.getDocument({
      data,
      disableWorker: true,
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0,
      cMapUrl: undefined,
      cMapPacked: false,
      maxImageSize: 1024 * 1024,
      isEvalSupported: false,
    } as any);
    pdf = await retryTask.promise;
  }

  let fullText = "";

  // On mobile, process pages in small batches to avoid blocking the main thread
  // and to let the browser yield between batches.
  const BATCH_SIZE = 5;
  if (isMobile) {
    for (let batchStart = 1; batchStart <= pdf.numPages; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, pdf.numPages);
      const batchTexts = await Promise.all(
        Array.from({ length: batchEnd - batchStart + 1 }, (_, i) => {
          const pageNum = batchStart + i;
          return pdf.getPage(pageNum).then(async (page) => {
            const content = await page.getTextContent();
            return content.items
              .map((item) => ("str" in item ? (item as { str: string }).str : ""))
              .join(" ");
          });
        }),
      );
      fullText += batchTexts.join(" ") + "\n";
      // Yield to the event loop so the UI stays responsive
      await new Promise((r) => setTimeout(r, 0));
    }
  } else {
    // Desktop: process all pages at once for speed
    const pagePromises: Promise<string>[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      pagePromises.push(
        pdf.getPage(i).then(async (page) => {
          const content = await page.getTextContent();
          return content.items
            .map((item) => ("str" in item ? (item as { str: string }).str : ""))
            .join(" ");
        }),
      );
    }
    const pageTexts = await Promise.all(pagePromises);
    fullText = pageTexts.join(" ") + "\n";
  }

  // If the PDF has pages but no extractable text, it's likely a scanned/image-based PDF
  if (!fullText.trim() && pdf.numPages > 0) {
    throw new Error(
      "This PDF appears to be a scanned document with no selectable text. " +
      "Please upload a digital transcript (exported from your student portal), " +
      "or enter your courses manually.",
    );
  }

  return fullText;
}

/**
 * Parse already-extracted transcript text using regex.
 * Used as a fallback when the AI endpoint is unavailable.
 */
export function parseTranscriptText(text: string): TranscriptParseResult {
  const latestGpa = parseLatestGpa(text);
  const detectedMajor = parseDetectedMajor(text);
  const structured = parseStructuredCourses(text);
  if (structured.length > 0) {
    const earned = structured.filter((course) => typeof course.units !== "number" || course.units > 0);
    const totalUnits = earned.reduce((sum, course) => sum + (course.units ?? 0), 0);
    return { courses: earned, latestGpa, totalUnits, detectedMajor };
  }

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
    courses.push({
      code,
      name: code,
      units,
      term,
      status: deriveCourseStatus(undefined, units),
    });
  }

  // Keep recognizable courses even when unit extraction fails so the rest of
  // the student pipeline can still retain the transcript's actual coursework.
  // Explicit zero-earned-unit rows are still excluded because they are usually
  // failed, withdrawn, or otherwise not completed for credit.
  const earned = courses.filter(c => c.units === undefined || c.units > 0);
  const totalUnits = earned.reduce((sum, c) => sum + (c.units ?? 0), 0);

  return { courses: earned, latestGpa, totalUnits, detectedMajor };
}

export async function parseTranscriptPDF(file: File): Promise<TranscriptParseResult> {
  const text = await extractTextFromPDF(file);
  return parseTranscriptText(text);
}
