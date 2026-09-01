import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SHOTS = path.join(os.tmpdir(), "kaleon-verify-shots");
fs.mkdirSync(SHOTS, { recursive: true });
const EXE = "C:/Users/Omar/AppData/Local/ms-playwright/chromium-1178/chrome-win/chrome.exe";
const children = [];

function startVite(port, bypass) {
  const child = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port)], {
    env: { ...process.env, VITE_AUTH_BYPASS: bypass ? "true" : "false" },
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  child.stdout.on("data", d => process.stdout.write(`[vite:${port}] ${d}`));
  child.stderr.on("data", d => process.stdout.write(`[vite:${port}!] ${d}`));
  return child;
}

async function up(url) {
  try { const r = await fetch(url); return r.status < 500; } catch { return false; }
}
async function waitUp(url, ms = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(url); if (r.status < 500) return true; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  for (const [port, bypass] of [[5174, true], [5175, false]]) {
    const base = `http://127.0.0.1:${port}`;
    if (await up(base)) {
      console.log(`Dev server ${base} already up (bypass=${bypass})`);
    } else {
      console.log(`Starting dev server ${base} (bypass=${bypass})...`);
      startVite(port, bypass);
    }
  }
  const okA = await waitUp("http://127.0.0.1:5174");
  const okB = await waitUp("http://127.0.0.1:5175");
  console.log("BYPASS(5174) ready:", okA, "| AUTH(5175) ready:", okB);

  const browser = await chromium.launch({ executablePath: EXE, headless: true });

  // ---- Part A: bypass server ----
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errs = [];
    page.on("pageerror", e => errs.push(String(e)));
    page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });

    await page.goto("http://127.0.0.1:5174/onboarding", { waitUntil: "networkidle" });
    await page.waitForTimeout(1800);
    console.log("\n=== A) /onboarding (bypass) ===");
    console.log("URL:", page.url());
    const intro = await page.locator("body").innerText();
    const g = (intro.match(/Hi [^\n!]*!/i) || [""])[0];
    console.log("GREETING:", JSON.stringify(g));
    console.log("Contains 'Student':", /Student/i.test(intro));
    await page.screenshot({ path: path.join(SHOTS, "a-onboarding.png") });
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errs = [];
    page.on("pageerror", e => errs.push(String(e)));
    await page.goto("http://127.0.0.1:5174/courses/1", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    console.log("\n=== A2) /courses/1 nav (bypass) ===");
    const nav = await page.locator("nav[aria-label]").allInnerTexts();
    console.log("NAV AREAS:", JSON.stringify(nav.map(t => t.trim().replace(/\n+/g, " / ").slice(0, 250))));
    const body = await page.locator("body").innerText();
    console.log("Contains 'Student':", /Student/i.test(body));
    await page.screenshot({ path: path.join(SHOTS, "a2-courses.png") });
    await page.close();
  }

  // ---- Part B: dev:auth server, signup form ----
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errs = [];
    page.on("pageerror", e => errs.push(String(e)));

    await page.goto("http://127.0.0.1:5175/auth?mode=signup", { waitUntil: "networkidle" });
    await page.waitForSelector('form input[type="text"]', { timeout: 20000 });
    await page.waitForTimeout(600);
    console.log("\n=== B) /auth signup (dev:auth, no supabase) ===");
    console.log("URL:", page.url());

    const name = page.locator('form input[type="text"]');
    const submit = page.locator('form button[type="submit"]');
    console.log("Submit label:", JSON.stringify((await submit.innerText()).trim()));
    console.log("Submit DISABLED with empty name:", await submit.isDisabled());

    const labels = await page.locator("form label span").allTextContents();
    console.log("Field labels:", JSON.stringify(labels.map(t => t.trim()).filter(Boolean)));
    const html = await page.locator("form").innerHTML();
    console.log("Required markers present (#ef4444):", html.includes("#ef4444"));

    await name.fill("Alex");
    await page.waitForTimeout(400);
    console.log("After typing 'Alex' -> Submit DISABLED:", await submit.isDisabled());
    await page.screenshot({ path: path.join(SHOTS, "b-signup-name.png") });

    await page.click('button[role="tab"][aria-selected="false"]');
    await page.waitForTimeout(600);
    console.log("--- switched to sign-in tab ---");
    console.log("Signin has name field:", (await page.locator('form input[type="text"]').count()) > 0);
    console.log("Signin submit DISABLED:", await submit.isDisabled());
    await page.screenshot({ path: path.join(SHOTS, "b-signin.png") });
    await page.close();
  }

  await browser.close();
  console.log("\nScreenshots saved to:", SHOTS);
}

main().catch(e => { console.error("FATAL:", e); process.exitCode = 1; })
  .finally(() => {
    for (const c of children) { try { c.kill(); } catch {} }
  });
