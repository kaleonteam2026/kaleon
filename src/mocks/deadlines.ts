export type DeadlineCategory =
  | "uc"
  | "csu"
  | "financial_aid"
  | "tag"
  | "scholarship"
  | "decision";

export type DeadlinePriority = "critical" | "high" | "medium";

export interface DeadlineSource {
  id: string;
  month: number;
  day: number;
  endDay?: number;
  label: string;
  description: string;
  category: DeadlineCategory;
  url: string;
  priority: DeadlinePriority;
}

export const ANNUAL_DEADLINES: DeadlineSource[] = [
  { id: "tag", month: 9, day: 1, endDay: 30, label: "TAG Filing Window", description: "Submit TAG applications.", category: "tag", url: "https://admission.universityofcalifornia.edu", priority: "critical" },
  { id: "fafsa", month: 10, day: 1, label: "FAFSA / CA Dream Act Opens", description: "Financial aid applications open.", category: "financial_aid", url: "https://studentaid.gov", priority: "critical" },
  { id: "csu-open", month: 10, day: 1, label: "CSU Application Opens", description: "Cal State Apply opens.", category: "csu", url: "https://www.calstate.edu/apply", priority: "high" },
  { id: "uc-open", month: 11, day: 1, label: "UC Application Opens", description: "UC Apply opens.", category: "uc", url: "https://apply.universityofcalifornia.edu", priority: "critical" },
  { id: "csu-deadline", month: 11, day: 30, label: "CSU Application Deadline", description: "Submit CSU transfer apps.", category: "csu", url: "https://www.calstate.edu/apply", priority: "critical" },
  { id: "uc-deadline", month: 11, day: 30, label: "UC Application Deadline", description: "Submit UC transfer apps.", category: "uc", url: "https://apply.universityofcalifornia.edu", priority: "critical" },
  { id: "cal-grant", month: 3, day: 2, label: "Cal Grant Deadline", description: "Final Cal Grant deadline.", category: "financial_aid", url: "https://www.csac.ca.gov", priority: "critical" },
  { id: "reply-day", month: 5, day: 1, label: "Decision Day", description: "Accept offer and SIR.", category: "decision", url: "https://admission.universityofcalifornia.edu", priority: "critical" },
];
