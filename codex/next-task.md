# Next Codex Task: Manual QA and Polish Pass

## Goal

Run a short manual browser QA/polish pass before starting new feature work.

Keep this pass focused on confirming current behavior, fixing small regressions, and tightening obvious rough edges. Do not add new major features.

The latest code-path QA/build pass after the whiteboard text formatting fix passed. The remaining recommended work is hands-on browser verification with real clicks, typing, image import, trackpad gestures, refreshes, and profile/page switching.

## QA Focus

1. Profiles
   - Create, rename, delete, and switch profiles.
   - Confirm existing migrated data appears in the default Work profile.
   - Confirm search and favorites only show active-profile pages.

2. Image Insert
   - Insert and paste images into the main document.
   - Import and paste images onto the whiteboard.
   - Confirm resized/compressed images persist after refresh.

3. Color Pickers
   - Check text color, highlight, stroke, and fill pickers.
   - Confirm popovers close cleanly.
   - Confirm clicking a swatch applies the color before the popover closes.
   - Confirm custom HEX colors apply and recent colors only contain custom colors.

4. Toolbar Shortcuts
   - Confirm 1-8 tool/image shortcuts work outside editable fields.
   - Confirm + and = zoom in, - zooms out, and shortcut badges remain accurate.
   - Confirm shortcuts do not trigger inside editors, inputs, textareas, selects, or contenteditable areas.
   - Confirm Cmd/Ctrl+Z undoes canvas actions outside the main document editor.
   - Confirm Cmd/Ctrl+Shift+Z and Cmd/Ctrl+Y redo canvas actions outside the main document editor.
   - Confirm Undo and Redo buttons sit between Reset View and Settings and are muted when unavailable.
   - Confirm Tiptap keeps its own undo/redo while typing in the main document.
   - Confirm the main document and bottom toolbar do not log disabled-attribute hydration mismatches on initial load.

5. Canvas Navigation
   - Confirm pan, zoom, Reset View, and the zoom percentage indicator work.
   - Confirm two-finger trackpad scroll pans the canvas horizontally and vertically.
   - Confirm Ctrl/Cmd + wheel still zooms and plain trackpad scroll does not accidentally zoom.
   - Confirm trackpad panning works over the document body even when the editor is focused.
   - Confirm trackpad panning does not interfere with typing, cursor placement, text selection, tables, or formatting controls.
   - Confirm toolbars, contextual controls, dropdowns, color pickers, inputs, and menus do not trigger canvas pan.
   - Confirm the bottom toolbar stays fixed while panning, zooming, selecting, and showing contextual controls.

6. Snap and Grid
   - Confirm Show Grid and Snap to Grid are separate.
   - Confirm Snap to Grid persists and affects creation, movement, resizing, and line/arrow endpoints when enabled.
   - Confirm free movement works when Snap to Grid is disabled.

7. Object Editing
   - Confirm rectangles, circles, text boxes, lines, arrows, and images can be created, selected, moved, resized, styled, and deleted.
   - Confirm selected canvas object controls appear in the top contextual toolbar and the old right-side properties panel is gone.
   - Confirm duplicate and delete work from the top contextual toolbar.
   - Confirm line and arrow creation previews naturally and endpoint editing still works.
   - Confirm canvas undo/redo works per page for create, delete, move, resize, style changes, whiteboard text edits, and inserted image objects.

8. Formatting
   - Confirm main document formatting, tables, alignment, text color, highlight, and text size work.
   - Confirm the main document formatting row stays visible at the top of the workspace and stays out of the page content.
   - Confirm H1/H2/H3 and text size indicators update when moving the cursor between differently formatted text.
   - Confirm toolbar text controls apply to the document when the main editor is active.
   - Confirm toolbar text controls apply to selected whiteboard text boxes and text-bearing shapes without changing the main document.
   - Confirm whiteboard text selection stays active while using toolbar buttons, size menus, color pickers, and highlight pickers.
   - Confirm non-text canvas selections do not expose document text-formatting actions.
   - Confirm clicking from a selected whiteboard object into the document clears object selection and swaps to the document toolbar.
   - Confirm document table row/column/delete controls appear on toolbar row 2 only while the cursor is inside a table.
   - Confirm whiteboard object fill, stroke, stroke width, stroke style, text, highlight, and text size controls appear on toolbar row 2 where applicable.
   - Confirm whiteboard text boxes and text-bearing shapes support bold, italic, alignment, vertical alignment, text color, highlight, and size.

9. Persistence
   - Refresh and switch profiles/pages to confirm localStorage restores page content, canvas objects, images, preferences, profile selection, and canvas view state.

## Future Ideas

Keep future feature ideas in `notes/feature-ideas.md`. Page Types, document block lock/unlock, connectors, pen, eraser, layers, expanded document/cross-page history, and laser pointer are not part of this QA pass.

## Verification

Run:

- `npm run build`

## Response Format

After completing the pass, summarize:

1. Files changed
2. What was tested
3. Bugs found
4. Bugs fixed
5. Build status
6. Remaining issues
7. Recommended next step
