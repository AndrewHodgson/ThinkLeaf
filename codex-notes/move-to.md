# Move To

## What it does

"Move to..." appears in the page three-dot menu and the folder three-dot menu in the left sidebar. It lets users reorganise pages and folders without duplicating or deleting them.

## Scope (beta)

| Action | Supported | Notes |
|---|---|---|
| Move page within same project | ✅ | |
| Move page to different project (same profile) | ✅ | `projectId` + `folderId` updated |
| Move folder within same project | ✅ | `parentFolderId` updated |
| Move folder to different project | ❌ | Would cascade `projectId` to all descendants — deferred post-beta |
| Cross-profile move | ❌ | Sidebar only receives active-profile data |

## Implementation

### `useWorkspace.ts`

**`movePage(pageId, targetProjectId, targetFolderId)`**
- Validates page exists, target project exists, target folder exists and belongs to `page.profileId`
- No-ops if already in the same folder+project
- Updates `projectId`, `folderId`, `profileId`, and `updatedAt` in a single `setData` call
- Page ID is unchanged — `activePageId`, `recentPageIds`, canvas history, favorites, tags, and search are unaffected

**`moveFolder(folderId, targetParentFolderId: string | null)`**
- `null` means project root (clears `parentFolderId`)
- Validates using existing `isValidParentFolder()` (checks same project, same profile, no cycles)
- No cascade — descendant folders and pages retain their own `parentFolderId`/`folderId` unchanged

Both functions are added to the `useWorkspace` return object.

### `Sidebar.tsx`

**Module-level helper `getFolderDescendantIds(folders, folderId): Set<string>`**
- Iterative BFS to collect the folder + all descendants
- Used in `promptMoveFolder` to exclude invalid destinations from the prompt list

**`promptMovePage(page: Page)`**
- Builds destination list: all folders in `data.folders` except the current folder
- Cross-project folders are labelled `"Folder Name (Project Name)"` for clarity
- Uses `window.prompt` with numbered list, consistent with `promptPage`/`promptFolder`
- On valid selection calls `onMovePage(page.id, target.projectId, target.id)`

**`promptMoveFolder(folder: WorkspaceFolder)`**
- Builds destination list for same-project moves:
  - "Project (project root)" if currently nested (`parentFolderId` is set)
  - All peer/parent folders excluding self, descendants, and current parent
- Uses `window.prompt` with numbered list
- On valid selection calls `onMoveFolder(folder.id, destinations[index].parentFolderId)`

**New props on `SidebarProps`**
- `onMovePage: (pageId, targetProjectId, targetFolderId) => void`
- `onMoveFolder: (folderId, targetParentFolderId: string | null) => void`

**Menu placement**
- Page three-dot: after Duplicate, before Rename
- Folder three-dot: after Duplicate, before Rename
- Icon: `ArrowRight` from lucide-react

### `ThinkleafApp.tsx`

Added `onMovePage={workspace.movePage}` and `onMoveFolder={workspace.moveFolder}` to the `<Sidebar>` props.

## What is preserved after a move

- Page body, canvas objects, canvas view state, tags, `isFavorite`, `createdAt`
- `activePageId` (page ID unchanged)
- `recentPageIds` (page ID unchanged)
- Folder's child folders and pages (no cascade needed)
- Backup JSON — all data is in one blob; `normalizeWorkspace` re-validates on import

## How to test

**Page moves**
1. Create two folders in the same project. Add a page to folder A.
2. Open page three-dot → Move to... → choose folder B. Confirm page now appears under folder B.
3. Reload — confirm the move persisted in localStorage.
4. Create a second project with a folder. Open page three-dot → Move to... → choose the other project's folder (should be labelled with project name). Confirm the page disappears from project 1 and appears in project 2.
5. Move the active page. Confirm the app still shows the page content normally.
6. Move a favorited page. Confirm it still appears in Favorites after the move.
7. Search for the moved page by title. Confirm it appears in search results.

**Folder moves**
1. Create a project with two top-level folders A and B. Add a subfolder C inside A.
2. Open B's three-dot → Move to... → choose A. Confirm B is now nested inside A.
3. Open C's three-dot → Move to... → confirm "project root" option appears. Choose it. Confirm C moves to project root.
4. Try to move A into its own subfolder C — confirm C is not listed (descendant excluded).
5. Reload — confirm moves persisted.

**Invalid/edge cases**
1. Enter a non-number in the prompt → "Invalid selection" alert.
2. Enter a number out of range → "Invalid selection" alert.
3. Open Move to... for the only folder in a project at project root — confirm "No valid destinations" alert.
4. Export backup → re-import backup → confirm moved structure is restored correctly.

## Known limitations (acceptable for beta)

- Folder moves are same-project only. Cross-project folder moves would require cascading `projectId` updates to all descendant folders and pages — deferred.
- Cross-profile moves not supported. The Sidebar only receives `activeProfileData`.
- No visual "undo" after a move — use Restore Backup if a mistake was made.
