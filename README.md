# Pathwise CC (NewKaleon)

California community-college transfer planning — Vite React SPA + Express API monorepo.

## Quick start

```bash
pnpm install
cp .env.example .env
# Full app requires Postgres (DATABASE_URL) + OIDC config.

# Terminal 1 — API (port 8080 by default in start script)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Web (http://localhost:19245)
pnpm --filter @workspace/pathwise-cc run dev
```

## Run without auth/backend (temporary)

To demo the UI without the API/DB/OIDC, run the web app with an auth bypass flag:

```bash
VITE_AUTH_BYPASS=true pnpm --filter @workspace/pathwise-cc run dev
```

Open `http://localhost:19245` and use “Get started free” / “Sign in” to enter the app.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run typecheck` | Typecheck all workspace packages |
| `pnpm run build` | Build libs + artifacts |
| `pnpm --filter @workspace/api-server run test` | API unit tests (Vitest) |
| `pnpm --filter @workspace/pathwise-cc run test:e2e` | Playwright E2E |
| `./scripts/smoke.sh` | API health smoke after build |

## Deployment

See [docs/DEPLOY.md](docs/DEPLOY.md) for Docker Compose, required env vars, and production checklist.

## Workspace layout

- `artifacts/pathwise-cc` — main web app
- `artifacts/api-server` — Express API
- `lib/db` — Drizzle + PostgreSQL schemas
- `lib/api-spec` — OpenAPI source (Orval codegen)
