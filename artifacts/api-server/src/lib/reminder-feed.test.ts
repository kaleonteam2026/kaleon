import { describe, expect, it } from "vitest";
import { buildReminderFeed, type ReminderFeedRow } from "./reminder-feed";

interface Row extends ReminderFeedRow {
  id: number;
}

const NOW = new Date("2026-05-03T12:00:00Z");

describe("buildReminderFeed", () => {
  it("hides reminders with status=done", () => {
    const rows: Row[] = [
      { id: 1, status: "unread" },
      { id: 2, status: "done" },
      { id: 3, status: "read" },
    ];
    const out = buildReminderFeed(rows, NOW);
    expect(out.reminders.map((r) => r.id)).toEqual([1, 3]);
  });

  it("hides snoozed reminders whose snoozeUntil is in the future", () => {
    const future = new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000);
    const rows: Row[] = [
      { id: 1, status: "snoozed", snoozeUntil: future },
      { id: 2, status: "unread" },
    ];
    const out = buildReminderFeed(rows, NOW);
    expect(out.reminders.map((r) => r.id)).toEqual([2]);
  });

  it("shows snoozed reminders whose snoozeUntil is in the past", () => {
    const past = new Date(NOW.getTime() - 60 * 1000);
    const rows: Row[] = [
      { id: 1, status: "snoozed", snoozeUntil: past },
      { id: 2, status: "snoozed", snoozeUntil: null },
    ];
    const out = buildReminderFeed(rows, NOW);
    // both should be visible: past-snoozed and snoozed-with-null-until
    expect(out.reminders.map((r) => r.id).sort()).toEqual([1, 2]);
  });

  it("counts unread only among visible rows", () => {
    const future = new Date(NOW.getTime() + 86_400_000);
    const past = new Date(NOW.getTime() - 86_400_000);
    const rows: Row[] = [
      { id: 1, status: "unread" },
      { id: 2, status: "unread" },
      { id: 3, status: "read" },
      { id: 4, status: "done" }, // hidden, even though not unread
      { id: 5, status: "snoozed", snoozeUntil: future }, // hidden
      { id: 6, status: "snoozed", snoozeUntil: past }, // visible, not unread
    ];
    const out = buildReminderFeed(rows, NOW);
    expect(out.unread).toBe(2);
    expect(out.reminders.map((r) => r.id).sort()).toEqual([1, 2, 3, 6]);
  });

  it("returns zero unread and empty list for an empty input", () => {
    expect(buildReminderFeed([], NOW)).toEqual({ unread: 0, reminders: [] });
  });

  it("does not mutate the input array", () => {
    const rows: Row[] = [
      { id: 1, status: "done" },
      { id: 2, status: "unread" },
    ];
    const snapshot = [...rows];
    buildReminderFeed(rows, NOW);
    expect(rows).toEqual(snapshot);
  });
});
