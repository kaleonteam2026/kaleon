import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { loadEnv } from "vite";
import { parseTranscriptWithAI } from "./transcript-parse.ts";
import { extractPdfText } from "./extract-pdf-text.ts";

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

/** POST /api/transcript/extract-pdf-text — binary PDF upload → server-side text extraction. */
async function handleExtractPdfText(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const buffer = await readBody(req);

    if (buffer.length === 0) {
      sendJson(res, 400, { error: "Empty request body — send a PDF file as binary." });
      return;
    }

    if (buffer.length > 20 * 1024 * 1024) {
      sendJson(res, 413, { error: "PDF is too large (over 20 MB)." });
      return;
    }

    const text = await extractPdfText(buffer.buffer as ArrayBuffer);
    sendJson(res, 200, { text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF text extraction failed";
    console.error("[extract-pdf-text]", message, err);
    sendJson(res, 500, { error: message });
  }
}

/** POST /api/transcript/parse — uses LLM to extract courses/GPA/units from raw PDF text. */
async function handleParseTranscript(raw: string, apiKey: string, res: ServerResponse): Promise<void> {
  try {
    const { text, detectMultipleColleges } = JSON.parse(raw) as { text: string; detectMultipleColleges?: boolean };
    if (!text?.trim()) {
      sendJson(res, 400, { error: "Missing 'text' field in request body." });
      return;
    }

    const result = await parseTranscriptWithAI(text, apiKey.trim(), detectMultipleColleges);
    sendJson(res, 200, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcript parsing failed";
    console.error("[transcript-parse-api]", message, err);
    sendJson(res, 500, { error: message });
  }
}

export function transcriptParsePlugin(): Plugin {
  return {
    name: "transcript-parse-api",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      const apiKey = env.DEEPSEEK_API_KEY ?? process.env.DEEPSEEK_API_KEY;

      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "POST" || !req.url) return next();

        const pathname = req.url.split("?")[0];

        // Binary PDF upload → server-side text extraction (mobile fallback)
        if (pathname === "/api/transcript/extract-pdf-text") {
          await handleExtractPdfText(req, res);
          return;
        }

        // AI-powered transcript parsing from extracted text
        if (pathname === "/api/transcript/parse") {
          if (!apiKey?.trim()) {
            sendJson(res, 503, {
              error: "DEEPSEEK_API_KEY is not configured. Add it to your .env file.",
            });
            return;
          }

          const raw = await readBody(req);
          await handleParseTranscript(raw.toString("utf8"), apiKey, res);
          return;
        }

        return next();
      });
    },
  };
}
