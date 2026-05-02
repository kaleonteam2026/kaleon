interface University {
  id: string;
  name: string;
  system: string;
  location: string;
  costCategory: string;
  transferFriendliness: number;
  supportScore: number;
  experienceAccessScore: number;
  majors: string[];
  careerTags: string[];
  gpaRangeMin: number;
  gpaRangeRecommended: number;
  honorsAvailable: boolean;
  researchAvailable: boolean;
  internshipAccess: string;
  officialTransferUrl: string;
  notes: string;
  sourceDate: string;
  isEstimate: boolean;
}

interface StudentData {
  currentGpa?: number | null;
  intendedMajor?: string | null;
  careerGoal?: string | null;
  financialSituation?: string | null;
  transferTimeline?: string | null;
  geographicPreference?: string | null;
  completedCourses?: string[];
}

function scoreMajorAlignment(studentMajor: string | null | undefined, universityMajors: string[]): number {
  if (!studentMajor) return 60;
  const major = studentMajor.toLowerCase();
  const directMatch = universityMajors.some(m => major.includes(m.toLowerCase()) || m.toLowerCase().includes(major));
  if (directMatch) return 100;
  // Partial keyword match
  const majorKeywords = major.split(/\s+|\/|-/);
  const anyMatch = universityMajors.some(m => majorKeywords.some(k => k.length > 3 && m.toLowerCase().includes(k)));
  return anyMatch ? 70 : 40;
}

function scoreGpaFit(studentGpa: number | null | undefined, recommendedGpa: number, minGpa: number): number {
  if (!studentGpa || !recommendedGpa) return 60;
  if (studentGpa >= recommendedGpa) return 100;
  if (studentGpa >= minGpa) return Math.round(70 + ((studentGpa - minGpa) / (recommendedGpa - minGpa)) * 30);
  if (studentGpa >= minGpa - 0.3) return Math.round(40 + ((studentGpa - (minGpa - 0.3)) / 0.3) * 30);
  return 20;
}

function scoreCoursework(_completedCourses: string[], _required: string[]): number {
  // Without real articulation data, return a neutral score
  return 65;
}

function scoreCostFit(financialSituation: string | null | undefined, costCategory: string): number {
  if (!financialSituation) return 60;
  const fin = financialSituation.toLowerCase();
  const costMap: Record<string, number> = {
    low: 1, medium: 2, high: 3, very_high: 4
  };
  const cost = costMap[costCategory] ?? 3;

  if (fin.includes("low") || fin.includes("limited") || fin.includes("financial aid") || fin.includes("scholarship")) {
    return cost === 1 ? 100 : cost === 2 ? 75 : cost === 3 ? 50 : 25;
  }
  if (fin.includes("moderate") || fin.includes("some aid")) {
    return cost === 1 ? 90 : cost === 2 ? 85 : cost === 3 ? 65 : 45;
  }
  // No financial concerns
  return cost === 1 ? 85 : cost === 2 ? 90 : cost === 3 ? 85 : 75;
}

function scoreLocationFit(geoPref: string | null | undefined, location: string): number {
  if (!geoPref) return 70;
  const pref = geoPref.toLowerCase();
  const loc = location.toLowerCase();

  if (pref.includes("los angeles") || pref.includes("la") || pref.includes("socal") || pref.includes("southern california")) {
    if (loc.includes("los angeles") || loc.includes("long beach") || loc.includes("fullerton") ||
        loc.includes("pomona") || loc.includes("northridge") || loc.includes("dominguez") ||
        loc.includes("irvine") || loc.includes("orange") || loc.includes("santa barbara") ||
        loc.includes("riverside") || loc.includes("san diego")) return 100;
    return 50;
  }
  if (pref.includes("bay area") || pref.includes("san francisco") || pref.includes("norcal") || pref.includes("northern california")) {
    if (loc.includes("san francisco") || loc.includes("san jose") || loc.includes("santa clara") ||
        loc.includes("berkeley") || loc.includes("santa cruz")) return 100;
    return 50;
  }
  if (pref.includes("san diego")) {
    if (loc.includes("san diego")) return 100;
    return 50;
  }
  if (pref.includes("anywhere") || pref.includes("open") || pref.includes("flexible") || pref.includes("california")) {
    return 80;
  }
  return 65;
}

