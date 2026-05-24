# Bugs and Issues

## 2026-05-24 Manual QA Startup Blocker

Status: Open

`npm run dev` could not be verified as a clean fresh startup because another Next dev server is already running for this repo on port 3000.

Observed:

- `lsof -nP -iTCP:3000 -sTCP:LISTEN` reports an existing `node` process on port 3000 with PID `11683`.
- Local `curl -I http://localhost:3000` could not connect from this QC session even though the listener is present.
- The existing `.next/dev/logs/next-development.log` contains older runtime errors from prior edits, but recent entries after the latest code/build pass do not show fresh application errors.

Impact:

- The startup checklist item cannot be marked clean from this QA session.
- Browser-based checklist items still need hands-on verification in the already-running browser/dev-server session.

Recommended follow-up:

- In the user's local terminal/browser, use the existing `localhost:3000` session for manual QA if it is reachable there, or stop PID `11683` and restart with `npm run dev -- -p 3000` before repeating startup checks.

Notes:

- `npm run build` passes.
- No current code/build regression was found during code-path review.

## 2026-05-24 Public Folder Hygiene

Status: Open

`public/` currently includes files that are not needed by the running app:

- `public/.DS_Store`
- `public/brand/ThinkLeaf Logo Working.ai`

Impact:

- Files under `public/` can be served by the app, so source/design artifacts and OS metadata should not live there long-term.

Recommended follow-up:

- Move source design files outside `public/` and remove OS metadata files when safe to do so.
