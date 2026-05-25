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

## Rich Text Whiteboard Text Boxes

Upgrade whiteboard text boxes and text-bearing shapes from plain text to lightweight rich text.

### Expected Behavior

Future whiteboard text objects could support:

- Bulleted lists
- Numbered lists
- Inline formatting spans
- Better paste preservation from rich text sources
- Persistence without turning canvas text into a full document editor

### Build Later

Do not build until the current toolbar and canvas text formatting are stable.

## Advanced Pen Tool

Expand the polished freehand pen tool.

### Expected Behavior

The advanced pen tool could support:

- Pressure or velocity-aware strokes, if practical
- Better stroke simplification for lower localStorage usage
- More brush presets beyond the current Pen, Ink, and Highlighter modes
- Advanced or partial eraser behavior
- More precise selection/editing affordances

### Build Later

Do not expand until the current pen smoothing, mode, selection, and styling behavior is manually QA'd.

## Advanced Eraser Behavior for Whiteboard

Basic whole-object erasing now exists for Pen, Ink, Highlighter, shapes, text boxes, lines, arrows, and images. Future work can make erasing more precise.

### Expected Behavior

Advanced eraser behavior could support:

- Partial stroke erasing
- Splitting strokes where the eraser crosses them
- Adjustable eraser size
- Clearer preview of the erase radius

### Build Later

Do not build until the basic whole-object eraser and pen/highlighter behavior are stable through manual QA.

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

## Advanced Connectors

Basic plus-handle flowchart connectors for rectangles, circles, and diamonds now exist, with same-shape plus creation, shape type conversion, straight, anchor-aware elbow, curve connector styles, editable anchors, optional connector labels, optional shape labels, and editable arrow direction. Future work can expand connectors after the simple anchored behavior is manually QA'd.

### Expected Behavior

Future connector enhancements could support:

- Drag-to-connect between existing objects
- Text box connector anchors
- Smarter elbow routing around objects
- Better duplicate behavior for selected connected subgraphs

### Build Later

Do not expand beyond the current simple shape plus-handle flow until object creation, movement, resizing, snapping, and line/arrow behavior are stable through manual QA.

## Laser Pointer Enhancements

Basic Laser Pointer mode now exists inside the Pen tool. Future work can make it more configurable for presenting or explaining ideas on the whiteboard.

### Expected Behavior

Future laser pointer enhancements could support:

- More fade duration presets or presentation-specific trail behavior
- Optional cursor/presentation affordances
- Clearer presenter-mode controls if Thinkleaf grows a presentation workflow

### Build Later

Do not expand beyond the current temporary Laser mode until the pen, highlighter, eraser, and canvas toolbar behavior are stable through manual QA.
