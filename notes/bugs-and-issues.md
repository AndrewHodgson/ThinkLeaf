# Bugs and Issues

## Beta Hardening — Resolved Issues (2026-05-26)

The following issues from the original beta-readiness audit have been resolved:

**Issue #1 — CanvasLayer runtime errors** (Status: Resolved)
`getConnectorLineMode`, `getDoubleLinePathData`, and `getLineMarkerUrl` are all module-scope function declarations and are hoisted; they can be called safely from anywhere in the file. `markerEnd` is a JSX SVG prop attribute name, not a JavaScript variable — there was no declaration-order issue. Confirmed via code audit; no changes required.

**Issue #2 — Silent localStorage save failures** (Status: Resolved)
All writes go through `safeSetLocalStorage` in `src/lib/storage.ts`. Quota failures dispatch a custom event caught by `ThinkleafApp`, which shows an amber banner with a heading, explanation, Export Backup button, and dismiss control. See `codex-notes/safe-localstorage.md`.

**Issue #3 — No Error Boundary** (Status: Resolved)
`src/components/ErrorBoundary.tsx` wraps `<ThinkleafApp />` in `src/app/page.tsx`. Render crashes show a full-screen fallback with a Download Backup button (reads localStorage directly, bypasses React state) and a Reload button. Error and component stack are logged via `console.error`. See `codex-notes/error-boundary.md`.

**Issue #4 — Mobile viewport** (Status: Intentionally deferred)
Mobile/tablet polish is not a beta priority. The app targets desktop browsers. No responsive work is planned until core manual QA is complete.

**Issue #7 — Export / backup** (Status: Resolved)
JSON backup export and PDF export are distinct, non-overlapping functions in `src/lib/exportUtils.ts`. JSON backup restores the full editable workspace; PDF export produces a styled print document with the note body first and canvas on its own page.

**Issue #8 — Unbounded undo history / image memory pressure** (Status: Resolved)
Undo/redo history was confirmed to be session-only React state (never written to localStorage). The fix strips `imageDataUrl` from history snapshot entries and maintains a per-page image asset registry (`useRef`) that is populated from live canvas state before each strip. On undo/redo, image data is re-injected from the registry before applying to the workspace. History entries are now lightweight; image strings are no longer kept alive by the history stack beyond the asset registry. See `codex-notes/undo-history-memory.md`.

**Issue #6 — Unencrypted localStorage, no disclosure** (Status: Resolved)
A data storage disclosure was added to the existing "Data & Backup" section in the Settings menu (`CanvasCreationToolbar.tsx`). The text explains: notes are stored locally in this browser only, not cloud-synced, and anyone with access to this browser may be able to view them. No encryption or backend was added — beta scope is disclosure only.

**Issue #5 — No security headers** (Status: Resolved)
Four headers added to `next.config.ts` via `headers()`: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` disabling camera/mic/geolocation/payment/USB. CSP is intentionally deferred — Next.js inline scripts and Tiptap inline styles require `'unsafe-inline'` without nonce middleware, which would provide minimal protection. See `codex-notes/security-headers.md`.

**Issue #10 — Corrupted localStorage recovery** (Status: Resolved)
`loadWorkspace()` detects JSON parse failures and shape validation failures. Corrupted data is preserved under `thinkleaf.workspace.corrupted.<timestamp>` before falling back. Autosave is gated while corruption is unresolved. A full-screen recovery screen offers Download Corrupted Backup and Start Fresh actions. See `codex-notes/corrupted-storage-recovery.md`.

## 2026-05-24 Manual QA Startup Blocker

Status: Likely resolved — session-specific, verify on next manual QA session.

The 2026-05-24 QA session could not confirm a clean `npm run dev` startup because a stale Next.js process on port 3000 (PID 11683) was left over from a prior session and was not accessible from inside the automated QA session.

This was a session-isolation artifact, not a code or config issue. `npm run build` passed cleanly then and continues to pass as of the 2026-05-26 audit.

Recommended follow-up:

- On your next manual QA session, run `npm run dev` in a fresh terminal and confirm the app loads at `localhost:3000` without console errors.
- If port 3000 is busy, kill the stale process with `kill $(lsof -t -i:3000)` and restart.

## 2026-05-24 Public Folder Hygiene

Status: Open

`public/` currently includes files that are not needed by the running app:

- `public/.DS_Store`
- `public/brand/ThinkLeaf Logo Working.ai`

Impact:

- Files under `public/` can be served by the app, so source/design artifacts and OS metadata should not live there long-term.

Recommended follow-up:

- Move source design files outside `public/` and remove OS metadata files when safe to do so.
