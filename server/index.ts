import express from "express";
import path from "path";
import { generatePathwaysWithDeepSeek } from "./generate-pathways.js";
import { parseTranscriptWithAI } from "./transcript-parse.js";

const app = express();
const PORT = process.env.PORT ?? 3000;
const DIST = path.resolve(import.meta.dirname, "..", "dist");

app.use(express.json());

// ── DeepSeek-powered AI endpoints ──────────────────────────────────────

app.post("/api/profiles/:id/generate-pathways", async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "DeepSeek API key not configured" });
    return;
  }
  try {
    const result = await generatePathwaysWithDeepSeek(
      { profileId: Number(req.params.id), ...req.body },
      apiKey,
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/api/transcript/parse", async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "DeepSeek API key not configured" });
    return;
  }
  const { text } = req.body ?? {};
  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Missing 'text' field" });
    return;
  }
  try {
    const result = await parseTranscriptWithAI(text, apiKey);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Serve built frontend ──────────────────────────────────────────────

app.use(express.static(DIST));

// SPA fallback — any unmatched route serves the app shell
app.get("{*splat}", (_req, res) => {
  res.sendFile(path.join(DIST, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Kaleon server running on http://localhost:${PORT}`);
});
