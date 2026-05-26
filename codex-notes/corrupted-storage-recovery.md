# Corrupted localStorage Recovery

## Problem

Before this fix, if `thinkleaf.workspace.v1` held invalid JSON or data that failed shape
validation, `loadWorkspace()` silently returned sample data. On the next render cycle the
autosave effect immediately wrote the sample data back to `thinkleaf.workspace.v1`, permanently
overwriting the user's corrupted — but potentially recoverable — workspace.

## What was done

### `src/hooks/useWorkspace.ts`

- Added `CORRUPTED_KEY_PREFIX = "thinkleaf.workspace.corrupted."` constant.
- Added `preserveCorruptedWorkspace(raw)` helper: saves the raw corrupted string to a timestamped
  key (`thinkleaf.workspace.corrupted.<unix-ms>`) before falling back, and returns the key.
  If the write fails (storage full) the original corrupted value remains under `STORAGE_KEY`
  since autosave is gated — recovery is still possible.
- Changed `loadWorkspace()` return type from `WorkspaceData` to `LoadResult`:
  ```ts
  type LoadResult = { data: WorkspaceData; corruptedKey: string | null };
  ```
  Both corruption paths (JSON parse failure, shape validation failure) now call
  `preserveCorruptedWorkspace` and return a non-null `corruptedKey`.
- Added `console.warn` in each corruption path so details appear in DevTools.
- Added `corruptedStorageKey: string | null` state to `useWorkspace`.
- **Gated autosave**: the save `useEffect` exits early while `corruptedStorageKey !== null`,
  so sample data never silently overwrites the user's workspace key.
- Added `clearCorruptedData()`: removes the stashed key, writes the fresh sample workspace
  explicitly to `STORAGE_KEY`, resets state. Called when the user consciously chooses "Start
  fresh".
- Exported `corruptedStorageKey` and `clearCorruptedData` from the hook.

### `src/components/ThinkleafApp.tsx`

- Added `downloadCorruptedWorkspace()`: reads from the stashed corrupted key first, falls back
  to `STORAGE_KEY` (still intact while autosave is gated), creates a Blob and triggers a
  browser download named `thinkleaf-corrupted-<date>.json`.
- Added an early-return recovery screen (rendered instead of the full workspace) when
  `workspace.corruptedStorageKey` is set:
  - Heading explains the workspace could not be read but data has not been deleted.
  - Body advises downloading before starting fresh.
  - **Download corrupted backup** button triggers `downloadCorruptedWorkspace()`.
  - **Start fresh** button shows a `window.confirm` dialog then calls `workspace.clearCorruptedData()`.
  - Footer points to the browser console for details.

## Files touched

| File | Change |
|------|--------|
| `src/hooks/useWorkspace.ts` | `LoadResult` type, `preserveCorruptedWorkspace`, updated `loadWorkspace`, gated autosave, `corruptedStorageKey` state, `clearCorruptedData` |
| `src/components/ThinkleafApp.tsx` | `downloadCorruptedWorkspace`, recovery screen early-return |
| `codex-notes/corrupted-storage-recovery.md` | This note |

## How corrupted data is preserved

1. On app load, `loadWorkspace()` detects corruption (parse error or shape mismatch).
2. It calls `preserveCorruptedWorkspace(raw)` which writes the original string to
   `thinkleaf.workspace.corrupted.<timestamp>` and returns that key.
3. The hook stores the key in `corruptedStorageKey` state.
4. Autosave is suppressed as long as `corruptedStorageKey !== null`.
5. The user sees the recovery screen; both the stashed key and the original `STORAGE_KEY`
   still hold the corrupted raw string.
6. "Download corrupted backup" reads from the stashed key (or `STORAGE_KEY` as fallback)
   and offers it as a file download.
7. "Start fresh" → confirm dialog → `clearCorruptedData()`:
   - Removes the stashed key.
   - Writes fresh sample workspace to `STORAGE_KEY`.
   - Clears `corruptedStorageKey` state → autosave unblocks, recovery screen disappears.

## How to test

### Trigger a JSON parse failure

1. Open the app and create a page with some content.
2. Open DevTools → Application → Local Storage → `localhost:3000`.
3. Find `thinkleaf.workspace.v1` and replace its value with `{invalid json!!!`.
4. Reload the page.
5. **Expected**: Recovery screen appears (not the normal workspace).
6. **Expected**: A `thinkleaf.workspace.corrupted.<timestamp>` key appears in Local Storage
   containing `{invalid json!!!`.
7. **Expected**: Console shows `[Thinkleaf] Workspace JSON could not be parsed; preserved under …`.
8. Click **Download corrupted backup** → verify a `.json` file downloads containing `{invalid json!!!`.
9. Click **Start fresh** → confirm → verify the normal workspace loads with sample data.
10. Verify `thinkleaf.workspace.corrupted.*` key is gone and `thinkleaf.workspace.v1` holds
    valid JSON.

### Trigger a shape validation failure

1. Set `thinkleaf.workspace.v1` to valid JSON but missing required arrays:
   ```json
   {"profiles":[]}
   ```
2. Reload → recovery screen should appear with the same flow as above.

### Verify autosave is gated

1. Trigger corruption (step 3 above) and reload.
2. On the recovery screen, open DevTools → Application → Local Storage.
3. Observe that `thinkleaf.workspace.v1` still holds the corrupted string (not sample data).
4. Wait 10 seconds — it should still not be overwritten.
