## Current App State

Thinkleaf is a note-first visual workspace prototype running on Next.js, React, TypeScript, Tailwind CSS, Tiptap, custom canvas tools, and localStorage persistence.

## Organization

- Profiles sit above Projects.
- Each profile owns its own projects, folders, pages, favorites, and search results.
- Existing pre-profile data migrates into the default Work profile.
- Active profile, sidebar collapsed state, Snap to Grid, document vertical alignment, Pen settings, canvas creation defaults, page content, canvas objects, images, and canvas view state persist in localStorage.

## Main Document

- Tiptap editor supports headings, bold, italic, lists, checklists, links, tables, callouts, images, text color, highlight, text size, horizontal alignment, and document vertical alignment.
- Document images can be inserted or pasted, resized/compressed, and stored as data URLs.
- Table header alignment supports left, center, and right.
- Main document formatting controls stay visible in the top workspace toolbar, keeping the page content focused on title, metadata, tags, and body.
- Context-specific table, whiteboard object, and image controls appear on the second toolbar row when relevant.
- Top toolbar text formatting has an explicit active target: document, whiteboard text, or none.
- Toolbar interactions are event-contained so whiteboard text selection stays active while using buttons, size menus, and color/highlight popovers.
- Table row/column/delete controls appear only while the editor cursor is inside a table; Insert Table remains available from the active editor toolbar.
- Formatting controls use compact dropdowns/popovers where practical.

## Canvas and Toolbar

- The workspace uses one document block inside a pannable and zoomable dotted-grid canvas.
- Two-finger trackpad scroll pans the whiteboard/canvas area horizontally and vertically, including over the main document body.
- Whiteboard objects render above the document block when overlapping.
- Top contextual toolbar applies row 1 text controls to the active target only: the Tiptap document when document editing is active, or the selected whiteboard text object when a text box/text-bearing shape is selected.
- Whiteboard text toolbar controls preserve the selected canvas object while applying formatting.
- Clicking into the page/editor clears canvas object selection so the document toolbar can take over cleanly.
- Bottom floating canvas toolbar contains Select, Pan, Rectangle, Circle, Text, Line, Arrow, Image, Pen, Eraser, Zoom In, Zoom Out, Reset View, and a Settings menu for Grid and Snap.
- Bottom toolbar includes Undo and Redo for canvas/page actions, positioned between Reset View and Settings.
- Undo and Redo toolbar polish pass verified icon-only buttons, disabled/muted unavailable states, and canvas-scoped shortcuts.
- Toolbar shortcut badges show 1-9 for tools/image/pen, 0 for Eraser, + for Zoom In, and - for Zoom Out.
- Canvas Undo uses Cmd/Ctrl+Z; Canvas Redo uses Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y.
- Zoom In works with + and = outside editable fields; Zoom Out works with -.
- A transient zoom percentage indicator appears near the bottom toolbar after zoom changes and Reset View.
- Tool and zoom shortcuts do not trigger while typing in editors, inputs, textareas, selects, or contenteditable areas.
- Canvas undo/redo does not override Tiptap document undo/redo while typing in the main document.
- Main document and bottom toolbar unavailable states avoid native disabled-attribute hydration mismatches while still no-oping unavailable actions.
- CanvasLayer maintainability pass split pen rendering, laser rendering, eraser hit-testing, geometry helpers, interaction types, and canvas object view components into focused helper files while preserving the existing canvas behavior.

## Canvas Editing

