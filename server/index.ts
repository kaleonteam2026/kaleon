import express from "express";
import path from "path";
import { generatePathwaysWithDeepSeek } from "./generate-pathways.ts";
import { parseTranscriptWithAI } from "./transcript-parse.ts";
import { generateGuidebookWithDeepSeek } from "./generate-guidebook.ts";
import { generateRoadmapWithDeepSeek } from "./generate-roadmap.ts";
import { generateTransferabilityAnalysis } from "./transferability-analysis.ts";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DIST = path.resolve(import.meta.dirname, "..", "dist");

app.use(express.json());

// Server-wide request timeout — 5 minutes. Prevents hanging sockets
// if a DeepSeek call never returns.
app.use((req, res, next) => {
  req.setTimeout(300_000, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: "Server timeout" });
    }
  });
  next();
});

// ── Async job store (in-memory, resets on restart) ──────────────────

interface Job {
  status: "pending" | "completed" | "failed";
  result?: unknown;
  error?: string;
}

const jobs = new Map<number, Job>();
let nextJobId = 1;

// ── DeepSeek-powered AI endpoints ──────────────────────────────────────

app.post("/api/profiles/:id/generate-pathways", async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "DeepSeek API key not configured" });
    return;
  }

  const jobId = nextJobId++;
  jobs.set(jobId, { status: "pending" });

  // Respond immediately with the job ID
  res.status(202).json({ jobId });

  // Run generation in background
  try {
    const result = await generatePathwaysWithDeepSeek(
      { profileId: Number(req.params.id), ...req.body },
      apiKey,
    );
    jobs.set(jobId, { status: "completed", result });
  } catch (e) {
    jobs.set(jobId, { status: "failed", error: String(e) });
  }
});

// Poll endpoint for job status
app.get("/api/pathways/jobs/:jobId", (req, res) => {
  const job = jobs.get(Number(req.params.jobId));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  if (job.status === "pending") {
    res.json({ status: "pending" });
  } else if (job.status === "failed") {
    res.json({ status: "failed", error: job.error });
  } else {
    res.json({ status: "completed", result: job.result });
    // Clean up completed jobs after delivering
    jobs.delete(Number(req.params.jobId));
  }
});

app.post("/api/transcript/parse", async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "DeepSeek API key not configured" });
    return;
  }
  const { text, detectMultipleColleges } = req.body ?? {};
  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Missing 'text' field" });
    return;
  }
  try {
    const result = await parseTranscriptWithAI(text, apiKey, !!detectMultipleColleges);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Guidebook generation ───────────────────────────────────────────────

app.post("/api/pathways/:pathwayId/generate-guidebook", async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "DeepSeek API key not configured" });
    return;
  }
  try {
    const result = await generateGuidebookWithDeepSeek(req.body, apiKey);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Roadmap generation ─────────────────────────────────────────────────

app.post("/api/pathways/:pathwayId/generate-roadmap", async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "DeepSeek API key not configured" });
    return;
  }
  try {
    const result = await generateRoadmapWithDeepSeek(req.body, apiKey);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Transferability analysis ────────────────────────────────────────────

app.post("/api/profiles/:id/transferability-analysis", async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "DeepSeek API key not configured" });
    return;
  }
  try {
    const result = await generateTransferabilityAnalysis(req.body, apiKey);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Serve static documents (privacy, terms, etc.) ─────────────────────

app.get("/privacy", (_req, res) => {
  res.sendFile(path.join(DIST, "privacy.pdf"));
});

app.get("/terms", (_req, res) => {
  res.sendFile(path.join(DIST, "terms.pdf"));
});

// ── Serve built frontend ──────────────────────────────────────────────

app.use(express.static(DIST));

// SPA fallback — any unmatched route serves the app shell
app.use((_req, res) => {
  res.sendFile(path.join(DIST, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Kaleon server running on http://0.0.0.0:${PORT}`);
});
