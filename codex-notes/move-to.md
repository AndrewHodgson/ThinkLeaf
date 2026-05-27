# Move To

## What it does

Pages and folders can be moved two ways:
1. **Drag-and-drop** — left-click and drag a page or folder row in the project tree. A ghost label follows the cursor; valid drop targets highlight in green. Release over a folder to move into it, or over a project name to move to that project's root.
2. **"Move to..." menu** — fallback available in the three-dot menu on every page and folder row.

Both methods call the same `onMovePage` / `onMoveFolder` hooks and preserve all data.

## Scope (beta)

| Action | Supported | Notes |
|---|---|---|
| Move page within same project | ✅ | |
| Move page to different project (same profile) | ✅ | `projectId` + `folderId` updated |
| Move folder within same project | ✅ | `parentFolderId` updated |
| Move folder to different project (same profile) | ✅ | `projectId` cascaded to all descendant folders and pages |
| Cross-profile move | ❌ | Sidebar only receives active-profile data |
| Drag-and-drop on Favorites / Search sections | ❌ | Project tree only — use "Move to…" from the three-dot menu for those items |
| Drag-and-drop on mobile/tablet | ❌ | Not a beta priority |

## Drag-and-drop implementation

### Location

All drag logic lives entirely in `src/components/sidebar/Sidebar.tsx`. No new files, no library added.

### Mechanism

**Pointer event handlers** on drag sources, `window.addEventListener` for global move/up tracking:

1. `onPointerDown` on the **folder name button** and on a wrapper `div` around each **page row** in the project tree starts drag tracking.
   - Chevron buttons and action menus already call `e.stopPropagation()` on `onPointerDown`, so they never initiate a drag.
2. A **5 px movement threshold** (via `Math.hypot`) separates a click from a drag. Until threshold is exceeded, no drag visual is shown and the normal click handler fires.
3. Once threshold is exceeded:
   - `document.body.style.cursor = "grabbing"` and `userSelect = "none"`
   - React state `dragState` is set → renders the **ghost** (a fixed-position label following the cursor with `pointer-events: none`)
   - `document.elementFromPoint(x, y)` is called on every `pointermove` to detect the element under the cursor. The ghost's `pointer-events: none` lets this work correctly.
4. **Drop target detection** walks up the DOM from the hovered element looking for `data-drop-folder-id` / `data-drop-folder-project-id` (folder targets) or `data-drop-root-project-id` (project-root targets). The first match is validated via `isValidDrop()`.
5. `visualDropTarget` React state is updated → valid targets gain `bg-leaf-100 ring-1 ring-leaf-300` styling.
6. On `pointerup`:
   - Adds a one-shot `capture: true` window click listener to swallow the synthetic click that fires after pointerup, preventing accidental folder/page selection.
   - Calls `executeDrop(type, id, target)` which delegates to `onMovePage` or `onMoveFolder`.
   - Clears all drag state.

### Validity rules

**Page drags:**
- Any folder (including cross-project within the same profile) is valid, except the page's current folder.
- Any project root is valid, except if the page is already at that project's root.

**Folder drags:**
- Cannot drop into self or any descendant (uses `getFolderDescendantIds` BFS; cross-project targets can never be descendants so cycle is impossible cross-project).
- Same-project: cannot drop into current parent (no-op). Cross-project: always valid.
- Same-project root: valid only if folder is currently nested. Cross-project root: always valid.
- Profile boundary is enforced server-side in `moveFolder`; sidebar only shows same-profile projects so this is never exposed to the user.

### State and refs

| Symbol | Type | Purpose |
|---|---|---|
| `dragTrackRef` | `useRef` | Mutable drag tracking (start pos, threshold, active drop target) — no re-renders per frame |
| `dragListenersRef` | `useRef` | Pointers to `onMove`/`onUp` for cleanup on unmount |
| `dataRef` | `useRef` | Always-current copy of `data` prop for use inside event listener closures |
| `dragState` | `useState` | Item type/id/label + cursor position for rendering ghost and source opacity |
| `visualDropTarget` | `useState` | Currently highlighted drop target for rendering |

### Files changed

- `src/components/sidebar/Sidebar.tsx` — all drag logic, drop zone attributes, ghost element

### `useWorkspace.ts`

**`movePage(pageId, targetProjectId, targetFolderId)`**
- Validates page exists, target project exists, target folder exists and belongs to `page.profileId`
- No-ops if already in the same folder+project
- Updates `projectId`, `folderId`, `profileId`, and `updatedAt` in a single `setData` call
- Page ID is unchanged — `activePageId`, `recentPageIds`, canvas history, favorites, tags, and search are unaffected

