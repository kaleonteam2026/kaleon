// Deadline scheduling helpers. The annual deadline source list lives in
// `@workspace/pathwise-deadlines` and is shared with the React calendar UI.

import {
  ANNUAL_DEADLINES,
  type DeadlineSource,
} from "@workspace/pathwise-deadlines";

export {
  ANNUAL_DEADLINES,
  type DeadlineCategory,
  type DeadlinePriority,
  type DeadlineSource,
} from "@workspace/pathwise-deadlines";

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
