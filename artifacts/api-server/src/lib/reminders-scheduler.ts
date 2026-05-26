import {
  db,
  studentProfilesTable,
  reminderPrefsTable,
  remindersTable,
  usersTable,
  type ReminderPrefs,
  type StudentProfile,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getAnthropic, isAnthropicConfigured } from "@workspace/integrations-anthropic-ai";
import { enforceAiCap } from "./global-cap";
import { computeUpcomingDeadlines, todayKey, type UpcomingHit } from "./deadlines";
import { sendEmail, isEmailConfigured } from "./email";
import { logger } from "./logger";
import { profileLocale, localePromptSuffix } from "./locale";

const REQUIRED_PROFILE_FIELDS: Array<keyof StudentProfile> = [
  "intendedMajor",
  "careerGoal",
  "transferTimeline",
  "geographicPreference",
];

function missingProfileFields(p: StudentProfile): string[] {
  return REQUIRED_PROFILE_FIELDS
    .filter((k) => {
      const v = p[k];
      return v === null || v === undefined || (typeof v === "string" && !v.trim());
    })
    .map((k) => String(k));
}

interface DraftedMessage {
  deadlineId: string;
  leadDays: number;
  title: string;
  body: string;
}

async function draftMessages(
  profile: StudentProfile,
  hits: UpcomingHit[],
): Promise<DraftedMessage[]> {
  // ai-secretary BLUF style: bottom line first, 1–2 sentences, personalized.
  const missing = missingProfileFields(profile);
  const studentName = profile.fullName?.split(" ")[0] ?? "there";

  const locale = profileLocale(profile);
  const system = `You are an academic deadline reminder writer for California community college transfer students. Use BLUF (bottom line up front) style. For EACH reminder, write a short, personalized, action-oriented note (max 2 sentences, max 280 chars). Reference the student's missing profile fields when relevant. Never invent facts. Output ONLY valid JSON.${localePromptSuffix(locale)}`;

  const user = `Student: ${studentName}
Major: ${profile.intendedMajor ?? "(not set)"}
Transfer timeline: ${profile.transferTimeline ?? "(not set)"}
Target geography: ${profile.geographicPreference ?? "(not set)"}
Profile fields still blank: ${missing.length > 0 ? missing.join(", ") : "none"}

Upcoming reminders to draft:
${JSON.stringify(
  hits.map((h) => ({
    deadlineId: h.source.id,
    label: h.source.label,
    daysUntil: h.daysUntil,
    leadDays: h.leadDays,
    category: h.source.category,
    priority: h.source.priority,
  })),
  null,
  2,
)}

Return ONLY JSON of the form:
{ "messages": [ { "deadlineId": "...", "leadDays": 14, "title": "TAG due in 14 days", "body": "..." } ] }
The "title" should be short (max 60 chars). Include exactly one entry per reminder.`;

  if (!isAnthropicConfigured()) {
    return hits.map((h) => ({
      deadlineId: h.source.id,
      leadDays: h.leadDays,
      title: `${h.source.label} in ${h.daysUntil}d`,
      body: `${h.source.label} is in ${h.daysUntil} days. ${
        missing.length > 0 ? `Your ${missing.join(", ")} are still blank.` : "Stay on track."
      }`,
    }));
  }

  try {
    const r = await getAnthropic().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
    const parsed = JSON.parse(cleaned) as { messages?: DraftedMessage[] };
    return Array.isArray(parsed.messages) ? parsed.messages : [];
  } catch (err) {
    logger.warn({ err }, "Reminder draft generation failed; using fallbacks");
    return hits.map((h) => ({
      deadlineId: h.source.id,
      leadDays: h.leadDays,
      title: `${h.source.label} in ${h.daysUntil}d`,
      body: `${h.source.label} is in ${h.daysUntil} days. ${
        missing.length > 0 ? `Your ${missing.join(", ")} are still blank.` : "Stay on track."
      }`,
    }));
  }
}

export interface RunResult {
  scanned: number;
  processed: number;
  remindersCreated: number;
  emailsSent: number;
  capExhausted: boolean;
}

interface RunOptions {
  forceForProfileId?: number; // if set, ignore lastRunDay throttle for this profile
  now?: Date;
}

/**
 * Daily reminder build job. For each opted-in profile that hasn't been
 * processed today, computes upcoming deadlines, drafts copy via one batched
 * AI call (1 cap unit), inserts in-app rows, and dispatches emails if
 * configured + opted in.
 */
