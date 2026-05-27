## Current App State

Thinkleaf is a note-first visual workspace prototype running on Next.js, React, TypeScript, Tailwind CSS, Tiptap, custom canvas tools, and localStorage persistence.

## Organization

- Profiles sit above Projects.
- Each profile owns its own projects, folders, pages, favorites, and search results.
- Existing pre-profile data migrates into the default Work profile.
- Folders support nesting through an optional `parentFolderId`; folders without a parent remain top-level project folders.
- Page breadcrumbs show the full active path from profile to project to nested folders to page.
- The sidebar renders nested folders recursively, with create-page, create-folder, rename, duplicate, delete, and expand/collapse actions available at each folder level; chevrons handle expand/collapse, visible plus buttons handle creation, page stars handle favorites, and three-dot menus handle row actions.
- Sidebar branding uses the Thinkleaf horizontal logo when expanded and the vertical logo when collapsed; the app favicon uses the brand favicon asset.
- Deleting a folder removes all descendant folders and pages after confirmation; duplicating a folder copies descendant folders and pages with new IDs.
- Tag suggestions are built from tags already used in the active profile and appear only after typed prefix matches, keeping tag reuse and tag search scoped to the selected profile.
- Page templates can be saved from page row action menus and reused when creating new pages; templates persist in localStorage and copy title, body, tags, canvas objects, and canvas view state into the destination folder.
- Active profile, sidebar collapsed state, Snap to Grid, document vertical alignment, Pen settings, canvas creation defaults, default flowchart connector arrow behavior, page content, canvas objects, images, and canvas view state persist in localStorage.

## Main Document

- Tiptap editor supports headings, bold, italic, underline, indent/outdent, lists, checklists, links, tables, callouts, images, text color, highlight, text size, horizontal alignment, and document vertical alignment.
- Ordered lists use decimal markers at level 1, lower-alpha markers at level 2, and lower-roman markers at level 3.
- Indent/outdent uses Tiptap list nesting for bullet, numbered, and checklist items so markers and text move together; old paragraph-indent styling inside list items is cleaned up in the editor, while paragraph and heading indent remains margin-based outside lists.
- Checklist rows align checkboxes with their text.
- Note Date remains editable as a text date field without a calendar icon/widget.
- Document images can be inserted or pasted, resized/compressed, and stored as data URLs.
- The main page header is compact, with tighter title/date/tag spacing and subtler tag pills.
- The page header save button manually persists the current note state and shows a subtle saved confirmation; autosave still runs through localStorage.
- Table editing supports current cell, row, and column selection controls, selected-cell background colors, merge selected cells, split/unmerge cells, insert row above/below, insert column left/right, delete row/column, delete table, and header row/header column toggles.
- Table header alignment supports left, center, and right.
- Main document formatting controls stay visible in the top workspace toolbar, keeping the page content focused on title, metadata, tags, and body.
- Context-specific table, whiteboard object, and image controls appear on the second toolbar row when relevant.
- Top toolbar contexts use compact uppercase group labels such as TEXT, COLOR, ALIGN, SELECT, FILL, STROKE, WIDTH, STYLE, CONNECTOR, SHARED, LINE 1, LINE 2, LABEL, and IMAGE so document, table, shape, line/arrow, connector, pen, and image controls are easier to scan without labelling every button.
- Top toolbar text formatting has an explicit active target: document, whiteboard text, or none.
- Toolbar interactions are event-contained so whiteboard text selection stays active while using buttons, size menus, and color/highlight popovers.
- Table controls appear only while the editor cursor or selection is inside a table; Insert Table remains available from the active editor toolbar.
- Formatting controls use compact dropdowns/popovers where practical.

## Canvas and Toolbar

