# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Owner-only admin

- `OWNER_USER_IDS` env var (comma-separated user IDs) gates `/admin/usage` and `GET /api/admin/usage`. Non-owners (and unauthenticated users) get 404, not 403, so the surface stays unadvertised.
- AI cost caps: defaults are 100 generations/day app-wide, 10 generations/day per user, 20 Tavily searches/day. Override with `AI_DAILY_CAP`, `AI_DAILY_USER_CAP`, `TAVILY_DAILY_CAP`.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## What changed — Accessibility & UX audit (May 2026)

Full WIG / WCAG 2.1 AA pass on `artifacts/pathwise-cc`. Findings + fixes documented in `.local/audits/a11y-2026-05.md`.

Critical/High remediation shipped:
- Added a global skip-to-main-content link; every `<main>` now has `id="main-content"` and is focusable.
- Mobile bottom-nav tap targets meet 44 px (now 56 px); mobile hamburger has `aria-expanded`/`aria-controls`/`aria-label`.
- Mobile full-screen menu has `role="dialog" aria-modal="true"`, an accessible name, and a real focus trap (Tab cycles inside, Escape closes, focus returns to the hamburger).
- Floating chat (`chat-bubble.tsx`) is now a proper modal: `role="dialog"`/`aria-modal` on the container, focus trap with Escape-to-close, and focus return to the trigger button.
- New shared focus-trap hook at `src/hooks/use-focus-trap.ts` powers both custom dialogs.
- All `<nav>` landmarks have `aria-label`; active links expose `aria-current="page"`.
- Profile college picker: keyboard-reachable clear button, `aria-haspopup`/`aria-expanded`, contrast bumped on placeholder/chevron.
- Scholarships: tabs use proper `role="tab"`/`aria-selected`; "Hide" and external-link icons have accessible names + AA contrast.
- Chat bubble: dialog role, `aria-live="polite"` conversation, `role="status"` while the AI is responding.
- Decorative lucide icons marked `aria-hidden`.

Regression prevention:
- Added `eslint-plugin-jsx-a11y` flat config at `artifacts/pathwise-cc/eslint.config.js`.
- Run with `pnpm --filter @workspace/pathwise-cc run lint:a11y` — currently 0 errors / 0 warnings.
- Onboarding labels reworked: text inputs use `htmlFor`/`id`; button groups use `role="group"` + `aria-labelledby`.

Lighthouse scores must be re-verified in a real browser (the sandbox can't run headless Chrome). All Critical/High blockers are removed, so a ≥95 a11y score is expected on dashboard, courses, progress, profile, scholarships, and deadline-calendar.
