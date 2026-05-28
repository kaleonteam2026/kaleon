import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

export interface ExtractedCourse {
  code: string;
  name: string;
  units?: number;
}

const COURSE_CODE_RE = /\b([A-Z]{2,6})\s+(\d{1,3}[A-Z]{0,2})\b/g;

const SKIP = new Set([
  "GPA","GE","UC","CSU","AP","SAT","ACT","CCC","CC","AB","CA","USA",
  "FALL","SPRING","SUMMER","WINTER","TOTAL","UNITS","GRADE","TERM",
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
  const window = text.slice(codeEnd, codeEnd + 80);
  const m = window.match(/\b([1-9](?:\.\d)?)\s*(?:units?|unit|u\b)/i);
  if (m) return parseFloat(m[1]);
  const m2 = window.match(/\b([1-9](?:\.\d)?)\s+(?:[0-9A-Z.+-]+\s+){0,3}(?:CR|GR|NC|[ABCDF][+-]?)\b/);
  if (m2) return parseFloat(m2[1]);
  return undefined;
}

export async function parseTranscriptPDF(file: File): Promise<ExtractedCourse[]> {
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

  const seen = new Set<string>();
  const courses: ExtractedCourse[] = [];

  COURSE_CODE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = COURSE_CODE_RE.exec(fullText)) !== null) {
    const dept = match[1];
    const num = match[2];
    if (!isValidCode(dept, num)) continue;
    const code = `${dept} ${num}`;
    if (seen.has(code)) continue;
    seen.add(code);
    const units = unitsNear(fullText, match.index + match[0].length);
    courses.push({ code, name: code, units });
  }

  return courses;
}
