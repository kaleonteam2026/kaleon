import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

// End-to-end coverage for the reminder system. This spec drives the real React
// app served by Vite AND the real API server: it logs in (via a dev-only test
// endpoint that bypasses the OIDC round-trip), creates a profile, turns
// reminder prefs on, hits POST /reminders/:id/run, then asserts the bell
// reflects whatever the live GET /reminders/:id endpoint returns.
//
// To exercise the badge/dropdown rendering paths deterministically (the live
// /run won't necessarily produce reminders depending on today's date), a
// separate dev-only endpoint seeds reminder rows directly into the DB.

import { readFileSync } from "node:fs";

// The page and /api are same-origin (Vite dev server with /api → test
// api-server proxy, both spawned by the playwright `webServer` config).
const SECRET_FILE = process.env["E2E_SECRET_FILE"] ?? "/tmp/pathwise-e2e-secret";
const E2E_SECRET = (() => {
  if (process.env["E2E_TEST_SECRET"]) return process.env["E2E_TEST_SECRET"];
  try {
    return readFileSync(SECRET_FILE, "utf8").trim();
  } catch {
    throw new Error(
      `E2E secret not found. Expected env E2E_TEST_SECRET or file ${SECRET_FILE}.`,
    );
  }
})();
const E2E_HEADERS = { "x-e2e-test-secret": E2E_SECRET };
const USER_ID_PREFIX = "e2e_bell";

interface SeededProfile {
  userId: string;
  profileId: number;
}

function apiUrl(path: string): string {
  return path; // baseURL set in playwright.config.ts handles the origin
}

