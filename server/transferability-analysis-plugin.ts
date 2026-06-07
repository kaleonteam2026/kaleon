import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { loadEnv } from "vite";
import {
  generateTransferabilityAnalysis,
  type TransferabilityAnalysisInput,
} from "./transferability-analysis.ts";

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

const ROUTE = /^\/api\/profiles\/(\d+)\/transferability-analysis\/?$/;

export function transferabilityPlugin(): Plugin {
  return {
    name: "transferability-deepseek-api",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      const apiKey = env.DEEPSEEK_API_KEY ?? process.env.DEEPSEEK_API_KEY;

      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "POST" || !req.url) return next();

        const pathname = req.url.split("?")[0];
        const match = pathname.match(ROUTE);
        if (!match) return next();

        if (!apiKey?.trim()) {
          sendJson(res, 503, {
            error: "DEEPSEEK_API_KEY is not configured. Add it to your .env file.",
          });
          return;
        }

        try {
          const raw = await readBody(req);
          const body = JSON.parse(raw) as TransferabilityAnalysisInput;

          const result = await generateTransferabilityAnalysis(body, apiKey.trim());
          sendJson(res, 200, result);
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Transferability analysis failed";
          console.error("[transferability-api]", message, err);
          sendJson(res, 500, { error: message });
        }
      });
    },
  };
}
