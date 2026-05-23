# Next Codex Task: Manual QA, Polish, and Maintainability Triage

## Goal

Run a short manual browser QA/polish pass before starting new feature work, then identify any low-risk maintainability cleanup needed for large canvas/editor modules.

Keep this pass focused on confirming current behavior, fixing small regressions, and tightening obvious rough edges. Do not add new major features.

The latest code-path/build check passed after adding persisted creation defaults for Rectangle, Circle, Line, Arrow, and Text Box tools. The remaining recommended work is hands-on browser verification with real clicks, drawing, typing, image import, trackpad gestures, refreshes, and profile/page switching.

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
   - Confirm 1-9 tool/image/pen shortcuts and 0 Eraser shortcut work outside editable fields.
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
   - Confirm rectangles, circles, text boxes, lines, arrows, images, and pen strokes can be created, selected, moved, styled, duplicated, and deleted.
   - Confirm pen drawing ignores Snap to Grid and feels natural while drawing.
   - Confirm Pen, Ink, and Highlighter do not show a selection bounding box while actively drawing.
   - Confirm Eraser shows a compact circular cursor with a subtle movement trail and a low-opacity circle-overlap preview.
   - Confirm Eraser shows the same low-opacity preview while actively click-drag erasing before objects are removed.
   - Confirm active Eraser drag keeps touched objects ghosted until pointer release, then removes them in one undoable action.
   - Confirm hovering with Eraser does not delete objects.
   - Confirm Eraser removes whole Pen, Ink, Highlighter, shape, text box, line, arrow, and image objects by click or drag.
   - Confirm Eraser deletions support canvas undo/redo.
   - Confirm pen stroke color and compact width dropdown work from the top contextual toolbar.
   - Confirm active Pen tool settings show in the top toolbar and persist after refresh.
   - Confirm changing Pen width/mode while the Pen tool is active affects the very next new stroke.
   - Confirm selected pen strokes can change smoothing Off/Light/Medium/High/Very High and mode Pen/Ink/Highlighter.
   - Confirm Smoothing and Ink Density use compact dropdowns.
   - Confirm Ink Density appears only when Ink mode is active or selected.
   - Confirm Low, Medium, High, and Very High Ink Density progressively increase visible width variation.
   - Confirm Highlighter defaults to yellow, uses a wider semi-transparent rounded stroke, and works over document text, images, and whiteboard objects.
   - Confirm highlighter strokes can be selected, moved, duplicated, deleted, undone/redone, and persist after refresh.
   - Confirm Laser Pointer mode draws temporary fixed-width glowing strokes while dragging, with tightened layered outer/middle/inner glow strokes instead of point-like blobs.
   - Confirm Laser Pointer color can be changed, defaults to red, persists after refresh, and safely falls back to red if saved color data is missing or invalid.
   - Confirm Laser Pointer fade duration dropdown appears only in Laser mode, persists after refresh, and Normal/Long/Longer/Longest progressively slow the trail fade.
   - Confirm Laser Pointer strokes pan/zoom with the canvas, fade from the tail after release, do not persist after refresh, and do not affect undo/redo history.
   - Confirm Ink mode visibly differs from Pen mode with subtle speed-responsive variable-width strokes.
   - Confirm Ink strokes use smooth curved edges without visibly jagged segment joins.
   - Confirm slower Ink drawing feels thicker and faster Ink drawing feels thinner without looking messy.
   - Confirm saved Ink strokes render the same after refresh using stored point timing.
   - Confirm Medium, High, and Very High smoothing progressively reduce wobble using path simplification, while Light preserves most hand movement.
   - Confirm Very High strongly straightens mostly vertical/horizontal shaky strokes and softens hard turns.
   - Confirm existing pen strokes still load and render after the smoothing/mode update.
   - Confirm selected canvas object controls appear in the top contextual toolbar and the old right-side properties panel is gone.
   - Confirm duplicate and delete work from the top contextual toolbar.
   - Confirm Rectangle, Circle, Line, Arrow, and Text Box defaults appear in the top contextual toolbar when the tool is active and no canvas object is selected.
   - Confirm selected canvas objects show selected-object controls instead of active tool defaults.
   - Confirm Rectangle/Circle fill, stroke, stroke width, and stroke style defaults persist after refresh and apply to the next new object.
   - Confirm Line/Arrow stroke, stroke width, and stroke style defaults persist after refresh and apply to the next new object.
   - Confirm Text Box text color, highlight, size, bold, italic, alignment, fill, and stroke defaults persist after refresh and apply to the next new object.
   - Confirm Pen/Ink/Highlighter/Laser defaults still work independently from shape, line, arrow, and text defaults.
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

Keep future feature ideas in `notes/feature-ideas.md`. Page Types, document block lock/unlock, connectors, pressure-aware pen behavior, advanced/partial erasing, layers, expanded document/cross-page history, and expanded Laser Pointer controls are not part of this QA pass.

## Maintainability Watchlist

- `src/components/workspace/CanvasLayer.tsx` is the main growth hotspot and should be split after manual QA confirms behavior.
- Good future extraction targets: pen rendering helpers, pointer interaction handlers, and canvas object rendering helpers.
- Keep any refactor behavior-preserving and covered by `npm run build`; do not combine it with new feature work.

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
