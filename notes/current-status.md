## Current App State

Thinkleaf is a note-first visual workspace prototype running on Next.js, React, TypeScript, Tailwind CSS, Tiptap, custom canvas tools, and localStorage persistence.

## Organization

- Profiles sit above Projects.
- Each profile owns its own projects, folders, pages, favorites, and search results.
- Existing pre-profile data migrates into the default Work profile.
- Active profile, sidebar collapsed state, Snap to Grid, document vertical alignment, page content, canvas objects, images, and canvas view state persist in localStorage.

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
- Bottom floating canvas toolbar contains Select, Pan, Rectangle, Circle, Text, Line, Arrow, Image, Pen, Zoom In, Zoom Out, Reset View, and a Settings menu for Grid and Snap.
- Bottom toolbar includes Undo and Redo for canvas/page actions, positioned between Reset View and Settings.
- Undo and Redo toolbar polish pass verified icon-only buttons, disabled/muted unavailable states, and canvas-scoped shortcuts.
- Toolbar shortcut badges show 1-9 for tools/image/pen, + for Zoom In, and - for Zoom Out.
- Canvas Undo uses Cmd/Ctrl+Z; Canvas Redo uses Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y.
- Zoom In works with + and = outside editable fields; Zoom Out works with -.
- A transient zoom percentage indicator appears near the bottom toolbar after zoom changes and Reset View.
- Tool and zoom shortcuts do not trigger while typing in editors, inputs, textareas, selects, or contenteditable areas.
- Canvas undo/redo does not override Tiptap document undo/redo while typing in the main document.
- Main document and bottom toolbar unavailable states avoid native disabled-attribute hydration mismatches while still no-oping unavailable actions.

## Canvas Editing

- Canvas supports rectangle, circle, text box, line, arrow, image, and pen stroke objects.
- Objects can be created, selected, moved, resized, styled, deleted, and persisted per page.
- Pen strokes can be drawn freehand, selected, moved, duplicated, deleted, styled with stroke color/width, and persisted per page.
- Selected canvas object controls now appear in the top contextual toolbar instead of a right-side properties panel.
- Canvas object duplicate and delete actions are available from the top contextual toolbar.
- Canvas undo/redo is tracked per page for create, delete, move, resize, style changes, whiteboard text edits, and inserted image objects.
- Rectangles and circles can contain editable text.
- Text-bearing canvas objects support practical formatting: bold, italic, alignment, vertical alignment, text color, highlight, and size, while preserving plain text storage.
- Shape, line, and pen stroke styling includes stroke color and stroke width; shapes and lines also support solid/dashed/dotted stroke style where applicable.
- Image objects can be imported or pasted, resized/compressed, moved, resized, deleted, and stored per page.
- Snap to Grid is separate from Show Grid, is on by default, and applies to creation, movement, resizing, and line/arrow endpoints when enabled.

## Current Recommended Next

Do a short manual browser QA/polish pass before adding new features.

Latest code-path QA/build verification after the whiteboard text formatting target fix passed. No new regressions were found in the reviewed document formatting, whiteboard text formatting, toolbar event containment, canvas history, image object, pan/zoom/reset, profile-scoped search/favorites, or localStorage persistence paths.

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
- Main document formatting
- Whiteboard text formatting
- localStorage persistence after refresh and page/profile switching
