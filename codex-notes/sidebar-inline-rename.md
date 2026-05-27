# Sidebar Inline Rename

## What it does

Double-clicking the name of a project, folder, or page in the left sidebar enters inline rename mode. A text input replaces the name in place.

- **Enter** — saves and exits rename mode.
- **Escape** — cancels and reverts to the original name.
- **Blur (click outside)** — saves (same as Enter).
- **Empty string** — not saved; previous name is preserved. (`useWorkspace` rename functions guard against empty names.)

The three-dot menu "Rename" item also triggers inline rename (previously used `window.prompt`).

## State and refs

```typescript
type InlineRenameState = { type: "project" | "folder" | "page"; id: string; value: string };
const [inlineRename, setInlineRename] = useState<InlineRenameState | null>(null);
const inlineRenameRef = useRef<InlineRenameState | null>(null);
inlineRenameRef.current = inlineRename; // kept in sync at render time
const renameKeyCommittedRef = useRef(false); // prevents double-commit on blur-after-enter/escape
```

`inlineRenameRef` is updated directly in `handleRenameChange` before calling `setInlineRename`, so `commitRename` always reads the latest value even if called from a stale closure (e.g. an onBlur after multiple keystrokes).

`renameKeyCommittedRef` is set to `true` when Enter or Escape is handled via `onKeyDown`. The `onBlur` handler checks this flag first; if true it resets the flag and returns without committing a second time. This prevents the double-commit that would otherwise occur when Enter causes the input to unmount (which triggers blur).

## Helper functions

`startRename(type, id, name)` — opens inline rename for the given item; closes any open action menu.

`commitRename()` — reads `inlineRenameRef.current`, calls the matching rename hook if trimmed value is non-empty, clears state.

`handleRenameChange(value)` — updates both `inlineRenameRef.current` and React state on every keystroke.

`handleRenameKeyDown(e)` — handles Enter (commit) and Escape (cancel).

`handleRenameBlur()` — commits unless `renameKeyCommittedRef.current` is set.

## Render logic

**Projects** (`Sidebar.tsx`, inside `data.projects.map()`):

Conditional: when `inlineRename?.type === "project" && inlineRename.id === project.id`, render an `<input>` in the same flex slot as the project name button. Otherwise render the normal `<button>` with `onDoubleClick`.

The input has `onPointerDown={(e) => e.stopPropagation()}` to prevent drag tracking from starting.

**Folders** (`renderFolder()` in `Sidebar.tsx`):

Same conditional pattern. In rename mode, a `<div>` wraps the folder icon + input side by side (preserving the icon). The input has `uppercase` + `tracking-wide` to match the folder label font style.

**Pages** (`PageButton.tsx`):

`PageButton` now accepts optional props: `isRenaming`, `renameValue`, `onRenameChange`, `onRenameKeyDown`, `onRenameBlur`, `onDoubleClickTitle`.

When `isRenaming` is true, the component renders a `<div>` (instead of `<button>`) with the icon and an input — avoiding the HTML-invalid `<input>` inside `<button>` pattern.

When not renaming, `onDoubleClick` is placed on the existing title `<button>`.

The rename props are wired in all four `PageButton` call sites in `Sidebar.tsx`:
- Project-tree folder pages
- Project-root pages
- Favorites section
- Search results section

## Drag-and-drop compatibility

Drag tracking starts from `onPointerDown` on wrapper divs. The rename inputs all have `onPointerDown={(e) => e.stopPropagation()}`, preventing drag from starting while rename is active.

For project/folder rows: the normal drag-initiating button is replaced by an input during rename, so no drag-related handler is present at all.

For page rows: the drag wrapper div (`onPointerDown={(e) => handleItemPointerDown(...)`) is still present in the DOM, but the input's `stopPropagation` prevents the event from reaching it.

## Files changed

- `src/components/sidebar/Sidebar.tsx` — rename state/refs, helper functions, conditional render for project and folder name buttons, PageButton rename prop wiring, three-dot "Rename" items updated to use `startRename`
- `src/components/sidebar/PageButton.tsx` — optional rename props, conditional render for rename mode

## How to test

**Double-click project name**
1. Double-click a project name → input appears with the current name selected/editable.
2. Type a new name → press Enter → project name updates.
3. Reload → confirm new name persists.

**Double-click folder name**
1. Double-click a folder name → input appears (folder icon stays visible to the left).
2. Type a new name → press Enter → folder name updates.
3. Reload → confirm persists.

**Double-click page name**
1. Double-click a page title in the project tree → input appears.
2. Type a new name → press Enter → title updates.
3. Also test from Favorites and Search results sections.

**Escape to cancel**
1. Double-click a name → type something → press Escape → original name is restored.

**Blur to save**
1. Double-click a name → type a new name → click elsewhere → name is saved.

**Empty name**
1. Double-click a name → clear the input → press Enter or click outside → name reverts to original (empty string not saved).

**Three-dot menu Rename**
1. Click the three-dot menu on a project/folder/page → "Rename" → same inline input appears.

**Drag-and-drop still works**
1. Rename a folder → confirm drag-and-drop still works on other rows.
2. Start dragging a folder → confirm rename mode does not accidentally activate.

**Expand/collapse still works**
1. Double-click a chevron → only toggles expand/collapse, does not start rename.

**Single-click unchanged**
1. Single-click a project/folder name → selects it (green highlight) with no rename input.
2. Single-click a page → navigates to that page, no rename input.