- The workspace uses one document block inside a pannable and zoomable dotted-grid canvas.
- The Pan tool can left-drag from the board, whiteboard objects, and the main document page; active document inputs/contenteditable areas keep editing behavior instead of starting a pan.
- Active tool cursors remain consistent over objects: Pan keeps grab/grabbing, Pen modes keep a drawing cursor, and object move cursors are reserved for Select.
- Reset View returns to a default page position below the top toolbar, with visual top spacing matched to the document's left padding.
- Two-finger trackpad scroll pans the whiteboard/canvas area horizontally and vertically, including over the main document body.
- Whiteboard objects render above the document block when overlapping.
- Top contextual toolbar applies row 1 text controls to the active target only: the Tiptap document when document editing is active, or the selected whiteboard text object when a text box/text-bearing shape is selected.
- Whiteboard text toolbar controls preserve the selected canvas object while applying formatting.
- Clicking into the page/editor clears canvas object selection so the document toolbar can take over cleanly.
- Bottom floating canvas toolbar contains Select, Pan, Shape, Text, Line, Arrow, Image, Pen, Eraser, Zoom In, Zoom Out, Reset View, and a Settings menu for Grid, Snap, and default flowchart connector arrows.
- Bottom toolbar includes Undo and Redo for canvas/page actions, positioned between Reset View and Settings.
- A bottom-toolbar help button opens a shortcuts and controls dialog covering tools, zoom, undo/redo, pan/trackpad, pen/laser, and eraser behavior.
- Undo and Redo toolbar polish pass verified icon-only buttons, disabled/muted unavailable states, and canvas-scoped shortcuts.
- Toolbar shortcut badges show 1-9 for tools/image/pen, 0 for Eraser, + for Zoom In, and - for Zoom Out.
- Canvas Undo uses Cmd/Ctrl+Z; Canvas Redo uses Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y.
- Zoom In works with + and = outside editable fields; Zoom Out works with -.
- A transient zoom percentage indicator appears near the bottom toolbar after zoom changes and Reset View.
- Tool and zoom shortcuts do not trigger while typing in editors, inputs, textareas, selects, or contenteditable areas.
- Canvas undo/redo does not override Tiptap document undo/redo while typing in the main document.
- Main document and bottom toolbar unavailable states avoid native disabled-attribute hydration mismatches while still no-oping unavailable actions.
- CanvasLayer maintainability passes split pen/highlighter/ink rendering helpers, Pen stroke SVG rendering, laser rendering, eraser hit-testing, geometry helpers, interaction types, and canvas object view components into focused helper files while preserving existing canvas behavior.

## Canvas Editing

