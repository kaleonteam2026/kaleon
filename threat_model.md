# Threat Model

## Project Overview

Pathwise CC is a pnpm TypeScript monorepo for California community-college transfer planning. The production application consists of a Vite React frontend in `artifacts/pathwise-cc`, an Express 5 API server in `artifacts/api-server`, shared generated API/type libraries under `lib/api-*`, a Drizzle/PostgreSQL data layer in `lib/db`, and external integrations for Replit Auth/OIDC, Anthropic AI, and Tavily search. Users authenticate with Replit Auth, create student profiles, track courses/progress, generate AI transfer guidance, and run live scholarship/deadline/internship searches.

The `artifacts/mockup-sandbox` package and `.agents`/skill assets are development or agent tooling areas and are not production application surfaces unless explicitly wired into a deployed production workflow. Production deployments are assumed to run with `NODE_ENV=production` and platform-managed TLS.

## Assets

- **User accounts and sessions** -- OIDC identities, session IDs in the `sid` cookie, OIDC access/refresh tokens stored in the sessions table, and user profile metadata. Compromise allows account impersonation and access to student records.
- **Student education and planning data** -- profile details, GPA/course history, financial situation, transfer goals, progress entries, saved internships, generated pathways, guidebooks, and roadmaps. This is sensitive personal and educational data.
- **Application secrets** -- `DATABASE_URL`, `REPL_ID`, OIDC configuration, Anthropic API credentials, Tavily API keys, and other environment secrets. Disclosure can enable backend or third-party service abuse.
- **AI and search budgets** -- Anthropic and Tavily calls incur cost and quota usage. Public or weakly limited endpoints could be abused for denial of wallet.
- **Generated advisory content** -- AI-generated recommendations, guidebooks, roadmaps, search results, and markdown rendered to the client. Malicious or untrusted content must not execute script or override authorization decisions.

## Trust Boundaries

- **Browser to API** -- all `/api/*` requests cross from an untrusted browser/client into the Express server. The server must authenticate requests, enforce resource ownership, validate inputs, and not rely on frontend checks.
- **Authenticated user to another user's data** -- profile IDs, pathway IDs, course IDs, guidebook IDs, roadmap IDs, progress entry IDs, and saved internship slugs are attacker-controlled URL/body inputs. Each data access must verify ownership through the authenticated `req.user.id`.
- **API to PostgreSQL** -- the API server has broad database access through Drizzle. Queries must remain parameterized and avoid returning rows outside the authorized user scope.
- **API to OIDC provider** -- login/callback/logout flows trust Replit Auth claims only after state, nonce, and PKCE validation. Redirect/callback origins derived from request headers must not create open redirect or callback confusion.
- **API to external AI/search services** -- student data and user-controlled prompts are sent to Anthropic/Tavily. Calls must be authenticated, rate limited/capped, avoid secret leakage in errors/logs, and treat external results as untrusted content.
- **Markdown/HTML rendering boundary** -- guidebooks, roadmaps, AI responses, Tavily snippets, and user-entered text cross into React rendering. Markdown renderers and any `dangerouslySetInnerHTML` usage must prevent XSS.
- **Production vs development tooling** -- mockup sandbox, agent skills, attached assets, and local workflow logs are out of production scope unless imported by production packages.

## Scan Anchors

- Production backend entry points: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/index.ts`.
- Authentication/session implementation: `artifacts/api-server/src/routes/auth.ts`, `artifacts/api-server/src/lib/auth.ts`, `artifacts/api-server/src/middlewares/authMiddleware.ts`, `artifacts/api-server/src/lib/access-control.ts`, `lib/db/src/schema/auth.ts`.
- Ownership/access-control helpers: `artifacts/api-server/src/lib/ownership.ts` and route modules under `artifacts/api-server/src/routes/`.
- External service/cost-control code: `artifacts/api-server/src/services/aiService.ts`, `artifacts/api-server/src/lib/global-cap.ts`, `artifacts/api-server/src/lib/tavily.ts`, `artifacts/api-server/src/lib/tavily-guard.ts`, routes `chat.ts`, `live-search.ts`, `internships-search.ts`, `pathways.ts`, `guidebooks.ts`, `roadmaps.ts`, `progress.ts`, `igetc.ts`.
- Frontend security surfaces: `artifacts/pathwise-cc/src/components/markdown-renderer.tsx`, page files rendering generated content, `artifacts/pathwise-cc/src/contexts/auth-context.tsx`, and generated/custom API clients under `lib/api-client-react`.
- Dev-only/out-of-scope unless production reachability is shown: `artifacts/mockup-sandbox`, `.agents`, `.local/skills`, `.local/secondary_skills`, attached screenshots/assets, workflow logs, built `dist` files that duplicate source.

## Threat Categories

### Spoofing

Users authenticate via Replit Auth/OIDC. The API must validate OIDC state, nonce, and PKCE verifier before creating sessions; session IDs must be high entropy, stored only in HTTP-only secure cookies, and invalidated on expiry or allowlist removal. Login and logout redirect construction must not let attacker-controlled headers or parameters impersonate trusted origins or redirect users to malicious locations.

### Tampering

The browser is untrusted. Profile, course, IGETC, progress, saved internship, and AI-generation requests must validate request bodies and server-side ownership before inserting/updating/deleting data. Client-supplied IDs, GPA values, completion percentages, markdown, search queries, and cached/generated content must not be accepted as authorization facts or business-truth without server checks.

### Information Disclosure

Student profiles, academic records, financial situation, AI-generated plans, search history, and OIDC tokens must be scoped to the authenticated user. API responses and logs must not expose other users' records, access/refresh tokens, third-party API keys, upstream provider error details containing secrets, stack traces, or unnecessary PII. AI/search responses and rendered markdown must be treated as untrusted to prevent script execution or data exfiltration from the browser.

### Denial of Service / Denial of Wallet

AI and live-search endpoints can consume expensive third-party quota. Authenticated endpoints that call Anthropic or Tavily must enforce per-user throttles, durable global caps where needed, bounded request sizes, and reasonable limits on arrays/messages/search inputs. Public endpoints should not trigger paid external calls.

### Elevation of Privilege

Every route that accesses per-user resources must enforce ownership server-side using `req.user.id`, not only profile IDs from local storage or route parameters. Database queries must remain parameterized, avoid raw SQL with user input, and avoid object/JSON updates that can modify ownership fields or other privileged columns. There is currently no admin role; any future admin surface must enforce role checks on the server.
