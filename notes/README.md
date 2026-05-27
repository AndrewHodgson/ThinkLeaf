## Current State

Thinkleaf is a note-first visual workspace prototype. It is approaching beta readiness. All major features are implemented; the remaining work before deployment is manual QA and pre-deployment checklist items.

See `notes/current-status.md` for the authoritative current state, recommended next steps, and pre-deployment checklist.

## Tech Stack

Next.js 16 (App Router), React, TypeScript, Tailwind CSS, Tiptap, custom canvas/whiteboard engine, localStorage persistence.

## Core Features

**Notes**
- Tiptap rich text editor: headings, bold, italic, underline, lists, checklists, links, tables, callouts, images, text color, highlight, text size, alignment, and vertical alignment
- Note date, tags, favorite toggle, breadcrumb path
- Page templates: save from row menu, create from template

**Canvas / Whiteboard**
- Shapes: rectangle, circle, diamond (with editable text, labels, and formatting)
- Text boxes with formatting
- Lines and arrows: straight, elbow, curve; single or double line; none/forward/backward/both arrowheads; stroke color, width, dashed/dotted; optional connector labels
- Connected flowchart connectors: attach to shape anchors, stay attached when shapes move, plus-handle creation flow, draggable re-anchoring
- Freehand pen: Pen, Ink (variable-width), Highlighter, and Laser Pointer modes
- Eraser tool with circular cursor and opacity preview
- Image import and paste
- Pan, zoom, snap to grid, undo/redo (canvas, per-page)

**Workspace / Navigation**
- Profiles → Projects → Folders (nested) → Pages
- Sidebar: expand/collapse, create, rename, duplicate, delete, favorites, search
- Page templates scoped to active profile

**Export**
- JSON backup (full editable restore)
- PDF export: note body on page 1, canvas on page 2; connectors, arrowheads, double-line, colors, shapes all rendered as static SVG

**Beta Hardening**
- Safe localStorage writes with amber quota-error banner and Export Backup button
- Error boundary with Download Backup and Reload fallback
- Corrupted storage detection and recovery screen
- Undo history image stripping to prevent memory pressure
- Data storage disclosure in Settings menu
- Security headers in next.config.ts

## Key File Locations

- Main app entry: `src/app/page.tsx` → `src/components/ThinkleafApp.tsx`
- Canvas rendering: `src/components/workspace/CanvasLayer.tsx`
- Canvas geometry utilities: `src/components/workspace/canvas/canvasGeometry.ts`
- Workspace state: `src/hooks/useWorkspace.ts`
- PDF + JSON export: `src/lib/exportUtils.ts`
- Types: `src/types/workspace.ts`

## Project Notes

- `notes/current-status.md` — authoritative status, QA checklist, pre-deployment items
- `notes/bugs-and-issues.md` — resolved and open issues
- `notes/feature-ideas.md` — post-beta feature backlog
- `codex-notes/` — implementation details, technical decisions, test steps for specific systems
