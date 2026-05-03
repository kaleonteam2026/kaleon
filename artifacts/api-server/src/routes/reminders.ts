import { Router } from "express";
import { db, reminderPrefsTable, remindersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getOwnedProfile } from "../lib/ownership";
import { runReminderJob } from "../lib/reminders-scheduler";
import { buildReminderFeed } from "../lib/reminder-feed";

const router = Router();

const ALLOWED_LEAD_DAYS = new Set([30, 14, 7, 1]);

function sanitizeLeadDays(input: unknown): number[] | null {
  if (!Array.isArray(input)) return null;
  const out: number[] = [];
  for (const v of input) {
    const n = typeof v === "number" ? v : parseInt(String(v), 10);
    if (!ALLOWED_LEAD_DAYS.has(n)) return null;
    if (!out.includes(n)) out.push(n);
  }
  if (out.length === 0) return null;
  return out.sort((a, b) => b - a);
}

async function ensurePrefs(profileId: number) {
  const [existing] = await db
    .select()
    .from(reminderPrefsTable)
    .where(eq(reminderPrefsTable.profileId, profileId));
  if (existing) return existing;
  const [created] = await db
    .insert(reminderPrefsTable)
    .values({ profileId })
    .returning();
  return created!;
}

// ─── Preferences ──────────────────────────────────────────────────────────
router.get("/reminders/prefs/:profileId", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const profileId = parseInt(req.params.profileId);
  const owner = await getOwnedProfile(profileId, req.user.id);
  if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }
  try {
    const prefs = await ensurePrefs(profileId);
    res.json(prefs);
  } catch (err) {
    req.log.error({ err }, "Failed to load reminder prefs");
    res.status(500).json({ error: "Failed to load preferences" });
  }
});

router.patch("/reminders/prefs/:profileId", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const profileId = parseInt(req.params.profileId);
  const owner = await getOwnedProfile(profileId, req.user.id);
  if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

  try {
    await ensurePrefs(profileId);
    const body = req.body as {
      enabled?: boolean;
      channelInApp?: boolean;
      channelEmail?: boolean;
      leadDays?: unknown;
    };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.enabled === "boolean") updates.enabled = body.enabled ? "true" : "false";
    if (typeof body.channelInApp === "boolean") updates.channelInApp = body.channelInApp ? "true" : "false";
    if (typeof body.channelEmail === "boolean") updates.channelEmail = body.channelEmail ? "true" : "false";
    if (body.leadDays !== undefined) {
      const cleaned = sanitizeLeadDays(body.leadDays);
      if (!cleaned) { res.status(400).json({ error: "leadDays must be a non-empty subset of [30,14,7,1]" }); return; }
      updates.leadDays = cleaned;
    }
    const [updated] = await db
      .update(reminderPrefsTable)
      .set(updates)
      .where(eq(reminderPrefsTable.profileId, profileId))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update reminder prefs");
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

// ─── Reminder feed ────────────────────────────────────────────────────────
router.get("/reminders/:profileId", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const profileId = parseInt(req.params.profileId);
  const owner = await getOwnedProfile(profileId, req.user.id);
  if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }
  try {
    // Honor the in-app channel preference — when disabled, the bell shows
    // nothing even if reminder rows exist (rows are still kept for history
    // and email-sent tracking).
    const prefs = await ensurePrefs(profileId);
    if (prefs.channelInApp !== "true" || prefs.enabled !== "true") {
      res.json({ unread: 0, reminders: [] });
      return;
    }
    const rows = await db
      .select()
      .from(remindersTable)
      .where(eq(remindersTable.profileId, profileId))
      .orderBy(desc(remindersTable.createdAt));
    res.json(buildReminderFeed(rows, new Date()));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch reminders");
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

async function getOwnedReminder(reminderId: number, userId: string) {
  if (!Number.isFinite(reminderId)) return { ok: false as const, status: 404 as const };
  const [rem] = await db.select().from(remindersTable).where(eq(remindersTable.id, reminderId));
  if (!rem) return { ok: false as const, status: 404 as const };
  const owner = await getOwnedProfile(rem.profileId, userId);
  if (!owner.ok) return { ok: false as const, status: owner.status };
  return { ok: true as const, reminder: rem };
}

router.post("/reminders/:reminderId/read", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.reminderId);
  const owner = await getOwnedReminder(id, req.user.id);
  if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Reminder not found" }); return; }
  if (owner.reminder.status === "unread") {
    await db.update(remindersTable).set({ status: "read", updatedAt: new Date() }).where(eq(remindersTable.id, id));
  }
  res.json({ ok: true });
});

router.post("/reminders/:reminderId/snooze", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.reminderId);
  const owner = await getOwnedReminder(id, req.user.id);
  if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Reminder not found" }); return; }
  const { days } = req.body as { days?: number };
  const d = typeof days === "number" && days > 0 && days <= 30 ? days : 3;
  const until = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
  await db
    .update(remindersTable)
    .set({ status: "snoozed", snoozeUntil: until, updatedAt: new Date() })
    .where(eq(remindersTable.id, id));
  res.json({ ok: true, snoozeUntil: until.toISOString() });
});

router.post("/reminders/:reminderId/done", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.reminderId);
  const owner = await getOwnedReminder(id, req.user.id);
  if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Reminder not found" }); return; }
  await db
    .update(remindersTable)
    .set({ status: "done", updatedAt: new Date() })
    .where(eq(remindersTable.id, id));
  res.json({ ok: true });
});

// Manual trigger — runs the job immediately for THIS profile only. Useful for
// the user to refresh after changing prefs, and for end-to-end testing.
router.post("/reminders/:profileId/run", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const profileId = parseInt(req.params.profileId);
  const owner = await getOwnedProfile(profileId, req.user.id);
  if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }
  try {
    await ensurePrefs(profileId);
    const result = await runReminderJob({ forceForProfileId: profileId });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Manual reminder run failed");
    res.status(500).json({ error: "Failed to run reminders" });
  }
});

export default router;
