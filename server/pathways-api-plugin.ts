import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { loadEnv } from "vite";
import { generatePathwaysWithDeepSeek, type PathwayGenerationInput } from "./generate-pathways.ts";

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

const GENERATE_PATHWAYS_RE = /^\/api\/profiles\/(\d+)\/generate-pathways\/?$/;

export function pathwaysApiPlugin(): Plugin {
  return {
    name: "pathways-deepseek-api",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      const apiKey = env.DEEPSEEK_API_KEY ?? process.env.DEEPSEEK_API_KEY;

      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "POST" || !req.url) return next();

        const pathname = req.url.split("?")[0];
        const match = pathname.match(GENERATE_PATHWAYS_RE);
        if (!match) return next();

        if (!apiKey?.trim()) {
          sendJson(res, 503, {
            error: "DEEPSEEK_API_KEY is not configured. Add it to your .env file.",
          });
          return;
        }

        try {
          const profileId = parseInt(match[1], 10);
          let body: Partial<PathwayGenerationInput> = {};
          const raw = await readBody(req);
          if (raw.trim()) {
            body = JSON.parse(raw) as Partial<PathwayGenerationInput>;
          }

          const pathways = await generatePathwaysWithDeepSeek(
            {
              profileId,
              fullName: body.fullName,
              communityCollege: body.communityCollege,
              intendedMajor: body.intendedMajor,
              careerGoal: body.careerGoal,
              currentGpa: body.currentGpa,
              transferTimeline: body.transferTimeline,
              financialSituation: body.financialSituation,
              isFirstGen: body.isFirstGen,
              courses: body.courses,
              totalUnits: body.totalUnits,
            },
            apiKey.trim(),
          );

          sendJson(res, 200, pathways);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Pathway generation failed";
          console.error("[pathways-api]", message, err);
          sendJson(res, 500, { error: message });
        }
      });
    },
  };
}
