# Next Codex Task: Canvas Pan and Zoom

## Goal

Add basic canvas pan and zoom behavior to the Thinkleaf workspace.

Thinkleaf should feel more like a canvas workspace while keeping the document block and note-taking experience as the primary focus.

## Requirements

1. Add canvas pan support.
   - User should be able to pan the workspace.
   - Prefer holding Space and dragging, middle-mouse dragging, or using the existing Pan tool.
   - Do not interfere with typing in the Tiptap editor.

2. Add zoom support.
   - Support zoom in and zoom out.
   - Mouse wheel + modifier key is acceptable.
   - Add simple zoom controls if practical.
   - Use reasonable zoom limits, such as 50% to 200%.

3. Save canvas view state per page.
   - Store pan x/y and zoom level per page.
   - Persist to localStorage.
   - Switching pages should restore that page’s view state.

4. Add reset view.
   - Add a reset view button or toolbar control.
   - Reset should return the document block to a useful default left-positioned view.

5. Keep canvas objects aligned with the view.
   - Objects should pan and zoom with the canvas.
   - Object selection, movement, resizing, endpoint editing, and text editing should still work.

6. Keep the bottom floating toolbar usable.
   - The toolbar should stay fixed to the screen/workspace, not zoom with the canvas.

7. Keep the right properties panel usable.
   - The properties panel should remain fixed and should not zoom with the canvas.

## Must Preserve

Follow `codex/guardrails.md`.

## Do Not Add

Do not add:

- Connectors
- Freehand pen
- Image upload
- Grouping
- Layers
- Rotation
- AI
- Authentication
- Database
- Cloud sync
- Collaboration

## Verification

Test:

- Pan works
- Zoom works
- Reset view works
- Page view state persists after switching pages
- Page view state persists after refresh
- Editor typing still works
- Canvas objects still create, move, resize, style, and persist
- Sidebar still works
- `npm.cmd run build` passes

## Response Format

After completing this, summarize:

1. Files changed
2. How pan works
3. How zoom works
4. How view state is stored
5. How reset view works
6. Any interaction limitations
7. Build status
8. Recommended next feature