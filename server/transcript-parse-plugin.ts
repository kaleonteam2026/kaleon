import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { loadEnv } from "vite";
import { parseTranscriptWithAI } from "./transcript-parse.ts";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

/** POST /api/transcript/parse — uses LLM to extract courses/GPA/units from raw PDF text. */
export function transcriptParsePlugin(): Plugin {
  return {
    name: "transcript-parse-api",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      const apiKey = env.DEEPSEEK_API_KEY ?? process.env.DEEPSEEK_API_KEY;

      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "POST" || !req.url) return next();

        const pathname = req.url.split("?")[0];
        if (pathname !== "/api/transcript/parse") return next();

        if (!apiKey?.trim()) {
          sendJson(res, 503, {
            error: "DEEPSEEK_API_KEY is not configured. Add it to your .env file.",
          });
          return;
        }

        try {
          const raw = await readBody(req);
          const { text } = JSON.parse(raw) as { text: string };
          if (!text?.trim()) {
            sendJson(res, 400, { error: "Missing 'text' field in request body." });
            return;
          }

          const result = await parseTranscriptWithAI(text, apiKey.trim());
          sendJson(res, 200, result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Transcript parsing failed";
          console.error("[transcript-parse-api]", message, err);
          sendJson(res, 500, { error: message });
        }
      });
    },
  };
}
