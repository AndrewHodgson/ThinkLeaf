# Next Codex Task: Canvas Interaction QA and Polish

## Goal

Do a focused browser QA and small polish pass on the current Thinkleaf canvas workspace.

Thinkleaf should remain note-first. The document block stays primary, while the canvas behavior should feel stable and predictable.

## Requirements

1. Verify pan behavior.
   - Hand/Pan tool should left-click and drag on empty canvas space.
   - Document block and canvas objects should move together.
   - Bottom toolbar and right properties panel should stay fixed.
   - Switching from Pan to Select or object tools should work without refresh.
   - New pages and Reset View should return to the left-document default board view.
   - The large virtual board should feel spacious and objects should not clip at the old right-side panel boundary.
   - Pan should not interfere with Tiptap typing.
   - Pan should not create or select objects.

2. Verify existing canvas interactions.
   - Select, move, resize, endpoint edit, and text edit should still work.
   - Object creation tools should still work.
   - Object creation should work after panning far from the default view.
   - Number-key shortcuts 1-7 should switch canvas tools outside editable text fields.
   - Grid toggle, zoom controls, and reset view should still work.

3. Verify persistence.
   - Canvas view state should persist per page.
   - Canvas objects should still persist per page.
   - Switching pages and refreshing should restore the right state.

4. Fix any obvious canvas regressions.
   - Only fix issues found during the QA pass.
   - Do not add new major features.

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

- Hand/Pan tool left-drag works
- Zoom works
- Reset view works
- Page view state persists after switching pages
- Page view state persists after refresh
- Editor typing still works
- Canvas objects still create, move, resize, style, and persist
- Number-key shortcuts do not trigger while typing in notes, text boxes, or fields
- Objects do not clip when placed beyond the initial right-side viewport
- Sidebar still works
- `npm.cmd run build` passes

## Response Format

After completing this, summarize:

1. Files changed
2. What was tested
3. Bugs found
4. Bugs fixed
5. Build status
6. Recommended next feature
