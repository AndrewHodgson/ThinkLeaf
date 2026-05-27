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
4. **Send Feedback** — `mailto:theycallmehodg@gmail.com?subject=ThinkLeaf%20Beta%20Feedback` link. Replace `href` with a Google Form URL when ready.
5. **Version label** — hardcoded string `"ThinkLeaf Beta v0.1"` at the bottom of the dropdown.

## Props used

`onExportBackup` and `onImportBackup` — already on `CanvasCreationToolbarProps`, wired from `ThinkleafApp.tsx` through `Workspace.tsx`. No new props required.

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
6. Click Beta → verify: disclosure text, Download Backup, Restore Backup, Send Feedback, version label.
7. Click outside Beta → verify it closes.
8. Click Download Backup → JSON file should download.
9. Click Restore Backup → file picker opens; pick a previously exported JSON → workspace restores.
10. Click Send Feedback → default mail client opens addressed to theycallmehodg@gmail.com with subject "ThinkLeaf Beta Feedback".
11. Verify PDF export still works via page menu → Export PDF (unrelated to backup panel).
