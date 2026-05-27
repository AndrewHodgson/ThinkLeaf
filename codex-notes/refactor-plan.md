# Maintainability Refactor Plan

Audited 2026-05-26.

## Completed refactors

### Safety cleanup — Rename ID-remapping clone + dead code removal (2026-05-27)

Three items from the post-beta refactor backlog were low-risk enough to do before beta and were completed:

1. **Renamed `cloneCanvasObjects` → `cloneCanvasObjectsWithNewIds`** in `useWorkspace.ts`. This is the function that deep-clones canvas objects and remaps all IDs (including `sourceObjectId`/`targetObjectId` for connectors). The shallow-clone helpers in `ThinkleafApp.tsx` are unrelated and unchanged. Four call sites updated (all within `useWorkspace.ts`).

2. **Deleted `updateCanvasViewState`** from `useWorkspace.ts`. The function was exported on the return object but had zero external callsites. Canvas view state is updated via the generic `updatePage` hook.

3. **Deleted `SidebarSection.tsx`** — a component file that was defined and exported but never imported anywhere in the codebase.

Build confirmed clean after all three changes.

---

### Refactors 1 + 2 — Move geometry math block + eliminate duplicate helpers (2026-05-26)

Moved all 21 module-scope pure functions from `CanvasLayer.tsx` lines 114–426 into `canvasGeometry.ts`. This eliminated the five functions that were duplicated between `CanvasLayer.tsx` and `CanvasObjectToolbar.tsx`. Both files now import from `canvasGeometry.ts`.

**Functions exported from canvasGeometry.ts** (needed by CanvasLayer component body or CanvasObjectToolbar):
`getConnectorLineMode`, `getSecondLineStrokeColor`, `getSecondLineStrokeWidth`, `getSecondLineStrokeStyle`, `getSecondLineArrowDirection`, `getSecondLineStrokeDashArray`, `getLineMarkerUrl`, `getDoubleLinePathData`

**Functions added as unexported helpers** (only called by functions within canvasGeometry.ts):
`getDoubleCurvePathData`, `getDoubleElbowPathData`, `getDoubleLineOffsetDistance`, `getStraightDoubleLineNormal`, `getEndpointSeparatedPoint`, `getAnchorTangent`, `getOffsetQuadraticCurvePoints`, `getQuadraticCurvePoint`, `getQuadraticCurveTangent`, `getPointPathData`, `getOffsetPolylinePoints`, `getOffsetSegment`, `getLineIntersection`

**Behavior change**: None. `getConnectorLineMode` in CanvasObjectToolbar was missing an `isConnectedLine` guard — the canonical version (with the guard) is now the single source of truth.

**File sizes after**:

| File | Before | After | Delta |
|---|---|---|---|
| `CanvasLayer.tsx` | 2411 | 2105 | −306 |
| `CanvasObjectToolbar.tsx` | 1056 | 1034 | −22 |
| `canvasGeometry.ts` | 533 | 850 | +317 |

Build confirmed clean: `npm run build` passes with no TypeScript errors.

---

## File sizes — updated 2026-05-27

| File | Lines | Notes |
|---|---|---|
| `src/components/workspace/CanvasLayer.tsx` | 2106 | Down from 2411 after geometry extraction |
| `src/components/workspace/RichTextEditor.tsx` | 1632 | Not previously audited |
| `src/components/sidebar/Sidebar.tsx` | 1383 | Up from 797 — grew significantly since May 26 audit |
| `src/hooks/useWorkspace.ts` | ~1160 | Down slightly after dead code removal |
| `src/components/workspace/CanvasObjectToolbar.tsx` | 1034 | |
| `src/components/workspace/Workspace.tsx` | 968 | |
| `src/components/workspace/canvas/canvasGeometry.ts` | 850 | Up from 533 after geometry extraction |
| `src/components/ThinkleafApp.tsx` | 852 | |
| `src/lib/exportUtils.ts` | 676 | |
| `src/components/workspace/CanvasCreationToolbar.tsx` | 518 | |

Canvas helper files in `canvas/`: canvasObjectViews.tsx (308), penRendering.ts (308 est.), canvasLayerTypes.ts (129 est.), PenStrokeLayer.tsx (131 est.), eraserHitTesting.ts (102 est.), laserRendering.ts (54 est.).

