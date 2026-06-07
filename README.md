# Static Site (Vite)

Standalone Vite React app extracted from `feat/replit-decoupling` for static page rendering only.

## Included Routes

- `/`
- `/welcome/first-gen`
- `/welcome/ab540`
- `/welcome/returning`
- `/onboarding`
- `/profile/:profileId?`
- `/courses/:profileId`
- `/matches/:profileId`
- `/pathways/:profileId`
- `/guidebook/:guidebookId`
- `/roadmap/:roadmapId`
- `/progress/:profileId`
- `/deadline-calendar/:profileId?`
- `/exports/:profileId?`

## Notes

- No backend is required.
- API requests to `/api/*` are intercepted by `src/mocks/mock-api.ts`.
- Auth is bypassed in scripts (`VITE_AUTH_BYPASS=true`) so all selected routes are testable locally.

## Commands

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run build
npm run preview
```
