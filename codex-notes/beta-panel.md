# Beta Panel

## What it is

A dedicated "Beta" pill button in the bottom toolbar, immediately to the right of the Settings button. It opens a dropdown containing all beta-specific messaging and tools, isolated from the permanent Settings controls.

## Why it exists

- Keeps Settings clean — only canvas controls (Snap, Grid, Flow arrows) live there.
- Groups beta-only content (disclosure, backup, feedback) in one place that is easy to remove post-beta.
- Makes backup and feedback visible to testers without cluttering the main interface.

## Location

`src/components/workspace/CanvasCreationToolbar.tsx` — second state-controlled `<div>` after the Settings `<div>`, inside the bottom toolbar flex row.

## Contents

1. **Disclosure text** — "Desktop beta — notes are stored locally in this browser only — not synced to the cloud. Download a backup regularly to keep a copy on your device. Clearing browser data may remove your notes."
2. **Download Backup** — calls `onExportBackup` prop → `exportBackupFile` in `ThinkleafApp.tsx` → exports full workspace JSON.
3. **Restore Backup** — calls `onImportBackup` prop → `requestImportBackupFile` in `ThinkleafApp.tsx` → opens file picker, parses and restores JSON backup.
4. **Reset Beta Workspace** — opens a confirmation modal (see below). Styled red/destructive. Calls `onResetWorkspace` prop after user confirms.
5. **Send Feedback** — `mailto:theycallmehodg@gmail.com?subject=ThinkLeaf%20Beta%20Feedback` link. Replace `href` with a Google Form URL when ready.
6. **Version label** — hardcoded string `"ThinkLeaf Beta v0.1"` at the bottom of the dropdown.

## Reset Beta Workspace — confirmation modal

Clicking "Reset Beta Workspace" in the dropdown sets `isResetConfirmOpen = true` in `CanvasCreationToolbar`. A full-screen overlay (`fixed inset-0 z-50 bg-black/40`) renders a centered card with:
- Warning: "This will permanently delete all projects, folders, pages, notes, and canvas objects stored in this browser. This cannot be undone."
- Recommendation to download a backup first, with a "Download Backup" link that calls `onExportBackup`.
- **Cancel** — closes modal, no changes.
- **Reset Workspace** (red button) — calls `onResetWorkspace`, then closes modal and Beta panel.
- Clicking the backdrop also cancels (same as Cancel button).

`onResetWorkspace` chains through `Workspace.tsx` → `ThinkleafApp.resetBetaWorkspace()` → `workspace.resetWorkspace()` (clears localStorage + sets fresh workspace state) + clears canvas history and image assets in ThinkleafApp.

The reset creates a new workspace via `createBetaResetWorkspace()` in `src/lib/sampleWorkspace.ts` — fresh IDs, current timestamps, one profile (Work), one project (Test Project), one folder (Test Folder), one blank page (Test Page).

**What resets:** all workspace data (projects, folders, pages, canvas objects, profiles, recentPageIds). Canvas undo/redo history. In-memory image asset registry.

**What is preserved:** all separate-key UI preferences (`thinkleaf.snapToGrid`, `thinkleaf.penSettings`, `thinkleaf.ui`, `thinkleaf.canvasCreationToolDefaults`, `thinkleaf.activeShapeType`, `thinkleaf.flowchartConnectorArrow`, `thinkleaf.pageTemplates`, `thinkleaf.recentCustomColors`, `thinkleaf.documentVerticalAlign`). The sidebar expand/collapse state will naturally settle on the new structure — the prune effect removes stale IDs, and the `activePageId` effect auto-expands the new Test Folder.

## Props used

`onExportBackup`, `onImportBackup`, and `onResetWorkspace` — all on `CanvasCreationToolbarProps`, wired from `ThinkleafApp.tsx` through `Workspace.tsx`.

## Styling

The button uses a pill shape (`px-3 rounded-full`) with text label `"Beta"` instead of an icon. Same height (h-9), border, and hover states as other toolbar buttons.

## Open/close behavior

Both Settings and Beta use React state (`isSettingsOpen`, `isBetaOpen`) instead of native `<details>`. A shared `useEffect` in `CanvasCreationToolbar` attaches:
- `document pointerdown` → closes whichever panel's container ref does not contain the click target
- `document keydown` → Escape closes both

Opening Settings closes Beta and vice versa (mutual exclusion on click).

## How to remove post-beta

Delete the Beta `<div ref={betaRef}>` block from `CanvasCreationToolbar.tsx`, and remove the `isBetaOpen`/`betaRef` state/ref. The `onExportBackup` and `onImportBackup` props remain — they are also used by the error boundary fallback UI and the storage error banner, so do not remove those props or the underlying functions.

## How to test

1. Open the app → bottom toolbar should show `?` (help), Settings gear icon, and "Beta" pill.
2. Click Settings → verify only Snap, Grid, Flow arrows appear. No backup or feedback items.
3. Click outside Settings → verify it closes.
4. Press Escape while Settings is open → verify it closes.
5. Click Settings, then click Beta → verify Settings closes and Beta opens.
6. Click Beta → verify: disclosure text, Download Backup, Restore Backup, **Reset Beta Workspace** (red), Send Feedback, version label.
7. Click outside Beta → verify it closes.
8. Click Download Backup → JSON file should download.
9. Click Restore Backup → file picker opens; pick a previously exported JSON → workspace restores.
10. Click Send Feedback → default mail client opens addressed to theycallmehodg@gmail.com with subject "ThinkLeaf Beta Feedback".
11. Verify PDF export still works via page menu → Export PDF (unrelated to backup panel).

**Reset Beta Workspace — test steps:**
12. Create several projects, folders, pages, add canvas objects to at least one page.
13. Click Beta → "Reset Beta Workspace" → confirm the modal appears with warning text and a "Download Backup" link.
14. Click Cancel → verify nothing changed, modal closes.
15. Click Beta → "Reset Beta Workspace" again → click the backdrop (outside the modal card) → verify modal closes without resetting.
16. Click Beta → "Reset Beta Workspace" → click "Download Backup" in the modal → verify JSON downloads. Modal stays open.
17. Click "Reset Workspace" (red button) → verify:
    - Modal closes.
    - Beta panel closes.
    - Sidebar shows only: Test Project > Test Folder > Test Page.
    - Test Page is open and active.
    - Page title is "Test Page", note body is empty, canvas is blank.
    - All previous projects and folders are gone from the sidebar.
18. Reload the page → verify the reset workspace persists (Test Project/Folder/Page still present, no old data).
19. Click Download Backup after reset → verify the downloaded JSON contains only the new reset workspace.
