import { describe, expect, it } from "vitest";
import { computeUpcomingDeadlines } from "./deadlines";

const BUCKETS = [30, 14, 7, 1];

function findHit(
  hits: ReturnType<typeof computeUpcomingDeadlines>,
  deadlineId: string,
  dueIso?: string,
) {
  return hits.find(
    (h) => h.source.id === deadlineId && (dueIso ? h.dueIso === dueIso : true),
  );
}

describe("computeUpcomingDeadlines — bucket boundaries", () => {
  // UC application deadline: Nov 30. Use it to probe the 30-day boundary.
  it("30-day bucket: 29 and 30 days out fire bucket 30; 31 does not fire", () => {
    // 31 days out: Oct 30 -> Nov 30
    const at31 = computeUpcomingDeadlines(new Date(2026, 9, 30), BUCKETS);
    expect(findHit(at31, "uc-deadline", "2026-11-30")).toBeUndefined();

    // 30 days out: Oct 31 -> Nov 30
    const at30 = computeUpcomingDeadlines(new Date(2026, 9, 31), BUCKETS);
    const hit30 = findHit(at30, "uc-deadline", "2026-11-30");
    expect(hit30?.leadDays).toBe(30);
    expect(hit30?.daysUntil).toBe(30);

    // 29 days out: Nov 1 -> Nov 30
    const at29 = computeUpcomingDeadlines(new Date(2026, 10, 1), BUCKETS);
    const hit29 = findHit(at29, "uc-deadline", "2026-11-30");
    expect(hit29?.leadDays).toBe(30);
    expect(hit29?.daysUntil).toBe(29);
  });

  it("14-day bucket: 13 and 14 days out fire bucket 14; 15 still fires bucket 30", () => {
    // 15 days out (Nov 15 -> Nov 30): falls in 30-day bucket, NOT 14
    const at15 = computeUpcomingDeadlines(new Date(2026, 10, 15), BUCKETS);
    expect(findHit(at15, "uc-deadline")?.leadDays).toBe(30);

    // 14 days out (Nov 16 -> Nov 30): exactly at bucket 14
    const at14 = computeUpcomingDeadlines(new Date(2026, 10, 16), BUCKETS);
    expect(findHit(at14, "uc-deadline")?.leadDays).toBe(14);

    // 13 days out (Nov 17 -> Nov 30)
    const at13 = computeUpcomingDeadlines(new Date(2026, 10, 17), BUCKETS);
    expect(findHit(at13, "uc-deadline")?.leadDays).toBe(14);
  });

  it("7-day bucket: 6 and 7 fire bucket 7; 8 falls in bucket 14", () => {
    const at8 = computeUpcomingDeadlines(new Date(2026, 10, 22), BUCKETS);
    expect(findHit(at8, "uc-deadline")?.leadDays).toBe(14);

    const at7 = computeUpcomingDeadlines(new Date(2026, 10, 23), BUCKETS);
    expect(findHit(at7, "uc-deadline")?.leadDays).toBe(7);

    const at6 = computeUpcomingDeadlines(new Date(2026, 10, 24), BUCKETS);
    expect(findHit(at6, "uc-deadline")?.leadDays).toBe(7);
  });

  it("1-day bucket: 0 and 1 fire bucket 1; 2 falls in bucket 7; negative skipped", () => {
    const at2 = computeUpcomingDeadlines(new Date(2026, 10, 28), BUCKETS);
    expect(findHit(at2, "uc-deadline")?.leadDays).toBe(7);

    const at1 = computeUpcomingDeadlines(new Date(2026, 10, 29), BUCKETS);
    expect(findHit(at1, "uc-deadline")?.leadDays).toBe(1);

    const at0 = computeUpcomingDeadlines(new Date(2026, 10, 30), BUCKETS);
    expect(findHit(at0, "uc-deadline")?.leadDays).toBe(1);
    expect(findHit(at0, "uc-deadline")?.daysUntil).toBe(0);

    // Day after deadline: should NOT fire any bucket
    const after = computeUpcomingDeadlines(new Date(2026, 11, 1), BUCKETS);
    expect(findHit(after, "uc-deadline", "2026-11-30")).toBeUndefined();
  });

  it("respects custom lead-bucket subsets (only [7,1])", () => {
    // 14 days out from Nov 30 — would fire 14 with full set, but [7,1] should not fire
    const at14 = computeUpcomingDeadlines(new Date(2026, 10, 16), [7, 1]);
    expect(findHit(at14, "uc-deadline")).toBeUndefined();

    const at5 = computeUpcomingDeadlines(new Date(2026, 10, 25), [7, 1]);
    expect(findHit(at5, "uc-deadline")?.leadDays).toBe(7);
  });
});

describe("computeUpcomingDeadlines — academic-cycle wrap", () => {
  it("from August, March deadlines map to the FOLLOWING calendar year", () => {
    // Aug 1, 2026 — current cycle is Aug 2026 → Jul 2027.
    // jkc (Mar 1) and cal-grant (Mar 2) should be in 2027, not 2026.
    // No bucket fires from this far out, so verify mapping by stepping closer.
    // 30 days out from Mar 2, 2027 = Jan 31, 2027.
    const hits = computeUpcomingDeadlines(new Date(2027, 0, 31), BUCKETS);
    const calGrant = findHit(hits, "cal-grant");
    expect(calGrant?.dueIso).toBe("2027-03-02");
    expect(calGrant?.leadDays).toBe(30);
    expect(calGrant?.daysUntil).toBe(30);
  });

  it("from August, May deadlines (reply-day) map to following May", () => {
    // Apr 1, 2027 -> May 1, 2027 is exactly 30 days; this is still in the
    // cycle that began Aug 2026.
    const hits = computeUpcomingDeadlines(new Date(2027, 3, 1), BUCKETS);
    const reply = findHit(hits, "reply-day");
    expect(reply?.dueIso).toBe("2027-05-01");
    expect(reply?.leadDays).toBe(30);
  });

  it("a deadline in the past current cycle is skipped, but next cycle's instance can fire", () => {
    // Sep 1, 2026: TAG window already passed for cycle starting Aug 2026?
    // TAG endDay=30, month=9 (Sept). On Sep 1, 2026, due is Sept 30, 2026,
    // which is 29 days out — fires bucket 30. The next year's instance
    // (Sept 30, 2027) is too far out.
    const hits = computeUpcomingDeadlines(new Date(2026, 8, 1), BUCKETS);
    const tagHits = hits.filter((h) => h.source.id === "tag");
    expect(tagHits).toHaveLength(1);
    expect(tagHits[0]!.dueIso).toBe("2026-09-30");

    // Oct 1, 2026: TAG 2026 already past (skipped), TAG 2027 too far.
    const hits2 = computeUpcomingDeadlines(new Date(2026, 9, 1), BUCKETS);
    expect(hits2.filter((h) => h.source.id === "tag")).toHaveLength(0);
  });
});
