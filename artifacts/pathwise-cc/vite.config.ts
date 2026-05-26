import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

/** Full-page hits to /api/login must load the SPA when the API is not proxied. */
function spaAuthRoutesPlugin(apiTarget: string | undefined): Plugin {
  const authBypass = process.env.VITE_AUTH_BYPASS === "true";
  if (apiTarget && !authBypass) return { name: "spa-auth-routes" };

  return {
    name: "spa-auth-routes",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (url === "/api/login" || url === "/api/logout") {
          req.url = "/index.html";
        }
        next();
      });
    },
  };
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

const apiTarget =
  process.env.E2E_API_TARGET || process.env.VITE_API_TARGET;

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss(), spaAuthRoutesPlugin(apiTarget)],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    ...(apiTarget
      ? {
          proxy: {
            "/api": {
              target: apiTarget,
              changeOrigin: true,
            },
          },
        }
      : {}),
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