---

## High-value, safe refactors

### 1. Eliminate duplicated connector/second-line helpers (CanvasLayer ↔ CanvasObjectToolbar)

The following functions are **defined twice** — once in `CanvasLayer.tsx` (lines 114–143) and again in `CanvasObjectToolbar.tsx` (lines 998–1027):

- `getConnectorLineMode`
- `getSecondLineStrokeColor`
- `getSecondLineStrokeWidth`
- `getSecondLineStrokeStyle`
- `getSecondLineArrowDirection`

**Fix**: Export them from `canvasGeometry.ts`. Both files import from there. Zero behavior change. Pure mechanical move.

### 2. Move double-line rendering math out of CanvasLayer.tsx into canvasGeometry.ts

`CanvasLayer.tsx` lines 114–426 are pure geometry/math functions that have no dependency on React or component state:

- `getLineMarkerUrl`, `getDoubleLinePathData`, `getDoubleCurvePathData`, `getDoubleElbowPathData`
- `getDoubleLineOffsetDistance`, `getStraightDoubleLineNormal`
- `getEndpointSeparatedPoint`, `getAnchorTangent`
- `getOffsetQuadraticCurvePoints`, `getQuadraticCurvePoint`, `getQuadraticCurveTangent`
- `getPointPathData`, `getOffsetPolylinePoints`, `getOffsetSegment`, `getLineIntersection`

Moving these to `canvasGeometry.ts` reduces `CanvasLayer.tsx` by ~310 lines and makes the geometry testable in isolation. The functions are already self-contained — no closures. This also resolves refactor #1 naturally if done together.

**Risk**: Low. Pure function move. TypeScript will catch any import misses.

### 3. Extract isEditableTarget to a shared utility

`isEditableTarget` is defined identically in two files:
- `ThinkleafApp.tsx` (line 673)
- `CanvasLayer.tsx` (line 2227)

**Fix**: Move to `src/lib/workspaceUtils.ts` or a new `src/lib/domUtils.ts` and import from both. Three-line function.

### 4. Rename cloneCanvasObjects variants to prevent confusion ✅ Partially done (2026-05-27)

The dangerous half is resolved: `cloneCanvasObjects` in `useWorkspace.ts` was renamed to `cloneCanvasObjectsWithNewIds`. The two shallow-clone helpers in `ThinkleafApp.tsx` (inner `cloneCanvasObjects` and module-level `cloneStoredCanvasObjects`) still exist as duplicate identical functions but are harmless — they are both shallow-clone, same-IDs. One of them could be deleted post-beta.

### 5. Remove dead updateCanvasViewState from useWorkspace ✅ Done (2026-05-27)

Deleted. No callsites existed outside the hook. Canvas view state continues to be updated via `workspace.updatePage(pageId, { canvasViewState: ... })`.

---

## Risky refactors — avoid before beta

### CanvasLayer.tsx component split

`CanvasLayer` component body (lines 427–2226) is ~1800 lines with ~60 inner functions. Splitting it into sub-components or hooks is tempting but risky because:

- All inner functions close over the same set of state variables (`interaction`, `editingTextId`, `objectsRef`, etc.)
- Extracting them requires either prop drilling or a custom hook that re-exposes the same state
- The event handler chain (`pointerDown → pointerMove → pointerUp`) has subtle ordering requirements
- Any split would require integration testing of all canvas interactions

This is **post-beta work**. The correct approach is a `useCanvasInteraction` custom hook that encapsulates the interaction state machine, but this is a significant structural change.

### useWorkspace.ts split

All CRUD functions share the same `setData`/`setActivePageId` state pair and have interplays (e.g., `deleteProject` calls `setActivePageId`, `createProfile` atomically updates all arrays). Splitting into separate hooks or services requires lifting the state to a context provider — a meaningful architectural change. Leave intact.

### handleCanvasPointerMove refactor

The 192-line `handleCanvasPointerMove` (lines 1298–1490) handles all pointer-move cases: pan, resize, move, endpoint drag, connector path drag, eraser, and pen drawing. Each case branches cleanly on `interaction.kind`. Splitting it would require the sub-functions to receive or close over the same interaction state. Low value for the risk.

### CanvasObjectToolbar split

