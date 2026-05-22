# Bugs and Issues

## 2026-05-22 Manual QA Startup Blocker

Status: Open

`npm run dev` could not be verified as a clean fresh startup because another Next dev server is already running for this repo on port 3000.

Observed:

- Running `npm run dev` inside the sandbox fails with `listen EPERM: operation not permitted 0.0.0.0:3000`.
- Running `npm run dev` with elevated local permissions reports an existing server on port 3000 with PID `43951`.
- The attempted second dev server briefly selected port 3001, then exited with `Another next dev server is already running`.
- Local `curl` to `localhost:3001` could not connect after that second server exited.

Impact:

- The startup checklist item cannot be marked clean from this QA session.
- Browser-based checklist items still need hands-on verification in the already-running browser/dev-server session.

Recommended follow-up:

- In the user's local terminal/browser, use the existing `localhost:3000` session for manual QA, or stop PID `43951` and restart with `npm run dev` before repeating startup checks.

Notes:

- `npm run build` passes.
- No current code/build regression was found during code-path review.
- The existing `.next/dev/logs/next-development.log` contains older browser/runtime errors from prior edits; those were not confirmed as current issues in this session.