- Canvas supports rectangle, circle, diamond, text box, line, arrow, image, and pen stroke objects.
- Objects can be created, selected, moved, resized, styled, deleted, and persisted per page.
- Pen, Ink, Highlighter, and Laser Pointer pointer-downs stay in drawing mode over existing objects and the main document instead of switching to object move/select behavior; the active drawing hit layer extends beyond the document/page-related area so strokes can start far left/up/right/down on the virtual board after panning.
- Pen strokes can be drawn freehand, selected, moved, duplicated, deleted, styled with stroke color/width, Ink Density, and Pen/Ink/Highlighter mode, and persisted per page.
- Laser Pointer is available as a Pen tool mode; it draws temporary fixed-width glowing strokes that pan/zoom with the canvas, fade from the tail after release, and do not persist or affect canvas undo/redo history. Missing or invalid saved Laser colors fall back to red, the glow renders as tightened layered continuous strokes under the crisp laser stroke, and a persisted Laser fade duration dropdown controls how long the trail holds before fading at the shared Normal fade speed. Fade options are Fast, Normal, Long, Longer, and Longest, with Normal remaining the default.
- The Eraser tool uses a compact circular Excalidraw-style cursor with a subtle movement trail, previews circle-overlapped objects at low opacity during hover and active drag, and commits pending drag erases only on pointer release.
- Eraser deletes Pen, Ink, Highlighter, shapes, text boxes, lines, arrows, and images; it works with pan/zoom and records deletions in canvas undo/redo.
- In-progress Pen, Ink, and Highlighter strokes draw without showing a selection bounding box while the pointer is down.
- Pen mode renders the raw pointer path at constant width; Ink strokes store point timing and preserve the raw centerline while rendering a smooth filled variable-width outline so slower movement feels thicker and faster movement thinner without chunky sampled blobs.
- Pen, Ink, and Highlighter centerline rendering no longer simplifies, straightens, or smooths the captured pointer path; Ink smoothing is limited to the rendered outline and width transitions.
- Highlighter mode renders wider semi-transparent rounded strokes over text, images, and whiteboard objects, with yellow as the default starting color.
- Legacy saved pen smoothing values are still tolerated for older strokes, but smoothing is ignored during rendering and is no longer exposed in Pen, Ink, or Highlighter settings or toolbar controls.
- Pen defaults include stroke color, compact stroke-width selection, Ink Density, stroke mode, Laser color, and Laser fade duration; these settings persist in localStorage and apply immediately to newly drawn strokes while the Pen tool is active. Laser mode hides width controls because it uses a temporary fixed-width stroke.
- Pen default controls update with functional state changes so mode, width, Ink Density, color, Laser color, and Laser fade settings do not reset when changing another Pen option.
- Pen modes in the active Pen toolbar are Pen, Ink, Highlighter, and Laser Pointer; selected non-pen objects expose only their object styling controls, not Pen mode controls.
- Pen toolbar controls are ordered as mode first, then shared color/width modifiers, then mode-specific settings such as Ink Density or Laser Pointer fade duration.
- The bottom toolbar has a consolidated Shape tool on shortcut 3 with a dropdown for Rectangle, Circle, and Diamond; the selected shape type persists in localStorage and drives new shape creation.
- Shape, Line, Arrow, and Text Box creation defaults appear in the top contextual toolbar when their tool is active and no object is selected; the defaults persist in localStorage and apply to newly created objects.
- Selected canvas object controls now appear in the top contextual toolbar instead of a right-side properties panel; selected rectangles, circles, and diamonds can be converted between shape types while preserving position, size, text, styling, and connector relationships.
- Selected canvas object controls take priority over active creation-tool defaults when an object is selected.
- Toolbar and dropdown active states use the same light green treatment as selected pages instead of black fills.
- Normal color pickers use a two-row palette spanning grays, black, purple, magenta, red, orange, yellow, green, cyan, blue, and royal blue; the highlighter palette remains separate.
- Sidebar project/folder/page controls are event-contained so row actions do not trigger page selection or project/folder expansion. Three-dot menus close on outside click, when another row menu opens, and after menu actions; duplicate page rows use distinct menu state so opening a page menu in the project tree does not also open it in Favorites or Search. Page Save as Template lives in the page row menu while page favorite is a direct star action.
- Canvas object duplicate and delete actions are available from the top contextual toolbar.
- Canvas undo/redo is tracked per page for create, delete, move, resize, style changes, whiteboard text edits, and inserted image objects.
- Selected rectangles, circles, and diamonds show four small flowchart plus handles. Clicking a handle creates a new shape with the same type, width, height, and styling as the source shape, connects it with an arrow using `sourceObjectId`, `targetObjectId`, `sourceAnchor`, and `targetAnchor`, selects the new shape, and records the shape-plus-connector creation as one canvas undo action where practical.
- Basic connected arrows stay attached to rectangle/circle/diamond anchors when connected shapes move or resize; connected arrows support editable start/end anchors, optional centered labels, color, stroke width, stroke style, straight/elbow/curve connector style, single/double line mode, and none/forward/backward/both arrow direction, while normal line and arrow objects remain freeform. Connected connector toolbar controls are grouped into Connector, Shared, Line 1, and Line 2 sections so it is clear which settings affect path shape, anchors/label, and each rendered line. Double-line connectors render two separated parallel lines for straight, elbow, and curve paths with spacing that scales by stroke width; straight paths use perpendicular offsets, curve paths are sampled along the curve and offset by tangent normals at each point to keep spacing consistent through bends, and elbow paths offset each horizontal/vertical segment while preserving 90-degree routing. Double-line endpoints are separated along the shape edge where practical so arrowheads do not sit on the same anchor point. Line 1 uses the regular connector stroke and arrow controls, while line 2 has its own stroke color, width, style, and arrow direction settings. Selected connected arrows show draggable start/end handles directly on the canvas; dragging an endpoint previews anchor targets on the hovered shape and dropping on an anchor updates the connector's source/target object and anchor metadata. Selected curve connectors show a draggable middle bend handle and persist the curve control offset; selected elbow connectors show draggable bend handles and persist the route offset while keeping horizontal/vertical segments. Connector anchor changes clear custom path offsets so the route recalculates cleanly from the new anchors.
- Selected rectangles, circles, and diamonds support optional labels centered above the shape. A selected shape can start a lightweight "Connect to..." flow from any side, then connect to another existing rectangle/circle/diamond using the current flowchart connector defaults.
- Line and arrow endpoint handles are larger and easier to hit; with Select active, endpoint handles move one endpoint and the line/arrow body hit area moves the whole line/arrow.
- Rectangles, circles, and diamonds snap placement and size to the visible dot centers when Snap to Grid is enabled; lines and arrows snap endpoints to the same visible dot centers while still allowing any angle.
- Rectangles, circles, and diamonds can contain editable text.
- Text-bearing canvas objects support practical formatting: bold, italic, alignment, vertical alignment, text color, highlight, and size, while preserving plain text storage.
- Shape, line, and pen stroke styling includes stroke color and stroke width; pen strokes also support Ink Density and Pen/Ink/Highlighter modes, while shapes and lines support solid/dashed/dotted stroke style where applicable.
- Image objects can be imported or pasted, resized/compressed, moved, resized, deleted, and stored per page.
- Snap to Grid is separate from Show Grid, is on by default, and applies to creation, movement, resizing, and line/arrow endpoints when enabled.

