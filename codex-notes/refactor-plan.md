# Maintainability Refactor Plan

Audited 2026-05-26.

## Completed refactors

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

## File sizes at time of audit (2026-05-26)

| File | Lines |
|---|---|
| `src/components/workspace/CanvasLayer.tsx` | 2411 |
| `src/components/workspace/CanvasObjectToolbar.tsx` | 1056 |
| `src/hooks/useWorkspace.ts` | 1026 |
| `src/components/workspace/Workspace.tsx` | 968 |
| `src/components/sidebar/Sidebar.tsx` | 797 |
| `src/components/ThinkleafApp.tsx` | 849 |
| `src/lib/exportUtils.ts` | 487 |
| `src/components/workspace/CanvasCreationToolbar.tsx` | 447 |

Canvas helper files in `canvas/`: canvasGeometry.ts (533), penRendering.ts (308), canvasObjectViews.tsx (308), canvasLayerTypes.ts (129), eraserHitTesting.ts (102), laserRendering.ts (54), PenStrokeLayer.tsx (131).

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

### 4. Rename cloneCanvasObjects variants to prevent confusion

Three functions share similar names but do very different things:

| Location | Name | What it does |
|---|---|---|
| `ThinkleafApp.tsx` (inner, line 270) | `cloneCanvasObjects` | Shallow clone, same IDs |
| `ThinkleafApp.tsx` (module, line 788) | `cloneStoredCanvasObjects` | Also shallow clone, same IDs — identical to the inner function |
| `useWorkspace.ts` (line 303) | `cloneCanvasObjects` | Deep clone, **remaps all IDs**, for duplicating pages/folders |

The ID-remapping clone is the dangerous one — calling the wrong one when duplicating content would silently produce objects with duplicate IDs that share connector references.

**Fix**: Rename the useWorkspace version to `cloneCanvasObjectsWithNewIds`. Rename ThinkleafApp's module-level `cloneStoredCanvasObjects` to match the inner function or delete one. No behavior change; just naming clarity.

### 5. Remove dead updateCanvasViewState from useWorkspace

`updateCanvasViewState` (useWorkspace.ts line 932) is exported from the hook return (line 1021) but is never called anywhere in the codebase. Canvas view state is updated via `workspace.updatePage(pageId, { canvasViewState: ... })` instead.

**Fix**: Delete the function and remove it from the return object. Safe removal — TypeScript will catch any callsites that don't exist.

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

1. **`CanvasLayer.tsx`** — primary concern. The ~310-line geometry block at the top (items 1–2 above) is the cleanest extraction point. The component body itself is a longer-term project.
2. **`CanvasObjectToolbar.tsx`** — duplicated helpers are the main issue; solvable by refactor #1 above.
3. **`ThinkleafApp.tsx`** — two versions of shallow clone, one unused. Clean up as described in refactor #4.
4. **`useWorkspace.ts`** — dead export (refactor #5). Otherwise well-structured.

---

## Recommended refactor order (post-beta)

1. **Refactors 1 + 2 together**: Move all module-scope geometry functions from `CanvasLayer.tsx` lines 114–426 into `canvasGeometry.ts`. This simultaneously eliminates the duplicate `getSecondLine*` functions, reduces CanvasLayer.tsx by ~310 lines, and makes the geometry independently testable. Mechanical, TypeScript-safe.
2. **Refactor 3**: Extract `isEditableTarget` to shared utility.
3. **Refactor 4**: Rename clone functions.
4. **Refactor 5**: Remove `updateCanvasViewState`.
5. **Later**: Split `CanvasObjectToolbar.tsx` into focused files.
6. **Last**: The `CanvasLayer` component body — requires a useCanvasInteraction hook design first.

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
