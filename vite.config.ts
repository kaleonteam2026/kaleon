import { defineConfig, type Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import tailwindcss from "@tailwindcss/vite";
import { pathwaysApiPlugin } from "./server/pathways-api-plugin.ts";

/** Root-level static files kept in `dist/` (logo, nav icons, etc.). */
const DIST_STATIC_FILES = new Set([
  "logo.svg",
  "courses.png",
  "coursesgreen.png",
  "pathways.png",
  "pathwaysgreen.png",
  "progress.png",
  "progressgreen.png",
  "opengraph.jpg",
]);

function distStaticMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  const distDir = path.resolve(import.meta.dirname, "dist");
  const url = req.url?.split("?")[0] ?? "";
  const name = path.basename(url);
  if (!DIST_STATIC_FILES.has(name)) {
    next();
    return;
  }
  const file = path.join(distDir, name);
  if (!fs.existsSync(file)) {
    next();
    return;
  }
  const types: Record<string, string> = {
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
  };
  res.setHeader("Content-Type", types[path.extname(name)] ?? "application/octet-stream");
  fs.createReadStream(file).pipe(res);
}

function serveDistStatic(): Plugin {
  return {
    name: "serve-dist-static",
    configureServer(server) {
      server.middlewares.use(distStaticMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(distStaticMiddleware);
    },
  };
}

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  publicDir: false,
  plugins: [react(), tailwindcss(), serveDistStatic(), pathwaysApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    /** Keep logo/nav PNGs in `dist/` when rebuilding. */
    emptyOutDir: false,
  },
});
