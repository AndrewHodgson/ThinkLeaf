# Thinkleaf Guardrails

## Product Direction

Thinkleaf is note-first, not whiteboard-first.

The document block and meeting-note workflow should remain the primary experience. Canvas tools should support visual thinking around notes, not turn the app into a full whiteboard product.

## Preserve Existing Functionality

Do not break:

- Project → Folder → Page structure
- Sidebar collapse/expand
- Project/folder collapse/expand
- Project/folder/page create, rename, duplicate, and delete
- Page favorites
- Search
- Tags
- Note Date
- Updated Date
- Tiptap editor
- Rich text formatting
- Tables
- Canvas object creation
- Canvas object movement
- Canvas object resizing
- Line/arrow endpoint editing
- Text box editing
- Right object properties panel
- Bottom floating canvas toolbar
- Grid toggle
- localStorage persistence

## Do Not Add Unless Explicitly Asked

Do not add:

- Authentication
- Database
- Cloud sync
- AI
- Collaboration
- Team workspaces
- Public sharing
- Freehand pen
- Image upload
- Grouping
- Layers
- Rotation
- True sticky connectors
- Mobile-specific redesign

## Development Requirements

After changes:

- Run `npm.cmd run build`
- Fix TypeScript/build errors
- Summarize files changed
- Summarize what works
- Summarize remaining limitations
- Recommend the next feature