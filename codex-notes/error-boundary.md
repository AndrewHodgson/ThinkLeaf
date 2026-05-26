# React ErrorBoundary

## What was done

Added a top-level React ErrorBoundary so that an unexpected render crash shows a clean fallback
screen instead of a blank white page.

## Files touched

| File | Change |
|------|--------|
| `src/components/ErrorBoundary.tsx` | New file — class-based ErrorBoundary + ErrorFallback UI |
| `src/app/page.tsx` | Wrapped `<ThinkleafApp />` with `<ErrorBoundary>` |
| `codex-notes/error-boundary.md` | This note |

## Why class-based

React's `componentDidCatch` and `getDerivedStateFromError` lifecycle methods only exist on class
components. There is no hooks equivalent. The class is kept minimal; the fallback UI is a plain
function component.

## Fallback screen

When a render crash is caught the user sees:

- Heading: "Something went wrong"
- Message explaining their saved data is still in browser storage
- **Download backup** button — reads `thinkleaf.workspace.v1` directly from `localStorage` and
  triggers a `.json` download. Works even if the workspace hook was part of the crash.
- **Reload app** button — calls `window.location.reload()`
- Footer note pointing the user to the browser console for error details

## Error logging

`componentDidCatch` calls `console.error("[Thinkleaf] Uncaught render error:", error, info.componentStack)`.
The full component stack is visible in DevTools → Console. Nothing is swallowed.

## Scope

The boundary wraps the entire `<ThinkleafApp />` tree. In development, React still shows its red
error overlay on top of the fallback (this is normal and keeps debugging useful). In production
the overlay is absent and only the fallback renders.

## How to test

### Quick smoke test (console)

1. Open the app in the browser (`localhost:3000`).
2. Open DevTools → Console.
3. Paste and run:

```js
// Force a render crash on the next tick via a synthetic event that triggers bad state
// Easier: use React DevTools to throw from a component, or see option B below.
```

### Option A — throw from a component temporarily

In `src/components/ThinkleafApp.tsx`, add `throw new Error("test boundary")` at the top of the
function body (before the return), save, and reload. The fallback screen should appear immediately.
Remove the throw when done.

### Option B — trigger via console (no code change)

React's ErrorBoundary only catches errors during rendering, not arbitrary console throws.
Option A is the most reliable manual test.

### Verifying the fallback

1. Confirm the fallback screen appears (not a blank page).
2. Click **Download backup** — verify a `.json` file downloads containing your workspace.
3. Remove the test throw, save, then click **Reload app** — confirm the app loads normally.
4. Check DevTools → Console — confirm the `[Thinkleaf] Uncaught render error:` log line appears
   with the component stack.
