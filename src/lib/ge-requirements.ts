type CourseLike = {
  code?: string;
  courseCode?: string;
  name?: string;
  courseName?: string;
};

export const IGETC_AREA_KEYS = [
  "area1AEnglish",
  "area1BCriticalThinking",
  "area2Math",
  "area3Arts",
  "area4Social",
  "area5Science",
  "area6Language",
] as const;

export const CALGETC_AREA_KEYS = [
  "areaA1Oral",
  "areaA2Written",
  "areaA3Critical",
  "areaB1Physical",
  "areaB2Life",
  "areaB3Lab",
  "areaB4Math",
  "areaC1Arts",
  "areaC2Humanities",
  "areaDSocial",
  "areaELifelong",
  "areaFEthnic",
] as const;

export type IgetcAreaKey = (typeof IGETC_AREA_KEYS)[number];
export type CalgetcAreaKey = (typeof CALGETC_AREA_KEYS)[number];

function normalizeCourseLabel(course: CourseLike): string {
  return (course.courseCode ?? course.code ?? course.courseName ?? course.name ?? "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function mapCourseToIgetcArea(course: CourseLike | string): IgetcAreaKey | undefined {
  const label = typeof course === "string" ? course : normalizeCourseLabel(course);
  if (!label) return undefined;

  if (/^ENGL\s+1(?:A|01A?)/.test(label)) return "area1AEnglish";
  if (/^(ENGL\s+(?:1[BC]|2|02)|PHIL\s+(?:4|04|6|06)|COMM\s+(?:2|4))/.test(label)) return "area1BCriticalThinking";
  if (/^(MATH|STAT)\s/.test(label)) return "area2Math";
  if (/^(ART|MUS|DANC|THEA|FILM|PHOT)\s/.test(label)) return "area3Arts";
  if (/^(HIST|POLS|PSYC|SOC|ECON|ANTH|GEOG)\s/.test(label)) return "area4Social";
  if (/^(BIOL|BIO|CHEM|PHYS|ASTR|GEOL|OCEA|PHS)\s/.test(label)) return "area5Science";
  if (/^(SPAN|FREN|GERM|ITAL|CHIN|JAPN|KOR|LATN|GREK)\s/.test(label)) return "area6Language";
  return undefined;
}

export function mapCourseToCalgetcArea(course: CourseLike | string): CalgetcAreaKey | undefined {
  const label = typeof course === "string" ? course : normalizeCourseLabel(course);
  if (!label) return undefined;

  if (/^(COMM|ENGL)\s+(?:1|01)\b/.test(label)) return "areaA1Oral";
  if (/^ENGL\s+1A/.test(label)) return "areaA2Written";
  if (/^(ENGL\s+1[BC]|PHIL\s+[46])/.test(label)) return "areaA3Critical";
  if (/^(PHYS|CHEM|ASTR|GEOL)\s/.test(label)) return "areaB1Physical";
  if (/^(BIOL|BIO)\s/.test(label)) return "areaB2Life";
  if (/\b(LAB|L)\s*\d/.test(label)) return "areaB3Lab";
  if (/^(MATH|STAT)\s/.test(label)) return "areaB4Math";
  if (/^(ART|MUS|DANC|THEA|FILM)\s/.test(label)) return "areaC1Arts";
  if (/^(HIST|ENGL\s+(?:2|02)|PHIL|HUM)\s/.test(label)) return "areaC2Humanities";
  if (/^(HIST|POLS|PSYC|SOC|ECON|ANTH|GEOG)\s/.test(label)) return "areaDSocial";
  if (/^(HEALTH|HLTH|NUTR|KIN|PE|P E)\s/.test(label)) return "areaELifelong";
  if (/^(ETHN|AFAM|CHIC|ASAM|NAS|RACE)\s/.test(label)) return "areaFEthnic";
  return undefined;
}

function areaStateRecord<T extends string>(keys: readonly T[], completed: Set<T>): Record<T, boolean> {
  return Object.fromEntries(keys.map((key) => [key, completed.has(key)])) as Record<T, boolean>;
}

export function deriveIgetcAreaStates(courses: CourseLike[]): Record<IgetcAreaKey, boolean> {
  const completed = new Set<IgetcAreaKey>();
  for (const course of courses) {
    const area = mapCourseToIgetcArea(course);
    if (area) completed.add(area);
  }
  return areaStateRecord(IGETC_AREA_KEYS, completed);
}

export function deriveCalgetcAreaStates(courses: CourseLike[]): Record<CalgetcAreaKey, boolean> {
  const completed = new Set<CalgetcAreaKey>();
  for (const course of courses) {
    const area = mapCourseToCalgetcArea(course);
    if (area) completed.add(area);
  }
  return areaStateRecord(CALGETC_AREA_KEYS, completed);
}

export function deriveIgetcSummary(courses: CourseLike[]) {
  const areas = deriveIgetcAreaStates(courses);
  return {
    ...areas,
    completedAreas: IGETC_AREA_KEYS.filter((key) => areas[key]),
    missingAreas: IGETC_AREA_KEYS.filter((key) => !areas[key]),
  };
}

export function deriveCalgetcSummary(courses: CourseLike[]) {
  const areas = deriveCalgetcAreaStates(courses);
  return {
    ...areas,
    completedAreas: CALGETC_AREA_KEYS.filter((key) => areas[key]),
    missingAreas: CALGETC_AREA_KEYS.filter((key) => !areas[key]),
  };
}
