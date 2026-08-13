# Kaleon — Fix Summary: Mobile Transcript Upload + DeepSeek API

Scope of changes: fixing mobile PDF transcript upload/parsing during onboarding and
the DeepSeek 400 error (`content[].thinking must be passed back`).

---

## 1. Mobile PDF transcript upload — offload text extraction to the server

**Problem:** pdfjs-dist fails on mobile Safari/Chrome. Module workers (`.mjs`) fail to
load in mobile WebKit, producing cryptic errors like
`undefined is not a function (near '...i of e...')`. Client-side extraction on mobile
was unreliable even with `disableWorker`.

**Fix:** On mobile, the raw PDF file is uploaded to a new server endpoint that extracts
the text server-side (where pdfjs-dist works reliably). The file is processed entirely
in memory and is never written to disk. Only the extracted text string comes back to
the client; the client then continues the existing flow (AI parsing → regex fallback).

### New server endpoint

- **`server/extract-pdf-text.ts`** (new) — `extractPdfText(buffer)`:
  - Uses the pdfjs-dist **legacy** build (`pdfjs-dist/legacy/build/pdf.mjs`) — the main
    build references DOM globals (`DOMMatrix`) that don't exist in Node.js.
  - `disableWorker: true`, `disableFontFace: true` — text extraction only, no worker.
  - Throws a clear error for scanned/image-only PDFs (no selectable text).
- **`server/index.ts`** (production Express) — `POST /api/transcript/extract-pdf-text`:
  - Reads the raw request body as binary (added **before** `express.json()`).
  - Rejects empty bodies (400) and files over 20 MB (413).
  - Returns `{ text }` or `{ error }`.
- **`server/transcript-parse-plugin.ts`** (Vite dev) — same endpoint added to the dev
  middleware so `npm run dev` behaves identically to production.

### Client change

- **`src/pages/onboarding.tsx`** — `handleScan()`:
  - Detects mobile via user-agent; on mobile, uploads the `File` object to
    `/api/transcript/extract-pdf-text` instead of calling client-side
    `extractTextFromPDF()`.
  - Falls back to client-side extraction on desktop (unchanged fast path).
  - Shows the server's error message directly when extraction fails.

### Earlier client-side hardening (already committed in `5824eef` / `c7173b6`)

- **`src/lib/parse-transcript.ts`** — lazy worker init (no module-level `workerSrc`
  on mobile), cached mobile detection, worker-disabled retry on first failure,
  batched page processing (5/page batch with event-loop yields) and memory caps
  (`maxImageSize`, `isEvalSupported`) on mobile.
- **`src/components/onboarding/form-steps.tsx`** — replaced `alert()` with an inline
  `fileError` state; MIME validation no longer rejects when mobile omits `file.type`.
- **`src/components/onboarding/parsing-messages.tsx`** — responsive/mobile-friendly
  layout for the "scanning" interstitial.

### Security note

Transcript PDFs are uploaded as binary to the server, processed in memory, and
discarded. The server never stores the file or writes it to disk — only the extracted
text is used (then sent to DeepSeek for parsing). Consider adding an upload size cap
check at the reverse-proxy/CDN layer in addition to the in-app 20 MB limit.

---

## 2. DeepSeek 400 error — disable thinking mode

**Problem:** `DeepSeek returned HTTP 400` with upstream error
`The content[].thinking in the thinking mode must be passed back to the API.`

**Root cause:** DeepSeek V4 enables **thinking mode by default**. Verified live:

- Without an explicit param, a request to `deepseek-v4-pro` returned `content: ""`
  with all output tokens consumed by `reasoning_content` (`finish_reason: length`).
- With `thinking: { type: "disabled" }`, the same request returned a clean `content`.

The 400 specifically is the multi-turn variant of this: once the model has emitted
thinking content, subsequent turns must echo it back — but these stateless single-turn
calls can't, so the API rejects them.

**Fix:**

- **`server/deepseek-client.ts`** — the single `deepSeekChat()` helper now sends
  `thinking: { type: "disabled" }` on every call. All five DeepSeek callers
  (`generate-pathways`, `transcript-parse`, `generate-guidebook`, `generate-roadmap`,
  `transferability-analysis`) route through this one function, so all are covered.
- Verified via a local mock server that the OpenAI SDK (v6.39.1) serializes the
  `thinking` field correctly in the outgoing request body.
- Added **`logDeepSeekConfig()`** — prints the effective base URL / model / thinking
  mode at server startup:

  ```
  [deepseek] base_url=https://api.deepseek.com model=deepseek-v4-pro thinking=disabled
  ```

  This makes it possible to confirm from production logs which path the deployed
  server is using.

### Deployment requirement

The server runs with `node --experimental-strip-types` — **no hot reload**. The fix
must be deployed (rebuilt + restarted) before the 400 goes away. After restart, check
for the `[deepseek]` startup line.

### If the error persists after deploy

The error shape (`"Upstream provider DEEPSEEK returned HTTP 400"` + `"Mapped message"`
+ `req_...` request IDs) comes from an **AI gateway/proxy**, not DeepSeek directly.
If the gateway strips or overrides the `thinking` body param, the flag never reaches
DeepSeek. In that case, disable thinking mode at the gateway level, or verify the
gateway forwards `thinking` through to DeepSeek.

---

## Files changed (uncommitted)

| File | Change |
|---|---|
| `server/extract-pdf-text.ts` | **New** — server-side PDF text extraction (legacy pdfjs build) |
| `server/index.ts` | New `/api/transcript/extract-pdf-text` endpoint + `logDeepSeekConfig()` at startup |
| `server/transcript-parse-plugin.ts` | Same endpoint for Vite dev + handler refactor |
| `server/deepseek-client.ts` | `thinking: {type:"disabled"}` on all DeepSeek calls + startup config log |
| `src/pages/onboarding.tsx` | Mobile uploads PDF to server for extraction instead of client-side pdfjs |

## Files changed (already committed in `5824eef` / `c7173b6`)

| File | Change |
|---|---|
| `src/lib/parse-transcript.ts` | Lazy worker init, mobile batching, retry on failure |
| `src/components/onboarding/form-steps.tsx` | Inline file error (no `alert()`), lenient MIME check on mobile |
| `src/components/onboarding/parsing-messages.tsx` | Mobile-friendly scanning layout |