export async function runReminderJob(opts: RunOptions = {}): Promise<RunResult> {
  const now = opts.now ?? new Date();
  const today = todayKey(now);
  const result: RunResult = {
    scanned: 0,
    processed: 0,
    remindersCreated: 0,
    emailsSent: 0,
    capExhausted: false,
  };

  let profileQuery = db.select().from(studentProfilesTable);
  const profiles = opts.forceForProfileId
    ? await profileQuery.where(eq(studentProfilesTable.id, opts.forceForProfileId))
    : await profileQuery;
  result.scanned = profiles.length;

  for (const profile of profiles) {
    const [prefs] = await db
      .select()
      .from(reminderPrefsTable)
      .where(eq(reminderPrefsTable.profileId, profile.id));
    if (!prefs) continue; // not opted in
    if (prefs.enabled !== "true") continue;
    if (!opts.forceForProfileId && prefs.lastRunDay === today) continue;

    const hits = computeUpcomingDeadlines(now, prefs.leadDays);
    if (hits.length === 0) {
      await db
        .update(reminderPrefsTable)
        .set({ lastRunDay: today, updatedAt: new Date() })
        .where(eq(reminderPrefsTable.id, prefs.id));
      continue;
    }

    // De-duplicate against already-existing (profile, deadlineId, leadDays).
    const existing = await db
      .select()
      .from(remindersTable)
      .where(eq(remindersTable.profileId, profile.id));
    // Dedupe key includes deadline_date so the same deadline_id (e.g. "tag")
    // can fire again in the next annual cycle.
    const existingKeys = new Set(existing.map((r) => `${r.deadlineId}|${r.leadDays}|${r.deadlineDate}`));
    const newHits = hits.filter((h) => !existingKeys.has(`${h.source.id}|${h.leadDays}|${h.dueIso}`));
    // If user has both channels off there's nothing to deliver — skip the AI
    // call entirely (don't burn a global cap unit) but still mark today as
    // processed so we don't re-evaluate every hour.
    const wantInApp = prefs.channelInApp === "true";
    const wantEmail = prefs.channelEmail === "true";
    if (newHits.length === 0 || (!wantInApp && !wantEmail)) {
      await db
        .update(reminderPrefsTable)
        .set({ lastRunDay: today, updatedAt: new Date() })
        .where(eq(reminderPrefsTable.id, prefs.id));
      continue;
    }

    // ── One AI cap unit per user-day batch (per-user + global) ────────────
    const cap = await enforceAiCap(profile.userId, "reminders");
    if (!cap.allowed) {
      logger.warn(
        { profileId: profile.id, userId: profile.userId, reason: cap.reason },
        "Reminder job blocked by AI cap; will retry tomorrow",
      );
      // Only stop the whole job for the global cap — a single user hitting
      // their personal cap shouldn't halt reminders for everyone else.
      if (cap.reason === "global") {
        result.capExhausted = true;
        break;
      }
      continue;
    }

    const drafted = await draftMessages(profile, newHits);
    const draftMap = new Map(drafted.map((d) => [`${d.deadlineId}|${d.leadDays}`, d]));

    for (const h of newHits) {
      const key = `${h.source.id}|${h.leadDays}`;
      const draft = draftMap.get(key);
      const title = draft?.title?.trim() || `${h.source.label} in ${h.daysUntil}d`;
      const body = draft?.body?.trim() ||
        `${h.source.label} is ${h.daysUntil} days away. ${h.source.description}`;

      try {
        await db
          .insert(remindersTable)
          .values({
            profileId: profile.id,
            deadlineId: h.source.id,
            deadlineLabel: h.source.label,
            deadlineDate: h.dueIso,
            leadDays: h.leadDays,
            category: h.source.category,
            priority: h.source.priority,
            url: h.source.url,
            title,
            body,
          })
          .onConflictDoNothing();
        result.remindersCreated++;
      } catch (err) {
        logger.warn({ err, profileId: profile.id, deadlineId: h.source.id }, "Reminder insert failed");
      }
    }

    // ── Email dispatch (graceful no-op when not configured) ────────────────
    if (wantEmail && isEmailConfigured()) {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, profile.userId));
      if (user?.email) {
        const lines = newHits.map((h) => {
          const k = `${h.source.id}|${h.leadDays}`;
          const d = draftMap.get(k);
          return `• ${d?.title ?? h.source.label}\n  ${d?.body ?? h.source.description}\n  Due: ${h.dueIso} (${h.daysUntil}d) — ${h.source.url}`;
        });
        const r = await sendEmail({
          to: user.email,
          subject: `[ACTION] ${newHits.length} transfer deadline${newHits.length > 1 ? "s" : ""} coming up`,
          text: `Hi ${profile.fullName?.split(" ")[0] ?? "there"},\n\nYour upcoming California transfer deadlines:\n\n${lines.join("\n\n")}\n\nManage these reminders in your DYP profile.\n`,
        });
        if (r.ok) {
          result.emailsSent++;
          // Mark as emailed for these IDs.
          for (const h of newHits) {
            await db
              .update(remindersTable)
              .set({ emailSent: "true" })
              .where(
                and(
                  eq(remindersTable.profileId, profile.id),
                  eq(remindersTable.deadlineId, h.source.id),
                  eq(remindersTable.leadDays, h.leadDays),
                  eq(remindersTable.deadlineDate, h.dueIso),
                ),
              );
          }
        }
      }
    }

    await db
      .update(reminderPrefsTable)
      .set({ lastRunDay: today, updatedAt: new Date() })
      .where(eq(reminderPrefsTable.id, prefs.id));

    result.processed++;
  }

  logger.info({ result }, "Reminder job complete");
  return result;
}

// ── Daily interval ─────────────────────────────────────────────────────────
let started = false;
const ONE_HOUR = 60 * 60 * 1000;

/**
 * Wakes once an hour. Runs the reminder job; the per-profile lastRunDay
 * guard ensures each user is processed at most once per UTC day.
 */
export function startReminderScheduler(): void {
  if (started) return;
  if (process.env.NODE_ENV === "test") return;
  started = true;

  // Run shortly after boot, then hourly.
  const kick = () => {
    runReminderJob().catch((err) => logger.error({ err }, "Reminder job threw"));
  };
  setTimeout(kick, 30_000);
  setInterval(kick, ONE_HOUR);
  logger.info("Reminder scheduler started (hourly tick, per-user-day batching)");
}
