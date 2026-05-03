// Server-side mirror of the deadline source data used in
// artifacts/pathwise-cc/src/pages/deadline-calendar.tsx.
// Kept duplicated rather than extracted into a shared lib to avoid coupling
// the API server build to the React app. If the calendar list grows, lift
// both copies into lib/.

export type DeadlineCategory =
  | "uc" | "csu" | "financial_aid" | "tag" | "scholarship" | "decision";
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
  { id: "tag", month: 9, day: 1, endDay: 30, label: "TAG Filing Window", description: "Submit your Transfer Admission Guarantee application to UC Davis, UCI, UCM, UCR, UCSB, or UCSC.", category: "tag", url: "https://admission.universityofcalifornia.edu/admission-requirements/transfer-requirements/transfer-admission-guarantee-tag.html", priority: "critical" },
  { id: "fafsa", month: 10, day: 1, label: "FAFSA / CA Dream Act Opens", description: "Federal Student Aid and California Dream Act applications open.", category: "financial_aid", url: "https://studentaid.gov", priority: "critical" },
  { id: "csu-open", month: 10, day: 1, label: "CSU Application Opens (Cal State Apply)", description: "Cal State Apply portal opens for fall transfer applicants.", category: "csu", url: "https://www.calstate.edu/apply", priority: "high" },
  { id: "uc-open", month: 11, day: 1, label: "UC Application Opens (UC Apply)", description: "UC application portal opens for fall transfer applicants.", category: "uc", url: "https://apply.universityofcalifornia.edu", priority: "critical" },
  { id: "csu-deadline", month: 11, day: 30, label: "CSU Application Deadline", description: "Last day to submit CSU transfer applications.", category: "csu", url: "https://www.calstate.edu/apply", priority: "critical" },
  { id: "uc-deadline", month: 11, day: 30, label: "UC Application Deadline", description: "Last day to submit UC transfer applications and PIQs.", category: "uc", url: "https://apply.universityofcalifornia.edu", priority: "critical" },
  { id: "cal-grant-prelim", month: 10, day: 15, label: "Cal Grant GPA Verification (Preliminary)", description: "Your CC submits GPA data to CSAC.", category: "financial_aid", url: "https://www.csac.ca.gov/cal-grants", priority: "high" },
  { id: "uc-piq", month: 1, day: 1, label: "UC Additional Information Deadline", description: "Last chance to add additional info to your UC application.", category: "uc", url: "https://apply.universityofcalifornia.edu", priority: "medium" },
  { id: "cal-grant", month: 3, day: 2, label: "Cal Grant Application Deadline", description: "Final Cal Grant deadline — submit FAFSA or CADAA by this date.", category: "financial_aid", url: "https://www.csac.ca.gov/cal-grants", priority: "critical" },
  { id: "jkc", month: 3, day: 1, label: "Jack Kent Cooke Transfer Scholarship", description: "Annual JKC Transfer Scholarship deadline.", category: "scholarship", url: "https://www.jkcf.org/our-scholarships/college-scholarship/", priority: "high" },
  { id: "uc-decisions", month: 4, day: 1, label: "UC Admission Decisions (approx.)", description: "UC campuses release transfer admission decisions in late March–April.", category: "decision", url: "https://apply.universityofcalifornia.edu", priority: "medium" },
  { id: "csu-decisions", month: 4, day: 30, label: "CSU Admission Decisions (approx.)", description: "CSU campuses finalize transfer decisions by late April.", category: "decision", url: "https://www.calstate.edu/apply", priority: "medium" },
  { id: "reply-day", month: 5, day: 1, label: "National College Decision Day", description: "Deadline to accept your offer and submit the SIR.", category: "decision", url: "https://admission.universityofcalifornia.edu", priority: "critical" },
  { id: "final-transcript", month: 7, day: 15, label: "Final Official Transcripts Due", description: "Submit final official transcripts to your transfer university.", category: "uc", url: "https://admission.universityofcalifornia.edu", priority: "high" },
];

function deadlineDateForCycle(d: DeadlineSource, cycleYear: number): Date {
  const year = d.month >= 8 ? cycleYear : cycleYear + 1;
  return new Date(year, d.month - 1, d.endDay ?? d.day);
}

export interface UpcomingHit {
  source: DeadlineSource;
  /** ISO yyyy-mm-dd (calendar end of the deadline window) */
  dueIso: string;
  /** which lead-time bucket fired (in days) */
  leadDays: number;
  /** actual whole days until due (>= 0) */
  daysUntil: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * For a given "today" and lead-day buckets [30,14,7,1], return the deadlines
 * that fall exactly within one of those buckets (or earlier if the user just
 * enabled reminders past a bucket).
 *
 * Behavior: a deadline matches the SMALLEST configured lead bucket whose
 * window contains it. This means each (deadline, leadDays) pair fires at
 * most once thanks to the unique index in the DB.
 */
export function computeUpcomingDeadlines(
  today: Date,
  leadBuckets: number[],
): UpcomingHit[] {
  const buckets = [...leadBuckets].sort((a, b) => a - b); // ascending
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Consider both the current academic cycle and the next, since some
  // deadlines (Mar/Apr/May) fall after a Jan reminder still in the same cycle.
  const cycleYears = [
    start.getMonth() >= 7 ? start.getFullYear() : start.getFullYear() - 1,
    start.getMonth() >= 7 ? start.getFullYear() + 1 : start.getFullYear(),
  ];

  const hits: UpcomingHit[] = [];
  for (const d of ANNUAL_DEADLINES) {
    for (const cy of cycleYears) {
      const due = deadlineDateForCycle(d, cy);
      const daysUntil = Math.ceil((due.getTime() - start.getTime()) / DAY_MS);
      if (daysUntil < 0) continue;

      // Find the smallest bucket that "fires" today. A bucket B fires when
      // daysUntil <= B AND daysUntil > previousBucket.
      let chosen: number | null = null;
      for (let i = 0; i < buckets.length; i++) {
        const b = buckets[i]!;
        const prev = i === 0 ? -1 : buckets[i - 1]!;
        if (daysUntil <= b && daysUntil > prev) {
          chosen = b;
          break;
        }
      }
      if (chosen === null) continue;

      const iso = due.toISOString().slice(0, 10);
      hits.push({ source: d, dueIso: iso, leadDays: chosen, daysUntil });
    }
  }
  return hits;
}

export function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
