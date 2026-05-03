// Single source of truth for the annual California transfer deadline list.
// Consumed by both the API server (reminder scheduler) and the React UI
// (deadline calendar page). When CSAC/UC/CSU updates a date, edit it here
// only.

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
  /** 1-12 */
  month: number;
  day: number;
  /** Optional end-of-window day for ranges like the TAG filing window. */
  endDay?: number;
  label: string;
  description: string;
  category: DeadlineCategory;
  url: string;
  priority: DeadlinePriority;
}

export const ANNUAL_DEADLINES: DeadlineSource[] = [
  { id: "tag", month: 9, day: 1, endDay: 30, label: "TAG Filing Window", description: "Submit your Transfer Admission Guarantee application to UC Davis, UCI, UCM, UCR, UCSB, or UCSC. Filing this guarantees admission if you meet the GPA and unit requirements.", category: "tag", url: "https://admission.universityofcalifornia.edu/admission-requirements/transfer-requirements/transfer-admission-guarantee-tag.html", priority: "critical" },
  { id: "fafsa", month: 10, day: 1, label: "FAFSA / CA Dream Act Opens", description: "Federal Student Aid and California Dream Act applications open. Applying early maximizes your Cal Grant eligibility and institutional aid priority.", category: "financial_aid", url: "https://studentaid.gov", priority: "critical" },
  { id: "csu-open", month: 10, day: 1, label: "CSU Application Opens (Cal State Apply)", description: "The Cal State Apply portal opens for the following fall transfer applicants. Apply early — some CSU campuses fill up.", category: "csu", url: "https://www.calstate.edu/apply", priority: "high" },
  { id: "uc-open", month: 11, day: 1, label: "UC Application Opens (UC Apply)", description: "The UC application portal opens. You can apply to up to 9 UC campuses on a single application.", category: "uc", url: "https://apply.universityofcalifornia.edu", priority: "critical" },
  { id: "csu-deadline", month: 11, day: 30, label: "CSU Application Deadline", description: "Last day to submit CSU transfer applications. Some impacted campuses may have earlier deadlines — verify with each campus.", category: "csu", url: "https://www.calstate.edu/apply", priority: "critical" },
  { id: "uc-deadline", month: 11, day: 30, label: "UC Application Deadline", description: "Last day to submit UC transfer applications. The personal insight questions (PIQs) are due by this date.", category: "uc", url: "https://apply.universityofcalifornia.edu", priority: "critical" },
  { id: "cal-grant-prelim", month: 10, day: 15, label: "Cal Grant GPA Verification (Preliminary)", description: "Your CC financial aid office submits GPA data to CSAC. Ensure your GPA is on file.", category: "financial_aid", url: "https://www.csac.ca.gov/cal-grants", priority: "high" },
  { id: "uc-piq", month: 1, day: 1, label: "UC Additional Information Deadline", description: "Last chance to add additional information to your UC application (if prompted). Responds to requests from UC campuses.", category: "uc", url: "https://apply.universityofcalifornia.edu", priority: "medium" },
  { id: "cal-grant", month: 3, day: 2, label: "Cal Grant Application Deadline", description: "Final Cal Grant deadline — submit your FAFSA or California Dream Act Application by this date to be eligible for Cal Grants.", category: "financial_aid", url: "https://www.csac.ca.gov/cal-grants", priority: "critical" },
  { id: "jkc", month: 3, day: 1, label: "Jack Kent Cooke Transfer Scholarship", description: "Annual deadline for the JKC Transfer Scholarship — up to $55,000/year for high-achieving CC students with financial need.", category: "scholarship", url: "https://www.jkcf.org/our-scholarships/college-scholarship/", priority: "high" },
  { id: "uc-decisions", month: 4, day: 1, label: "UC Admission Decisions (approx.)", description: "Most UC campuses release transfer admission decisions in late March–April. Check your UC Apply portal.", category: "decision", url: "https://apply.universityofcalifornia.edu", priority: "medium" },
  { id: "csu-decisions", month: 4, day: 30, label: "CSU Admission Decisions (approx.)", description: "Most CSU campuses finalize transfer admission decisions by late April.", category: "decision", url: "https://www.calstate.edu/apply", priority: "medium" },
  { id: "reply-day", month: 5, day: 1, label: "National College Decision Day", description: "Deadline to accept your offer of admission and submit the Statement of Intent to Register (SIR). Must pay enrollment deposit.", category: "decision", url: "https://admission.universityofcalifornia.edu", priority: "critical" },
  { id: "final-transcript", month: 7, day: 15, label: "Final Official Transcripts Due", description: "Submit final official transcripts from your CC to your transfer university. Admission may be revoked if not received.", category: "uc", url: "https://admission.universityofcalifornia.edu", priority: "high" },
];
