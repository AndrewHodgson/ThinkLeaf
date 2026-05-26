# Undo History Memory Behavior

## Audit findings

### Where undo/redo history lives

`canvasHistoryByPage` is React state (`useState`) in `ThinkleafApp`. It is a `Record<string, CanvasPageHistory>` keyed by page ID. Each `CanvasPageHistory` has an `undoStack` and a `redoStack`, each capped at `CANVAS_HISTORY_LIMIT = 25` entries. Each entry is a `CanvasObject[]` snapshot.

**History is never written to localStorage.** There is no `useEffect` that persists `canvasHistoryByPage`. It is session-only; reloading the page clears it.

### Why imageDataUrl strings are a concern

`CanvasObject` has an optional `imageDataUrl?: string` field for image objects. A base64-encoded image is typically 100KB–500KB. Each undo entry is a shallow clone of the full canvas objects array (including all image objects). While JavaScript shares string references in shallow clones (so the same string bytes are not naively duplicated), each undo entry still holds a live reference to every `imageDataUrl` string that was on the canvas at the time of recording. This matters because:

- If a user adds an image and then does 25 more operations, 25 undo entries each hold a reference to that `imageDataUrl` string, preventing it from being garbage collected while those entries exist.
- If a user adds an image, deletes it, and continues working, the deleted image's `imageDataUrl` remains referenced by history entries until they age off the stack (up to 25 more operations later).
- With the default 25-entry limit on both the undo and redo stacks, up to 50 entries can accumulate simultaneously, each referencing the full set of images that were on the canvas at the time.

## What was changed

### `src/components/ThinkleafApp.tsx`

**Added `imageAssetsByPageRef`** — a `useRef<Record<string, Record<string, string>>>({})` holding a per-page map of `objectId → imageDataUrl`. Using a ref (not state) avoids re-renders on asset collection. The map is populated before any snapshot is created, so assets are always available before stripping happens.

**Added `collectPageImageAssets(pageId, objects)`** — scans canvas objects and adds any image object's `imageDataUrl` to the asset map for that page. Safe to call multiple times; does not overwrite existing entries.

**Added `cloneHistorySnapshot(objects)`** — creates a shallow clone of the canvas objects array with `imageDataUrl` removed from image objects. This is what goes into undo/redo history entries. Replaces bare `cloneCanvasObjects` calls when recording history.

**Added `restoreHistorySnapshot(pageId, objects)`** — creates a shallow clone with `imageDataUrl` re-injected from the asset map, by object ID. This is what gets passed to `workspace.updatePage` during undo/redo. If an asset is missing from the map (should not happen in normal use), the image is restored without its dataUrl — it would render as a broken image rather than crashing.

**Updated `updateCanvasObjects`** — collects assets from both the current canvas state and the incoming new state before recording the history snapshot. History entries use `cloneHistorySnapshot` instead of `cloneCanvasObjects`.

**Updated `undoCanvas`** — collects assets from the current live state (which has the full imageDataUrl) before overwriting it. The current state is pushed to the redo stack as a stripped snapshot; the undo entry is restored via `restoreHistorySnapshot`.

**Updated `redoCanvas`** — same pattern as `undoCanvas` in reverse.

**`cloneCanvasObjects` unchanged** — still used for live-state operations: `workspace.updatePage` calls (where full data is required), `duplicateSelectedObject`, and `savePageAsTemplate`. These paths continue to carry the full `imageDataUrl`.

## What stays the same

- Undo/redo history is still not persisted to localStorage.
- History is still capped at 25 entries per stack per page.
- localStorage writes still happen on every canvas change (one write per change, not per history entry — this was already the case).
- Export backup (`exportWorkspaceBackup`) reads `workspace.data` which always has the full `imageDataUrl`. Unaffected.
- PDF export reads `activePage.canvasObjects` from live state. Unaffected.
- Import backup writes full data into workspace state. Unaffected.
- Page templates save `page.canvasObjects` via `cloneCanvasObjects` (full data). Unaffected.

## Memory impact

Before: 25 undo entries × N image objects, each referencing the full `imageDataUrl` string. Old image strings from deleted images could be pinned in memory for up to 25 more operations.

After: history entries hold image objects with `imageDataUrl: undefined`. The asset map holds exactly one entry per unique image seen on the page in the current session. Old images that are deleted from the canvas still exist in the asset map (needed for undo recovery) but the map does not grow with history depth — it only grows when new unique images are inserted.

The asset map is bounded by the number of unique images ever inserted on a page during the session, not by the undo history depth. In the typical case this is a small number (single digits). The map is cleared on page reload.

## How to test

### Normal shapes (no images)

1. Create a rectangle, circle, and diamond on the canvas.
2. Move them around.
3. Undo/redo several times.
4. Confirm shapes appear and disappear correctly and match their states.

### Text objects

1. Create a text box, type something.
2. Move it.
3. Undo → text box should return to original position.
4. Redo → returns to moved position.

### Pen strokes

1. Draw several strokes with the Pen tool.
2. Undo → strokes disappear one history step at a time.
3. Redo → strokes reappear.

### Flowchart connectors

1. Create two rectangles, connect them with an arrow.
2. Move a rectangle (connector should stay connected).
3. Undo → rectangle returns to previous position, connector adjusts.
4. Redo → rectangle and connector return to moved position.

### Inserted images (most important for this fix)

1. Import an image via the toolbar (key 8) or paste.
2. Do several non-image canvas operations (draw a shape, move it, etc.).
3. Undo back past the image insertion — image should disappear from canvas.
4. Redo — image should reappear with correct appearance (not broken).
5. Delete the image. Do several more operations. Undo back past the deletion — image should reappear correctly.
6. Verify the exported backup JSON contains the full `imageDataUrl` for images.
7. Verify the PDF export shows images correctly after undo/redo operations.

### Export after undo/redo

1. Import an image, undo, redo (to confirm image is restored).
2. Export backup — verify the JSON contains the `imageDataUrl`.
3. Export PDF — verify the image appears in the canvas page of the PDF.

## Known limitations

- The asset map holds every unique image seen on the page during the session. If a user inserts and deletes many large images, the map accumulates their dataUrls in React memory for the duration of the session. This is bounded by session activity, not history depth. A page reload clears it.
- Images on pages loaded from localStorage that the user never performs a canvas operation on will not be added to the asset map. This is fine because no undo history exists for those pages (history clears on page load), so `restoreHistorySnapshot` is never called for objects from those pages without a prior `collectPageImageAssets` call.
