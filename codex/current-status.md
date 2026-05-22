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
- Formatting controls use compact dropdowns/popovers where practical.

## Canvas and Toolbar

- The workspace uses one document block inside a pannable and zoomable dotted-grid canvas.
- Whiteboard objects render above the document block when overlapping.
- Bottom floating canvas toolbar contains Select, Pan, Rectangle, Circle, Text, Line, Arrow, Image, Zoom In, Zoom Out, Reset View, and a Settings menu for Grid and Snap.
- Bottom toolbar includes Undo and Redo for canvas/page actions, positioned between Reset View and Settings.
- Undo and Redo toolbar polish pass verified icon-only buttons, disabled/muted unavailable states, and canvas-scoped shortcuts.
- Toolbar shortcut badges show 1-8 for tools/image, + for Zoom In, and - for Zoom Out.
- Canvas Undo uses Cmd/Ctrl+Z; Canvas Redo uses Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y.
- Zoom In works with + and = outside editable fields; Zoom Out works with -.
- A transient zoom percentage indicator appears near the bottom toolbar after zoom changes and Reset View.
- Tool and zoom shortcuts do not trigger while typing in editors, inputs, textareas, selects, or contenteditable areas.
- Canvas undo/redo does not override Tiptap document undo/redo while typing in the main document.
- Main document toolbar hydration is stabilized so disabled editor controls do not create a browser console mismatch on initial load.

## Canvas Editing

- Canvas supports rectangle, circle, text box, line, arrow, and image objects.
- Objects can be created, selected, moved, resized, styled, deleted, and persisted per page.
- Canvas undo/redo is tracked per page for create, delete, move, resize, style changes, whiteboard text edits, and inserted image objects.
- Rectangles and circles can contain editable text.
- Text-bearing canvas objects support practical formatting: bold, italic, alignment, vertical alignment, text color, highlight, and size.
- Shape and line styling includes stroke color, fill color, stroke width, and solid/dashed/dotted stroke style where applicable.
- Image objects can be imported or pasted, resized/compressed, moved, resized, deleted, and stored per page.
- Snap to Grid is separate from Show Grid, is on by default, and applies to creation, movement, resizing, and line/arrow endpoints when enabled.

## Current Recommended Next

Do a short manual QA/polish pass before adding new features.

Focus the pass on:

- Profiles
- Image insert and paste
- Color picker popovers, custom HEX, and recent colors
- Toolbar shortcuts and shortcut badges
- Canvas undo/redo buttons and shortcuts
- Pan, zoom, Reset View, and the zoom percentage indicator
- Snap to Grid and Show Grid
- Object creation, movement, resizing, endpoint editing, styling, and deletion
- Main document formatting
- Whiteboard text formatting
- localStorage persistence after refresh and page/profile switching