## Beta Hardening — Completed (2026-05-26)

The following beta-readiness issues have been addressed since the last maintainability pass:

- **Safe localStorage writes**: all writes go through `safeSetLocalStorage`; a visible amber banner with an Export Backup button appears on quota failures. See `codex-notes/safe-localstorage.md`.
- **Error Boundary**: `src/components/ErrorBoundary.tsx` wraps the full app tree; render crashes show a clean fallback with Download Backup and Reload buttons. See `codex-notes/error-boundary.md`.
- **Corrupted storage recovery**: if `thinkleaf.workspace.v1` fails JSON parsing or shape validation, the raw value is preserved under a timestamped key, autosave is gated, and the user sees a recovery screen with a Download and Start Fresh option. See `codex-notes/corrupted-storage-recovery.md`.
- **Undo history memory**: `imageDataUrl` is now stripped from undo/redo history snapshots; a per-page image asset registry (React ref) re-injects data on restore. History entries no longer pin image strings in memory beyond their use lifetime. History remains session-only (never persisted to localStorage). See `codex-notes/undo-history-memory.md`.
- **Data storage disclosure**: A plain-language note explaining local-only storage, no cloud sync, and browser-access risk was added to the Settings menu's "Data & Backup" section. No encryption or backend added — beta scope is disclosure only.
- **Security headers**: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` added to `next.config.ts`. CSP intentionally deferred — requires nonce middleware to be useful alongside Next.js inline scripts and Tiptap inline styles. See `codex-notes/security-headers.md`.
- **Export separation**: JSON backup (editable restore) and PDF export (print/share, with canvas on its own page) are distinct functions with no confusion between them.
- **PDF canvas fidelity (2026-05-26)**: Canvas SVG export rebuilt from scratch. Arrowheads are now explicit `<polygon>` elements (SVG `<marker>` dropped — unreliable in print contexts). Elbow and curve connector paths compute correct routes. Double-line connectors render two offset parallel strokes. Endpoint coordinates use `getLineRenderPoints` for accuracy. See `codex-notes/pdf-export-canvas.md`.
- **Mobile/tablet**: intentionally not a beta priority. No responsive work planned until core QA is complete.
- **CanvasLayer runtime errors**: confirmed resolved — `getConnectorLineMode`, `getDoubleLinePathData`, and `getLineMarkerUrl` are all hoisted function declarations; `markerEnd` is a JSX SVG prop name, not a variable.

## Current Recommended Next

Manual browser QA is the top priority. All beta-hardening code changes are complete; the app needs hands-on verification before deployment.

Priority QA checklist:

- Restart the dev server cleanly and confirm the app loads without console errors.
- Exercise Pen, Ink, Highlighter, Laser Pointer, and Eraser with real drawing.
- Test flowchart connectors: create, move, re-anchor, switch styles (straight/elbow/curve), double-line mode.
- Test image import via toolbar and paste.
- Test Tiptap tables: create, edit, merge cells, header rows, delete.
- Test profiles: create, rename, delete, switch.
- Test nested folders: create, rename, duplicate, delete with confirmation.
- Test page templates: save, create from template.
- Test undo/redo: canvas actions, cross-page, after page switch.
- Test localStorage persistence: edit, refresh, confirm data survived.
- Verify security headers appear in DevTools → Network → response headers for any document request.
- Verify the data storage disclosure text appears in Settings → Data & Backup.
- Trigger the storage error banner manually via the DevTools console snippet in `codex-notes/safe-localstorage.md`.
- Trigger the corrupted storage recovery screen via the DevTools steps in `codex-notes/corrupted-storage-recovery.md`.
- Trigger the error boundary fallback via the temporary-throw method in `codex-notes/error-boundary.md`.
- Test JSON backup export and re-import.
- Test PDF export (save file and open directly — not just print preview):
  - Note body and canvas each appear on their own pages.
  - Straight arrows show arrowheads at correct endpoints.
  - Both-direction arrows show arrowheads at both ends.
  - Elbow connectors route with correct right-angle bends.
  - Curve connectors route with the correct arc.
  - Double-line connectors show two parallel strokes.
  - Arrowheads on elbow/curve connectors point along the path tangent.
  - Dashed/dotted connectors show the correct stroke style.
  - Colored shapes and connectors preserve their colors.
  - Connector labels appear at the correct midpoint or bend.

After manual QA confirms stable behavior, the only remaining deferred beta issue is #9 (sidebar/search performance at scale), which is acceptable for a small beta and can be addressed post-launch if needed.

## Post-Beta Refactor Priorities

A maintainability audit was completed 2026-05-26. The full plan is in `codex-notes/refactor-plan.md`.

Completed:
1. ~~Move ~310 lines of pure geometry math out of `CanvasLayer.tsx` into `canvasGeometry.ts` — also eliminates five duplicated helper functions shared with `CanvasObjectToolbar.tsx`.~~ Done 2026-05-26. CanvasLayer.tsx: 2411 → 2105 lines.

Remaining (safe to do in any order):
2. Extract `isEditableTarget` to a shared utility (currently defined in both `ThinkleafApp.tsx` and `CanvasLayer.tsx`).
3. Rename the three `cloneCanvasObjects` variants to prevent confusion (two shallow-clone variants with same-IDs, one ID-remapping variant — different behaviors, easy to misuse).
4. Remove dead `updateCanvasViewState` export from `useWorkspace.ts`.

What not to touch before beta: splitting the `CanvasLayer` component body or `useWorkspace` (risky, architectural changes).

## Pre-Deployment Checklist

Before deploying to a public host:

- Remove `public/.DS_Store` (OS metadata file; should not be served).
- Remove `public/brand/ThinkLeaf Logo Working.ai` (source design file; should not be served). See `notes/bugs-and-issues.md`.
- Configure the deployment platform (Vercel, Netlify, etc.) — no `vercel.json` or `netlify.toml` exists yet.
- Confirm `npm run build` still passes clean after any last-minute changes.
