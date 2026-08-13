interface DevPathwayOpportunity {
  name: string;
  type: string;
  description: string;
  admitProfileNote: string;
}

interface DevPathwayReport {
  type?: string;
  university: string;
  compatibilityScore: number;
  whyItFits: string;
  concerns: string;
  riskAnalysis?: string;
  gpaTarget: number;
  requiredUnits?: number;
  courseGaps: string[];
  coursesAnalyzed?: string[];
  transferTimeline: string;
  scholarshipOptions: string[];
  internshipRecommendations: string[];
  extracurricularRecommendations: string[];
  campusOpportunities: DevPathwayOpportunity[];
  risks: string[];
  nextSteps: string[];
}

export interface DevPathway {
  id: number;
  profileId: number;
  universityId?: string;
  compatibilityScore?: number;
  pathwayType?: string;
  reportJson?: DevPathwayReport;
  isSelected?: string;
  generationLabel?: string;
}

const STORAGE_KEY = "kaleon_dev_pathways";

type DevPathwayStore = Record<string, DevPathway[]>;

function readStore(): DevPathwayStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DevPathwayStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: DevPathwayStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getDevPathways(profileId: number): DevPathway[] {
  const store = readStore();
  return store[String(profileId)] ?? [];
}

export function saveDevPathways(profileId: number, pathways: DevPathway[]): DevPathway[] {
  const store = readStore();
  store[String(profileId)] = pathways;
  writeStore(store);
  return pathways;
}

export function selectDevPathway(profileId: number, pathwayId: number): boolean {
  const pathways = getDevPathways(profileId);
  if (pathways.length === 0) return false;

  const updated = pathways.map((pathway) => ({
    ...pathway,
    isSelected: pathway.id === pathwayId ? "true" : "false",
  }));
  saveDevPathways(profileId, updated);
  return updated.some((pathway) => pathway.id === pathwayId);
}

export function deleteAllDevPathways(profileId: number): void {
  const store = readStore();
  delete store[String(profileId)];
  writeStore(store);
}