function scoreCareerFit(careerGoal: string | null | undefined, careerTags: string[]): number {
  if (!careerGoal) return 60;
  const goal = careerGoal.toLowerCase();
  const matchCount = careerTags.filter(tag => goal.includes(tag.toLowerCase()) || tag.toLowerCase().split(" ").some(w => goal.includes(w))).length;
  if (matchCount >= 2) return 100;
  if (matchCount === 1) return 80;
  // Broad category matches
  const techKeywords = ["software", "developer", "engineer", "data", "ai", "machine learning", "it", "cyber"];
  const businessKeywords = ["business", "finance", "accounting", "marketing", "entrepreneur", "mba"];
  const healthKeywords = ["nurse", "doctor", "medical", "health", "pre-med", "physician", "clinical"];
  const lawKeywords = ["lawyer", "attorney", "legal", "law", "policy", "paralegal"];
  const educationKeywords = ["teacher", "education", "counselor", "school"];

  const isTech = techKeywords.some(k => goal.includes(k));
  const isBusiness = businessKeywords.some(k => goal.includes(k));
  const isHealth = healthKeywords.some(k => goal.includes(k));
  const isLaw = lawKeywords.some(k => goal.includes(k));
  const isEdu = educationKeywords.some(k => goal.includes(k));

  if (isTech && careerTags.some(t => ["tech", "engineering"].includes(t))) return 85;
  if (isBusiness && careerTags.some(t => ["business", "finance"].includes(t))) return 85;
  if (isHealth && careerTags.some(t => ["medicine", "healthcare"].includes(t))) return 85;
  if (isLaw && careerTags.some(t => ["law", "public policy"].includes(t))) return 85;
  if (isEdu && careerTags.some(t => ["education", "social work"].includes(t))) return 85;
  return 45;
}

function scoreTimeFit(transferTimeline: string | null | undefined, _estimatedTerms: number): number {
  if (!transferTimeline) return 70;
  const tl = transferTimeline.toLowerCase();
  if (tl.includes("1 year") || tl.includes("one year") || tl.includes("next fall") || tl.includes("asap")) return 75;
  if (tl.includes("2 year") || tl.includes("two year")) return 90;
  if (tl.includes("3 year") || tl.includes("three year") || tl.includes("flexible")) return 100;
  return 75;
}

export function calculateCompatibility(student: StudentData, university: University): {
  total: number;
  breakdown: {
    majorAlignment: number;
    gpaFit: number;
    coursework: number;
    costFit: number;
    locationFit: number;
    careerFit: number;
    experienceAccess: number;
    timeFit: number;
    supportFit: number;
  };
} {
  const scores = {
    majorAlignment: scoreMajorAlignment(student.intendedMajor, university.majors),
    gpaFit: scoreGpaFit(student.currentGpa, university.gpaRangeRecommended, university.gpaRangeMin),
    coursework: scoreCoursework(student.completedCourses ?? [], []),
    costFit: scoreCostFit(student.financialSituation, university.costCategory),
    locationFit: scoreLocationFit(student.geographicPreference, university.location),
    careerFit: scoreCareerFit(student.careerGoal, university.careerTags),
    experienceAccess: university.experienceAccessScore ?? 70,
    timeFit: scoreTimeFit(student.transferTimeline, 4),
    supportFit: university.supportScore ?? 70,
  };

  const weighted = Math.round(
    scores.majorAlignment   * 0.200 +
    scores.gpaFit           * 0.150 +
    scores.coursework       * 0.150 +
    scores.costFit          * 0.100 +
    scores.locationFit      * 0.100 +
    scores.careerFit        * 0.150 +
    scores.experienceAccess * 0.075 +
    scores.timeFit          * 0.050 +
    scores.supportFit       * 0.025
  );

  return { total: weighted, breakdown: scores };
}

export function interpretScore(score: number): { label: string; color: string } {
  if (score >= 85) return { label: "Strong Fit", color: "green" };
  if (score >= 70) return { label: "Good Fit", color: "blue" };
  if (score >= 55) return { label: "Moderate Fit", color: "yellow" };
  if (score >= 40) return { label: "Weak Fit", color: "orange" };
  return { label: "Poor Fit", color: "red" };
}