**`moveFolder(folderId, targetParentFolderId: string | null, targetProjectId?: string)`**
- `targetProjectId` defaults to the folder's current project (same-project behavior unchanged)
- `null` parent means project root (clears `parentFolderId`)
- **Same-project**: validates via `isValidParentFolder()` (cycle check + same profile); updates only `parentFolderId`
- **Cross-project**: validates target parent belongs to target project; BFS-collects all descendant folder IDs; cascades `projectId` update to the folder, all descendant folders, and all pages contained in those folders. `parentFolderId` relationships within the subtree are preserved (IDs don't change, only `projectId`)
- Profile boundary guard: rejects if `targetProject.profileId !== folder.profileId`

### `Sidebar.tsx` helpers

**`getFolderDescendantIds(folders, folderId): Set<string>`** — iterative BFS used for cycle detection in both prompt flow and drag validation.

**`isValidDrop(dragItem, target)`** — UI-side validity check, using `dataRef.current` for always-fresh data.

**`findDropTargetFromElement(el, dragItem)`** — walks up from `elementFromPoint` result to find the nearest `data-drop-*` attribute and validates it.

**`promptMovePage(page)` / `promptMoveFolder(folder)`** — unchanged `window.prompt` fallbacks still available from the three-dot menu.

## What is preserved after a move

- Page body, canvas objects, canvas view state, tags, `isFavorite`, `createdAt`
- `activePageId` (page ID unchanged)
- `recentPageIds` (page ID unchanged)
- Folder's child folders and pages (no cascade needed)
- Backup JSON — all data is in one blob; `normalizeWorkspace` re-validates on import

## How to test

**Drag page from root into folder**
1. Create a project with a folder and a root-level page (no folder).
2. Drag the root page onto the folder header → confirm page moves inside the folder.
3. Reload — confirm persisted.

**Drag page from folder to another folder**
1. Create folder A and folder B in the same project. Add a page to A.
2. Drag the page from A onto folder B header → confirm page is now in B.

**Drag page from folder to project root**
1. Page inside a folder → drag onto the project name (header row) → confirm page moves to project root.

**Drag folder into another folder**
1. Two top-level folders A and B → drag B onto A → confirm B is now nested inside A.

**Drag folder back to project root**
1. Nested folder B inside A → drag B onto the project name → confirm B is now top-level.

**Invalid moves**
1. Try dragging a folder onto itself → no highlight, no move.
2. Try dragging a parent folder onto one of its descendant folders → no highlight, no move.
3. Try dragging a same-project folder onto its current parent → no highlight, no move.

**Cross-project page drag**
1. Create two projects each with a folder. Drag a page from project 1's folder onto project 2's folder → confirm page moves to project 2.

**Cross-project folder drag**
1. Create two projects: P1 with folder A (containing subfolder B and page X), and P2 with folder C.
2. Drag folder A onto P2's folder C → confirm A nests inside C; confirm subfolder B and page X also appear under P2 after reload.
3. Drag folder A (now in P2) onto the P1 project name → confirm A moves back to P1 root; confirm B and X cascade back.
4. Drag a top-level folder from P1 onto the P2 project name → confirm it moves to P2 root.

**Accidental-click protection**
1. Single-click a folder name → verify folder selects (no drag fires).
2. Single-click a page → verify page opens (no drag fires).
3. Single-click the expand chevron → verify fold/unfold (no drag fires).
4. Single-click the three-dot menu → verify menu opens (no drag fires).

**"Move to…" still works**
- Open page three-dot → Move to... → confirm prompt still appears and works.
- Open folder three-dot → Move to... → confirm same.

**Persistence checks**
- Search for moved page → confirm it appears.
- Reload → confirm all moves survived.
- Export backup → re-import → confirm structure correct.

## Known limitations (acceptable for beta)

- Cross-profile moves not supported. The Sidebar only receives `activeProfileData`; the `moveFolder` profile guard enforces this server-side too.
- Dragging only works from the project tree (not Favorites or Search sections) — use "Move to…" from the three-dot menu for those.
- No drag-and-drop on mobile/tablet.
- No visual undo after a drag drop — use Restore Backup if a mistake was made.
- Folder auto-expand on hover during drag is not implemented; expand folders in the destination project before dragging into them.
