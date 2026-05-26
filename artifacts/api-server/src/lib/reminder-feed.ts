export type ReminderStatus = "unread" | "read" | "snoozed" | "done";

const REMINDER_STATUSES = new Set<ReminderStatus>([
  "unread",
  "read",
  "snoozed",
  "done",
]);

export interface ReminderFeedRow {
  status: ReminderStatus;
  snoozeUntil?: Date | null;
}

/** Map DB text `status` to the feed union (values are enforced by app writes). */
export function toReminderFeedRows<T extends { status: string; snoozeUntil?: Date | null }>(
  rows: T[],
): Array<T & ReminderFeedRow> {
  return rows.map((row) => {
    if (!REMINDER_STATUSES.has(row.status as ReminderStatus)) {
      throw new Error(`Invalid reminder status: ${row.status}`);
    }
    return row as T & ReminderFeedRow;
  });
}

export interface FeedSummary<T extends ReminderFeedRow> {
  unread: number;
  reminders: T[];
}

/**
 * Filter and summarize a list of reminder rows for the in-app feed.
 *
 * Hides rows that are `done` or `snoozed` with a `snoozeUntil` strictly in the
 * future. Past-snoozed rows reappear in the feed. The unread counter only
 * counts visible rows whose status is exactly `unread`.
 */
export function buildReminderFeed<T extends ReminderFeedRow>(
  rows: T[],
  now: Date,
): FeedSummary<T> {
  const visible = rows.filter((r) => {
    if (r.status === "done") return false;
    if (r.status === "snoozed" && r.snoozeUntil && r.snoozeUntil > now) {
      return false;
    }
    return true;
  });
  const unread = visible.filter((r) => r.status === "unread").length;
  return { unread, reminders: visible };
}