async function login(api: APIRequestContext, userId: string) {
  const r = await api.post(apiUrl(`/api/__test__/login`), {
    headers: E2E_HEADERS,
    data: { id: userId, email: `${userId}@e2e.local`, firstName: "Remi", lastName: "Tester" },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
}

async function createProfile(api: APIRequestContext): Promise<number> {
  const r = await api.post(apiUrl(`/api/profiles`), {
    data: { fullName: "Remi Tester" },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
  const body = (await r.json()) as { id: number };
  return body.id;
}

async function enablePrefs(api: APIRequestContext, profileId: number) {
  const r = await api.patch(apiUrl(`/api/reminders/prefs/${profileId}`), {
    data: { enabled: true, channelInApp: true, channelEmail: false, leadDays: [30, 14, 7, 1] },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
}

async function runJob(api: APIRequestContext, profileId: number) {
  const r = await api.post(apiUrl(`/api/reminders/${profileId}/run`), { data: {} });
  expect(r.ok(), await r.text()).toBeTruthy();
}

async function clearReminders(api: APIRequestContext, profileId: number) {
  // /run may have produced reminders depending on today's date and the
  // synthetic deadline windows. Clear them so the per-test assertions are
  // exactly what the spec seeded.
  const r = await api.delete(apiUrl(`/api/__test__/reminders/${profileId}/all`), {
    headers: E2E_HEADERS,
  });
  expect(r.ok(), await r.text()).toBeTruthy();
}

async function seedReminders(
  api: APIRequestContext,
  profileId: number,
  reminders: Array<Record<string, unknown>>,
) {
  const r = await api.post(
    apiUrl(`/api/__test__/reminders/${profileId}/seed`),
    { headers: E2E_HEADERS, data: { reminders } },
  );
  expect(r.ok(), await r.text()).toBeTruthy();
}

async function cleanup(api: APIRequestContext, userId: string) {
  await api.post(apiUrl(`/api/__test__/cleanup`), {
    headers: E2E_HEADERS,
    data: { userId },
  });
}

async function provision(
  api: APIRequestContext,
  page: Page,
  suffix: string,
): Promise<SeededProfile> {
  const userId = `${USER_ID_PREFIX}_${suffix}_${Date.now()}`;
  await login(api, userId);
  const profileId = await createProfile(api);
  await enablePrefs(api, profileId);
  await runJob(api, profileId);
  // Wipe anything /run produced so the assertions reflect only what each
  // test seeds — keeps the suite deterministic regardless of calendar date.
  await clearReminders(api, profileId);

  // Mirror the API's session cookie onto the Page's browser context so the
  // React app sees the authenticated user. Playwright's `request` fixture uses
  // a separate cookie jar from the browser pages.
  const state = await api.storageState();
  const sid = state.cookies.find((c) => c.name === "sid");
  expect(sid, "expected sid cookie from /api/__test__/login").toBeTruthy();
  await page.context().addCookies([
    {
      name: "sid",
      value: sid!.value,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
  return { userId, profileId };
}

async function openDashboard(page: Page, profileId: number) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate((id) => {
    localStorage.setItem("dyp_active_profile_id", String(id));
  }, profileId);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.locator("nav").first().waitFor({ state: "attached", timeout: 15_000 });
}

test.describe("notification bell (e2e against real API)", () => {
  test("login → enable prefs → /run → bell shows badge + dropdown for seeded reminders", async ({
    page,
    request,
  }) => {
    const { userId, profileId } = await provision(request, page, "badge");
    try {
      await seedReminders(request, profileId, [
        {
          deadlineId: "tag-2026",
          deadlineLabel: "TAG Filing Window",
          deadlineDate: "2026-09-30",
          leadDays: 14,
          category: "tag",
          priority: "critical",
          title: "TAG due in 14 days",
          body: "Submit your TAG application.",
          status: "unread",
        },
        {
          deadlineId: "fafsa-2026",
          deadlineLabel: "FAFSA",
          deadlineDate: "2026-10-01",
          leadDays: 7,
          category: "fafsa",
          priority: "high",
          title: "FAFSA opens soon",
          body: "Get ready to file.",
          status: "unread",
        },
      ]);

      await openDashboard(page, profileId);

      const bell = page.locator('nav [data-testid="notification-bell"]').first();
      await expect(bell).toBeVisible();

      const badge = page.locator('nav [data-testid="notification-badge"]').first();
      await expect(badge).toBeVisible();
      await expect(badge).toHaveText("2");

      await bell.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // The two seeded reminders render with snooze + done actions.
      const reminderRows = dialog.locator('[data-testid^="reminder-"]');
      await expect(reminderRows).toHaveCount(2);
      await expect(dialog.locator('[data-testid^="snooze-"]').first()).toBeVisible();
      await expect(dialog.locator('[data-testid^="done-"]').first()).toBeVisible();
    } finally {
      await cleanup(request, userId);
    }
  });

  test("empty feed: no badge, dropdown opens with empty state", async ({ page, request }) => {
    const { userId, profileId } = await provision(request, page, "empty");
    try {
      await openDashboard(page, profileId);

      const bell = page.locator('nav [data-testid="notification-bell"]').first();
      await expect(bell).toBeVisible();
      await expect(page.locator('nav [data-testid="notification-badge"]')).toHaveCount(0);

      await bell.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('[data-testid^="reminder-"]')).toHaveCount(0);
    } finally {
      await cleanup(request, userId);
    }
  });

  test("renders 9+ when unread exceeds 9", async ({ page, request }) => {
    const { userId, profileId } = await provision(request, page, "ninep");
    try {
      const reminders = Array.from({ length: 12 }, (_, i) => ({
        deadlineId: `e2e-many-${i}`,
        deadlineLabel: "Stacked",
        deadlineDate: "2026-09-30",
        leadDays: 30,
        category: "tag",
        priority: "high",
        title: `Reminder ${i + 1}`,
        body: "Many reminders to test the 9+ cap.",
        status: "unread",
      }));
      await seedReminders(request, profileId, reminders);

      await openDashboard(page, profileId);

      const badge = page.locator('nav [data-testid="notification-badge"]').first();
      await expect(badge).toBeVisible();
      await expect(badge).toHaveText("9+");
    } finally {
      await cleanup(request, userId);
    }
  });
});
