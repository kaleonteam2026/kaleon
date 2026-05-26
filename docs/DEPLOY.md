# Deployment (non-Replit)

Pathwise CC runs as a **static Vite SPA** plus an **Express API**. Use Docker Compose for local staging or split deploy (CDN + API PaaS).

## Architecture

| Service | Build output | Default port |
|---------|--------------|--------------|
| Web (`pathwise-cc`) | `artifacts/pathwise-cc/dist/public` | 80 (nginx) |
| API (`api-server`) | `artifacts/api-server/dist/index.mjs` | 8080 |

## Required environment variables

See [.env.example](../.env.example). Minimum for production:

- `DATABASE_URL`
- `OIDC_CLIENT_ID`, `OIDC_ISSUER_URL`
- `PUBLIC_ORIGIN`, `ALLOWED_ORIGINS`
- `PRIVATE_OBJECT_DIR` (+ GCS credentials via ADC or `GCS_KEY_FILE`)

**Optional (AI features):** `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` and `AI_INTEGRATIONS_ANTHROPIC_API_KEY`. Without these, the API starts normally; AI endpoints respond with HTTP 503.

Legacy Replit variables (`REPL_ID`, `REPLIT_DOMAINS`, etc.) still work as fallbacks during migration.

## Local staging (Docker Compose)

```bash
cp .env.example .env
# Fill in DATABASE_URL, OIDC_*, PUBLIC_ORIGIN, etc.

docker compose -f docker-compose.yml up --build
```

- Web: http://localhost:3000
- API: http://localhost:8080/api/healthz

## Production checklist

1. Configure OIDC redirect URLs: `{PUBLIC_ORIGIN}/api/callback`, post-logout `{PUBLIC_ORIGIN}`.
2. Provision Postgres and run `pnpm exec drizzle-kit push` (or your migration workflow).
3. Provision GCS bucket; set `PRIVATE_OBJECT_DIR` to `/bucket-name/private`.
4. Build and deploy API container; deploy static assets with SPA fallback to `index.html`.
5. Point `ALLOWED_ORIGINS` at your web origin(s).
6. Run smoke check: `./scripts/smoke.sh`

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs typecheck, build, API unit tests, and smoke health checks.
