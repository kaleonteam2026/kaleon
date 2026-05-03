import { Router } from "express";
import {
  db,
  usersTable,
  studentProfilesTable,
  reminderPrefsTable,
  remindersTable,
  sessionsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { createSession, SESSION_COOKIE, SESSION_TTL } from "../lib/auth";

const router = Router();

// Test routes are mounted ONLY when the operator explicitly opts in via the
// `ENABLE_E2E_TEST_ROUTES=true` env var AND a non-empty `E2E_TEST_SECRET` is
// configured. Each request must additionally carry a matching
// `x-e2e-test-secret` header. Without all three conditions the routes return
// 404 and behave as if they don't exist. This deliberately avoids auto-enabling
// the test backdoor in any environment (dev, preview, etc.) just because
// NODE_ENV !== "production".
const ENABLED = process.env.ENABLE_E2E_TEST_ROUTES === "true";
const SECRET = process.env.E2E_TEST_SECRET ?? "";

router.use((req, res, next) => {
  if (!ENABLED || !SECRET) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const provided = req.headers["x-e2e-test-secret"];
  if (typeof provided !== "string" || provided !== SECRET) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  next();
});

router.post("/__test__/login", async (req, res) => {
  const body = (req.body ?? {}) as {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  const id = body.id ?? `e2e_${Date.now()}`;
  const email = body.email ?? `${id}@e2e.local`;
  const firstName = body.firstName ?? "E2E";
  const lastName = body.lastName ?? "User";

  await db
    .insert(usersTable)
    .values({ id, email, firstName, lastName })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { email, firstName, lastName, updatedAt: new Date() },
    });

  const sid = await createSession({
    user: { id, email, firstName, lastName, profileImageUrl: null },
    access_token: "e2e-test-token",
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  });

  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
  res.json({ ok: true, user: { id, email, firstName, lastName } });
});

router.post("/__test__/reminders/:profileId/seed", async (req, res) => {
  const profileId = parseInt(req.params.profileId, 10);
  if (!Number.isFinite(profileId)) {
    res.status(400).json({ error: "bad profileId" });
    return;
  }
  const body = (req.body ?? {}) as {
    reminders?: Array<{
      deadlineId?: string;
      deadlineLabel?: string;
      deadlineDate?: string;
      leadDays?: number;
      category?: string;
      priority?: string;
      url?: string | null;
      title?: string;
      body?: string;
      status?: string;
    }>;
  };
  const inputs = body.reminders ?? [];
  const rows = inputs.map((r, i) => ({
    profileId,
    deadlineId: r.deadlineId ?? `e2e-${Date.now()}-${i}`,
    deadlineLabel: r.deadlineLabel ?? "E2E Deadline",
    deadlineDate: r.deadlineDate ?? "2026-09-30",
    leadDays: r.leadDays ?? 14,
    category: r.category ?? "tag",
    priority: r.priority ?? "high",
    url: r.url ?? null,
    title: r.title ?? `E2E Reminder ${i + 1}`,
    body: r.body ?? "Seeded for testing.",
    status: r.status ?? "unread",
  }));
  if (rows.length > 0) {
    await db.insert(remindersTable).values(rows);
  }
  res.json({ ok: true, inserted: rows.length });
});

router.delete("/__test__/reminders/:profileId/all", async (req, res) => {
  const profileId = parseInt(req.params.profileId, 10);
  if (!Number.isFinite(profileId)) {
    res.status(400).json({ error: "bad profileId" });
    return;
  }
  const result = await db
    .delete(remindersTable)
    .where(eq(remindersTable.profileId, profileId));
  res.json({ ok: true, deleted: result.rowCount ?? null });
});

router.post("/__test__/cleanup", async (req, res) => {
  const body = (req.body ?? {}) as { userId?: string };
  if (!body.userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const profiles = await db
    .select({ id: studentProfilesTable.id })
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, body.userId));
  for (const p of profiles) {
    await db.delete(remindersTable).where(eq(remindersTable.profileId, p.id));
    await db.delete(reminderPrefsTable).where(eq(reminderPrefsTable.profileId, p.id));
    await db.delete(studentProfilesTable).where(eq(studentProfilesTable.id, p.id));
  }
  // Drop any sessions that reference this user so test-only sessions don't
  // accumulate in the sessions table.
  await db
    .delete(sessionsTable)
    .where(sql`${sessionsTable.sess}->'user'->>'id' = ${body.userId}`);
  await db.delete(usersTable).where(eq(usersTable.id, body.userId));
  res.json({ ok: true, profiles: profiles.length });
});

export default router;
