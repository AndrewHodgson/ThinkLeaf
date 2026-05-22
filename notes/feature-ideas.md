# Feature Ideas

## Page Types

Add page type options when creating a page:

- Note
- Note + Whiteboard
- Whiteboard

Existing pages should eventually migrate to `Note + Whiteboard` so current document-plus-canvas behavior is preserved by default.

### Expected Behavior

- Note: document-only page for writing.
- Note + Whiteboard: document block plus canvas, current default behavior.
- Whiteboard: canvas-only board with no main document block.

### Build Later

Do not build this until the current manual QA/polish pass is finished.

## Expanded Undo and Redo

Expand undo and redo beyond the current lightweight per-page canvas history.

### Expected Behavior

Current canvas undo/redo already supports basic page-local canvas actions. Future expanded history could support:

- More explicit history labels
- Multi-step grouping for complex workflows
- Cross-page or persisted history, if it proves useful
- Document editor history integration, if practical, without fighting Tiptap's own undo stack

### Build Later

Only expand after the current lightweight canvas undo/redo has been manually QA'd.

## Pen Tool for Whiteboard

Add a freehand pen tool for drawing directly on the whiteboard.

### Expected Behavior

The pen tool should support:

- Freehand drawing
- Stroke color
- Stroke width
- Eraser support
- Persistence per page
- Interaction with pan/zoom

### Build Later

Do not build until canvas object creation, movement, resizing, snapping, and pan/zoom are stable.

## Eraser Tool for Whiteboard

Add an eraser tool for removing whiteboard content directly from the canvas.

### Expected Behavior

The eraser tool should support:

- Erasing freehand pen strokes
- Deleting or removing parts of drawn content, if practical
- Removing selected canvas objects, if that interaction feels natural
- Working correctly with pan/zoom
- Clear cursor feedback when active

### Build Later

Do not build until the pen tool and canvas object behavior are stable.

## Layers for Whiteboard Objects

Add layer controls for whiteboard objects.

### Expected Behavior

Layer controls should support:

- Bring forward
- Send backward
- Bring to front
- Send to back
- Possibly a layers panel later

### Build Later

Start with simple object order controls before building a full layers panel.

## Hide Shortcut Indicators

Add a setting to show or hide shortcut indicators on toolbar icons.

### Expected Behavior

The setting should support:

- Toggle shortcut badges on/off
- Default shortcut badges to visible
- Persist the preference in localStorage
- Apply to bottom toolbar shortcuts such as 1, 2, 3, +, and -
- Keep keyboard shortcuts working even when badges are hidden

### Build Later

Add this to the toolbar/settings menu after the bottom toolbar is stable.

## Document Block Lock/Unlock

Add a way to lock the main document block so it cannot be accidentally moved or edited as a canvas object if document block movement is introduced later.

### Expected Behavior

The setting should support:

- Locking the document block position
- Unlocking it when intentional layout changes are needed
- Clear visual feedback for locked state
- Preservation of normal document editing while locked

### Build Later

Consider after the current manual QA/polish pass confirms toolbar, canvas, and editor stability.

## Simple Connectors

Add lightweight connectors between whiteboard objects.

### Expected Behavior

Connectors should eventually support:

- Connecting shapes or text boxes
- Moving endpoints with objects
- Basic arrow styling
- Persistence per page
- Working correctly with pan/zoom and Snap to Grid

### Build Later

Do not build until object creation, movement, resizing, snapping, and line/arrow behavior are stable through manual QA.

## Laser Pointer Tool

Add a temporary laser pointer tool for presenting or explaining ideas on the whiteboard.

### Expected Behavior

The laser pointer should behave like a temporary red pen:

- Draws a red freehand line while dragging
- The line fades away after a short time
- The line should not permanently save to the page
- Works with pan/zoom
- Has clear cursor feedback when active
- Useful for presenting, explaining, or pointing at areas without marking up the board permanently

### Build Later

Build after the pen tool or alongside it, since both use similar pointer-drawing behavior.
