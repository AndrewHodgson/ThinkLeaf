# Safe localStorage Handling

## What was done

All localStorage writes in the app go through a single `safeSetLocalStorage` helper in `src/lib/storage.ts`. That helper:

- Wraps `window.localStorage.setItem` in a try/catch.
- Catches `QuotaExceededError` and any other write failure silently (no crash).
- Dispatches a custom `thinkleaf-storage-write-error` window event on failure.
- Returns `true` on success, `false` on failure.

`ThinkleafApp.tsx` listens for that event and sets `hasStorageWriteError` state to `true`, which renders a fixed amber warning banner at the top of the screen.

## Write sites (all use `safeSetLocalStorage`)

| File | Key(s) |
|------|--------|
| `src/hooks/useWorkspace.ts` | `thinkleaf.workspace.v1` |
| `src/components/ThinkleafApp.tsx` | `thinkleaf.ui.v1`, snapToGrid, penSettings, creationToolDefaults, activeShapeType, flowchartConnectorArrow, pageTemplates |
| `src/components/sidebar/Sidebar.tsx` | sidebar section expand/collapse keys |
| `src/components/workspace/ColorPicker.tsx` | `thinkleaf.recentColors.v1` |
| `src/components/workspace/RichTextEditor.tsx` | document vertical alignment key |

## Warning banner (updated 2026-05-26)

The banner now:

- Appears fixed at the top-center of the screen when any write fails.
- Has a bold heading: "Storage full — changes may not have been saved".
- Has a body message recommending the user export a backup before losing work.
- Includes an **Export backup** button that triggers the existing JSON backup download.
- Includes a dismiss (✕) button so the user can close the banner after acknowledging it.

## Safe overwrite behavior

If a `setItem` call fails, the previously stored value in localStorage is left untouched — the failed write does not replace existing data with defaults. The `loadWorkspace` function only falls back to sample data if no stored data exists at all, or if the stored JSON is unparseable.

## How to test

1. Open DevTools → Application → Storage → Local Storage for `localhost:3000`.
2. Note the current used quota.
3. To trigger the error manually: in the DevTools console, run:
   ```js
   window.dispatchEvent(new CustomEvent("thinkleaf-storage-write-error", { detail: { key: "test" } }));
   ```
4. Confirm the amber banner appears with the correct message and both buttons.
5. Click **Export backup** — verify a `.json` file downloads and contains your workspace data.
6. Click ✕ — verify the banner disappears.
7. To test a real quota failure: fill localStorage to capacity using a script, then trigger a save (e.g., type in the editor). The banner should appear automatically.
