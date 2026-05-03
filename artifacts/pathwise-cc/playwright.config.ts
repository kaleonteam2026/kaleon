import { defineConfig, devices } from "@playwright/test";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// Dedicated test ports — kept separate from the long-running dev workflow so
// the e2e backdoor routes (`/api/__test__/*`) are only reachable from this
// isolated test stack.
const API_PORT = process.env["E2E_API_PORT"] ?? "8181";
const WEB_PORT = process.env["E2E_WEB_PORT"] ?? "19281";
const API_BASE = `http://localhost:${API_PORT}`;
const BASE_URL = process.env["E2E_BASE_URL"] ?? `http://localhost:${WEB_PORT}`;
const SECRET_FILE = process.env["E2E_SECRET_FILE"] ?? "/tmp/pathwise-e2e-secret";

// Generate a fresh secret per test run (or honor a caller-supplied one) and
// persist it to disk so the spec, the api-server child process, and any other
// test helpers all read the same value. webServer commands are spawned before
// globalSetup, so the secret has to be created here at config load time.
const E2E_SECRET = process.env["E2E_TEST_SECRET"] ?? randomBytes(24).toString("hex");
process.env["E2E_TEST_SECRET"] = E2E_SECRET;
mkdirSync(dirname(SECRET_FILE), { recursive: true });
writeFileSync(SECRET_FILE, E2E_SECRET, { encoding: "utf8" });

function resolveChromium(): string | undefined {
  const fromEnv = process.env["PLAYWRIGHT_CHROMIUM_PATH"];
  if (fromEnv) return fromEnv;
  try {
    return execSync("command -v chromium", { encoding: "utf8" }).trim() || undefined;
  } catch {
    try {
      return execSync("command -v chromium-browser", { encoding: "utf8" }).trim() || undefined;
    } catch {
      return undefined;
    }
  }
}

const chromiumPath = resolveChromium();

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          ...(chromiumPath ? { executablePath: chromiumPath } : {}),
          args: ["--no-sandbox"],
        },
      },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @workspace/api-server run dev",
      env: {
        PORT: API_PORT,
        ENABLE_E2E_TEST_ROUTES: "true",
        // The secret is generated in globalSetup and passed through the env;
        // playwright propagates parent-process env into webServer commands.
        E2E_TEST_SECRET: E2E_SECRET,
        E2E_SECRET_FILE: SECRET_FILE,
      },
      url: `${API_BASE}/api/healthz`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "pnpm --filter @workspace/pathwise-cc run dev",
      env: {
        PORT: WEB_PORT,
        BASE_PATH: "/",
        E2E_API_TARGET: API_BASE,
      },
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
