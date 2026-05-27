# Sidebar Color Organization

## What it does

Projects and folders can be assigned an optional accent color from their three-dot menus:

- **Project color** — applied to the project title text only (`text-*` class on the name button).
- **Folder color** — applied to the folder icon only (`<Folder>` element). The folder name text remains neutral.
- **Pages** — no color support; intentionally excluded for now.

Colors are preset only: Default, Green, Blue, Purple, Orange, Red, Gray.

Selecting "Default" clears the stored color (stores `undefined`).

## Data model

`SidebarItemColor` type in `src/types/workspace.ts`:

```typescript
export type SidebarItemColor = "green" | "blue" | "purple" | "orange" | "red" | "gray";
```

Added optional `color?: SidebarItemColor` to both `Project` and `Folder` types.

"Default" is never stored — the field is `undefined` when no color is set.

## Persistence

- **localStorage**: `color` is a plain optional string field; it serializes and deserializes naturally as part of the workspace JSON blob.
- **Backup/restore**: `normalizeWorkspace` spreads `...project` and `...folder`, so `color` passes through unchanged. No special normalization added.
- **Folder moves**: `moveFolder` spreads `...f` on every folder it updates, so `color` is preserved across same-project and cross-project drags.
- **Duplicate project/folder**: `copiedFolders` and `copiedProject` spread source fields, so `color` is inherited by duplicates.

## Color map location

`src/components/sidebar/sidebarStyles.ts` is the single source of truth for color → CSS mapping:

| Export | Purpose |
|---|---|
| `SIDEBAR_COLOR_TEXT` | `Record<SidebarItemColor, string>` — Tailwind text class for project name |
| `SIDEBAR_COLOR_ICON` | `Record<SidebarItemColor, string>` — Tailwind text class for folder icon |
| `SIDEBAR_COLOR_OPTIONS` | Array of `{ value, label, swatch }` — drives the color picker UI |

## useWorkspace additions

`colorProject(projectId, color: SidebarItemColor | undefined)` — sets `project.color` or clears it.  
`colorFolder(folderId, color: SidebarItemColor | undefined)` — sets `folder.color` or clears it.

Both update `updatedAt`. Both are exposed on the `useWorkspace` return value.

## Sidebar rendering

`colorPicker(currentColor, onSelect)` — a small helper function defined inside the `Sidebar` component. Renders a row of 7 colored circle buttons (16×16 px) after a thin border separator at the bottom of any three-dot dropdown it's added to. The selected color shows a `ring-2 ring-slate-600` indicator; the rest show a subtle ring on hover.

**Project name button** (inside `data.projects.map()`):
```
const projectTextClass = project.color ? SIDEBAR_COLOR_TEXT[project.color] : "text-slate-800";
```
Applied to the non-selected branch only — the selected branch still uses `text-leaf-700`.

**Folder icon** (inside `renderFolder()`):
```
const folderIconClass = folder.color ? SIDEBAR_COLOR_ICON[folder.color] : "";
```
Applied as an extra class on the `<Folder>` SVG element. When empty, inherits parent text color as before.

## Files changed

- `src/types/workspace.ts` — `SidebarItemColor` type, `color?` on `Project` and `Folder`
- `src/components/sidebar/sidebarStyles.ts` — color map constants
- `src/hooks/useWorkspace.ts` — `colorProject`, `colorFolder` functions
- `src/components/ThinkleafApp.tsx` — `onColorProject`, `onColorFolder` props wired
- `src/components/sidebar/Sidebar.tsx` — props, `colorPicker` helper, color applied to project text and folder icon, picker added to both menus

## How to test

**Set project text color**
1. Open any project three-dot menu → scroll to the Color row at the bottom.
2. Click a color swatch (e.g. Blue) → project title text turns blue.
3. Reload → confirm color persists.

**Set folder icon color**
1. Open any folder three-dot menu → Color row at the bottom.
2. Click a swatch (e.g. Green) → folder icon turns green; folder name text stays neutral.
3. Reload → confirm persists.

**Reset to Default**
1. Open the menu again → click the first swatch (gray circle, labeled "Default") → color clears.

**Backup/restore round-trip**
1. Assign colors to a project and folder.
2. Download Backup → open the JSON → confirm `"color": "blue"` (or similar) appears on the correct project/folder entries.
3. Restore the backup → confirm colors re-appear correctly.

**Folder move preserves color**
1. Assign a color to a folder.
2. Drag it to another project (or use "Move to…").
3. Confirm the folder icon still shows the assigned color after the move.

**Selected and hover states unaffected**
1. Click a colored project name → confirm it highlights green (selected bg + `text-leaf-700` — same as uncolored).
2. Hover a colored project name → confirm it shows the `hover:bg-slate-100` background.
3. Click a colored folder → confirm selected state shows leaf-50 background, text-leaf-700, folder icon retains its color (icon class is additive to text color inheritance).

## Known limitations

- No color on page rows (by design for now).
- Hover text color on colored project names reverts to `text-slate-600` (same hover behavior as uncolored rows).
- No color on Profiles.
