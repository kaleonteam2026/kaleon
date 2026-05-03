export type ReminderStatus = "unread" | "read" | "snoozed" | "done";

export interface ReminderFeedRow {
  status: ReminderStatus;
  snoozeUntil?: Date | null;
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