The file exports 3 components: `PenToolToolbar`, `CanvasToolDefaultsToolbar`, and `CanvasObjectToolbar`. These could live in separate files (`PenToolToolbar.tsx`, etc.). But they share `ToolbarDropdown`, `SegmentLabel`, `toolbarButtonClass`, and other local helpers. Moving requires a shared helper module. Medium effort, moderate value. Safe but not urgent.

---

## Files most in need of cleanup

1. **`CanvasLayer.tsx`** — 2,106 lines; ~1,800-line component body is the longer-term project. Geometry extraction already done.
2. **`RichTextEditor.tsx`** — 1,632 lines; not yet audited for split opportunities. Worth reviewing post-beta.
3. **`Sidebar.tsx`** — 1,383 lines (up from 797 six sessions ago). Coherent but growing fast.
4. **`CanvasObjectToolbar.tsx`** — 1,034 lines; three components sharing local helpers; medium-effort split possible.
5. **`ThinkleafApp.tsx`** — two identical shallow-clone helpers; minor cleanup, low risk.

---

## Recommended refactor order (post-beta)

1. ~~**Refactors 1 + 2 together**: Move geometry functions from `CanvasLayer.tsx` into `canvasGeometry.ts`.~~ Done 2026-05-26.
2. **Refactor 3**: Extract `isEditableTarget` to shared utility (`src/lib/domUtils.ts`). Three-line function currently duplicated in `ThinkleafApp.tsx` and `CanvasLayer.tsx`.
3. ~~**Refactor 4**: Rename `cloneCanvasObjects` in `useWorkspace.ts`.~~ Done 2026-05-27. Remaining: consolidate the two identical shallow-clone helpers in `ThinkleafApp.tsx`.
4. ~~**Refactor 5**: Remove `updateCanvasViewState`.~~ Done 2026-05-27.
5. **New**: Audit `RichTextEditor.tsx` (1,632 lines) for split opportunities — not previously in the plan.
6. **Later**: Split `CanvasObjectToolbar.tsx` into focused files.
7. **Last**: The `CanvasLayer` component body — requires a `useCanvasInteraction` hook design first.

---

## Recommended first refactor — detailed plan

**Goal**: Move `CanvasLayer.tsx` lines 114–426 into `canvasGeometry.ts`.

**Steps**:
1. Cut lines 114–426 from `CanvasLayer.tsx` (the 18 module-scope functions before `export function CanvasLayer`).
2. Paste into `canvasGeometry.ts`. Add `export` to the 5 functions that `CanvasObjectToolbar.tsx` needs: `getConnectorLineMode`, `getSecondLineStrokeColor`, `getSecondLineStrokeWidth`, `getSecondLineStrokeStyle`, `getSecondLineArrowDirection`.
3. Update `CanvasLayer.tsx` imports to pull from `canvasGeometry.ts`.
4. Update `CanvasObjectToolbar.tsx`: delete its local copies of the 5 `getSecondLine*`/`getConnectorLineMode` functions and import from `canvasGeometry.ts`.
5. Run `npm run build` — TypeScript will catch any missed references.

**Files touched**: `CanvasLayer.tsx`, `CanvasObjectToolbar.tsx`, `canvasGeometry.ts`.
**Behavior change**: None. Pure function move.
**Estimated effort**: 30–45 minutes including QA.

---

## Not worth touching

- `exportUtils.ts` inline CSS template — functional, isolated; cosmetic-only improvement possible. Note: the canvas SVG renderer in this file was substantially rewritten 2026-05-26 to fix arrowheads, double-line connectors, elbow/curve paths, and stroke-dasharray in PDF export. See `codex-notes/pdf-export-canvas.md`.
- `CanvasCreationToolbar.tsx` (447 lines) — reasonable for a feature-rich toolbar
- `Sidebar.tsx` (797 lines) — medium-large but sidebar complexity is real; no urgent split needed
- `ColorPicker.tsx`, `TagEditor.tsx`, `RichTextEditor.tsx` — appropriate sizes
- `sampleWorkspace.ts` (55 lines), `storage.ts` (24 lines), `workspaceUtils.ts` (68 lines) — all small and focused
- `canvasStyle.ts` (174 lines) — config/constants, appropriate size