- Canvas supports rectangle, circle, text box, line, arrow, image, and pen stroke objects.
- Objects can be created, selected, moved, resized, styled, deleted, and persisted per page.
- Pen strokes can be drawn freehand, selected, moved, duplicated, deleted, styled with stroke color/width, smoothing, Ink Density, and Pen/Ink/Highlighter mode, and persisted per page.
- Laser Pointer is available as a Pen tool mode; it draws temporary fixed-width glowing strokes that pan/zoom with the canvas, fade from the tail after release, and do not persist or affect canvas undo/redo history. Missing or invalid saved Laser colors fall back to red, the glow renders as tightened layered continuous strokes under the crisp laser stroke, and a persisted Laser fade duration dropdown controls how long the trail holds before fading at the shared Normal fade speed. Fade options are Fast, Normal, Long, Longer, and Longest, with Normal remaining the default.
- The Eraser tool uses a compact circular Excalidraw-style cursor with a subtle movement trail, previews circle-overlapped objects at low opacity during hover and active drag, and commits pending drag erases only on pointer release.
- Eraser deletes Pen, Ink, Highlighter, shapes, text boxes, lines, arrows, and images; it works with pan/zoom and records deletions in canvas undo/redo.
- In-progress Pen, Ink, and Highlighter strokes draw without showing a selection bounding box while the pointer is down.
- Pen mode renders at constant width; Ink strokes store point timing and render with subtle speed-based width variation so slower movement feels thicker and faster movement thinner.
- Ink rendering preserves more centerline detail than Pen smoothing and uses curved variable-width chunks to avoid jagged segment joins.
- Highlighter mode renders wider semi-transparent rounded strokes over text, images, and whiteboard objects, with yellow as the default starting color.
- Pen smoothing uses distance filtering, Ramer-Douglas-Peucker style path simplification, and curve smoothing so Medium, High, and Very High meaningfully reduce wobble; Very High aggressively straightens shaky mostly-straight strokes and softens hard turns.
- Pen defaults include stroke color, compact stroke-width selection, smoothing, Ink Density, stroke mode, Laser color, and Laser fade duration; these settings persist in localStorage and apply immediately to newly drawn strokes while the Pen tool is active. Laser mode hides smoothing/width controls because it uses a temporary fixed-width stroke.
- Pen default controls update with functional state changes so mode, width, smoothing, Ink Density, color, Laser color, and Laser fade settings do not reset when changing another Pen option.
- Pen modes in the active Pen toolbar are Pen, Ink, Highlighter, and Laser Pointer; selected non-pen objects expose only their object styling controls, not Pen mode controls.
- Pen toolbar controls are ordered as mode first, then shared color/width modifiers, then mode-specific settings such as smoothing, Ink Density, or Laser Pointer fade duration.
- Rectangle, Circle, Line, Arrow, and Text Box creation defaults appear in the top contextual toolbar when their tool is active and no object is selected; the defaults persist in localStorage and apply to newly created objects.
- Selected canvas object controls now appear in the top contextual toolbar instead of a right-side properties panel.
- Selected canvas object controls take priority over active creation-tool defaults when an object is selected.
- Canvas object duplicate and delete actions are available from the top contextual toolbar.
- Canvas undo/redo is tracked per page for create, delete, move, resize, style changes, whiteboard text edits, and inserted image objects.
- Rectangles and circles can contain editable text.
- Text-bearing canvas objects support practical formatting: bold, italic, alignment, vertical alignment, text color, highlight, and size, while preserving plain text storage.
- Shape, line, and pen stroke styling includes stroke color and stroke width; pen strokes also support smoothing, Ink Density, and Pen/Ink/Highlighter modes, while shapes and lines support solid/dashed/dotted stroke style where applicable.
- Image objects can be imported or pasted, resized/compressed, moved, resized, deleted, and stored per page.
- Snap to Grid is separate from Show Grid, is on by default, and applies to creation, movement, resizing, and line/arrow endpoints when enabled.

## Current Recommended Next

Do a short manual browser QA/polish pass before adding new features.

Latest code-path/build verification after adding the Fast Laser Pointer fade option passed. Remaining verification should be hands-on browser QA with real drawing, typing, image import, trackpad gestures, refreshes, and profile/page switching.

Focus the pass on:

- Profiles
- Image insert and paste
- Color picker popovers, custom HEX, and recent colors
- Toolbar shortcuts and shortcut badges
- Canvas undo/redo buttons and shortcuts
- Pan, zoom, Reset View, and the zoom percentage indicator
- Trackpad two-finger pan over the board/document body and Ctrl/Cmd + wheel zoom
- Snap to Grid and Show Grid
- Object creation, movement, resizing, endpoint editing, styling, and deletion
- Creation defaults for Rectangle, Circle, Line, Arrow, and Text Box: toolbar visibility, persistence after refresh, selected-object priority, and application to the next new object
- Pen stroke width, smoothing, Ink Density, and Pen/Ink/Highlighter/Laser controls for the active Pen tool, plus selected pen/highlighter stroke controls where applicable
- Laser Pointer mode drawing, glow, color picker persistence, fade duration persistence, tail fade, pan/zoom behavior, non-persistence after refresh, and no undo/redo history impact
- Eraser shortcut, cursor feedback, object deletion, hover preview, and undo/redo
- Main document formatting
- Whiteboard text formatting
- localStorage persistence after refresh and page/profile switching
