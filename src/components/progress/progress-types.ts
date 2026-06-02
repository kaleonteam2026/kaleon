export type EntryType =
  | "gpa_update"
  | "certification"
  | "opportunity"
  | "milestone"
  | "achievement"
  | "setback"
  | "note";

export interface ProgressEntry {
  id: number;
  entryType: EntryType;
  title: string;
  description?: string | null;
  entryDate?: string | null;
  numericValue?: number | null;
  createdAt: string;
}

export interface EntryFeedback {
  aligned: boolean;
  alignmentScore: number;
  currentAdmissionChance: number;
  admissionImpactDelta: number;
  severity: "positive" | "caution" | "concern";
  heading: string;
  feedback: string;
  reconciliationSteps: string[];
  nextAlignedActions: string[];
  guidebookCheck: string;
}

export interface ProgressAnalysis {
  id: number;
  contentMarkdown?: string | null;
  overallScore?: number | null;
  summary?: string | null;
  createdAt: string;
}

export interface PathwayInfo {
  hasSelectedPathway: boolean;
  pathway: Record<string, unknown> | null;
}
