# Thinkleaf Completed Milestones

## Foundation

- Next.js / React / TypeScript / Tailwind app created
- LocalStorage persistence added
- Profiles added as the top-level organization layer above Projects
- Existing workspaces migrate into the default Work profile
- Active profile persists in localStorage
- Profile create, rename, delete, and switch controls added
- Hydration mismatch from saved sidebar collapsed state fixed
- Snap to Grid and sidebar collapsed preferences now load after mount and persist after hydration
- Starter project/folder/page added
- Project → Folder → Page structure created
- Sidebar navigation created
- Search added
- Search scoped to the active profile
- Favorites added
- Favorites scoped to the active profile
- Tags added
- Note Date added
- Updated Date added

## Rich Text Editor

- Tiptap editor added
- H1, H2, H3 added
- Bold and italic added
- Bullet lists added
- Numbered lists added
- Checklists added
- Links added
- Image insert and paste added
- Document images are resized/compressed and stored as data URLs
- Callout/blockquotes added
- Tables added
- Tiptap duplicate Link warning fixed
- Table header alignment fixed for left, center, and right alignment
- Table header left alignment now renders explicitly
- Document text color controls added
- Document text highlight controls added
- Document text size controls added
- Document text color, highlight, and size controls compacted into dropdowns/popovers
- Document color and highlight controls now use the shared HEX-capable color picker
- H1/H2/H3 controls consolidated into a compact text-style dropdown
- Main document formatting toolbar moved out of the page content into a top workspace toolbar
- Main document toolbar only appears while the editor is active
- Table row, column, and delete controls now appear only when the cursor is inside a table
- Document formatting toolbar active states refresh from current selection/cursor where practical
- Main document toolbar initial unavailable state no longer uses native disabled attributes that can cause hydration mismatch warnings

## Canvas Foundation

- Left-positioned document block added
- Dotted grid workspace added
- Bottom floating canvas toolbar added
- Top canvas bar removed
- Zoom controls moved into the bottom floating canvas toolbar
- Bottom toolbar shortcut badges added for numbered tools, image import, and zoom controls
- Bottom toolbar Undo and Redo buttons added for canvas/page actions
- Undo and Redo buttons positioned between Reset View and Settings in the bottom toolbar
- Undo and Redo buttons verified with muted unavailable states and canvas-scoped shortcuts
- Image import shortcut added on 8
- Zoom shortcuts added with + for Zoom In and - for Zoom Out
- Canvas Undo shortcut added on Cmd/Ctrl+Z
- Canvas Redo shortcuts added on Cmd/Ctrl+Shift+Z and Cmd/Ctrl+Y
- Zoom In shortcut now also supports = while keeping the toolbar badge as +
- Transient zoom percentage indicator added near the bottom toolbar for zoom changes and Reset View
- Canvas object model added
- Rectangle, circle, text box, line, and arrow tools added
- Canvas image objects added
- Canvas image upload/import added
- Canvas image paste from clipboard added
- Canvas images are resized/compressed and stored as data URLs per page
- Canvas image objects support move, resize, select, delete, and persistence
- Click-and-drag object creation added
- Object movement fixed
- Object resizing added
- Line/arrow endpoint editing added
- Text box editing added
- Canvas objects persist per page
- Per-page lightweight canvas undo/redo history added for create, delete, move, resize, style changes, whiteboard text edits, and inserted image objects
- Grid snapping added
- Shape-to-text conversion added
- Right properties panel added
- Right properties panel removed and replaced with a top contextual toolbar for selected canvas objects
- Canvas object duplicate action added to the top contextual toolbar
- Canvas-to-document focus handoff fixed so clicking into the page clears object selection and restores the document toolbar
- Stroke color, fill color, text color, and stroke width controls added
- Canvas pan and zoom added
- Two-finger trackpad scroll pans the whiteboard/canvas area, including over the main document body
- Trackpad pan avoids inputs, menus, toolbars, and contextual controls
- Ctrl/Cmd + wheel zoom preserved for canvas navigation
- Hand/Pan tool fixed for board-level left-click drag on empty canvas space
- Document block and canvas objects pan/zoom together
- Bottom toolbar and top contextual toolbar stay fixed while the board moves
- New pages and Reset View use the left-document default board view
- Tool switching after Pan fixed
- Board surface expanded to a large virtual canvas
- Object clipping from the old narrow right-side canvas area fixed
- Object creation hit area covers the full virtual board after pan/zoom
- Number-key shortcuts added for canvas tools
- Bottom toolbar positioning stabilized so it stays centered in the usable workspace viewport
- Bottom toolbar no longer shifts when selected object state or contextual controls change
- Click-drag creation restored for rectangles, circles, lines, and arrows
- Drag creation previews live object size/line endpoints before pointer release
- Click-drag creation works with pan/zoom and keeps 8px grid snapping
- Snap to Grid added as a separate persisted canvas preference
- Show Grid and Snap to Grid separated
- Free movement supported when Snap to Grid is disabled
- Line and arrow creation preview no longer shows a default-size line before dragging
- Line and arrow creation can complete by drag-release or second click
- Reset View now preserves zoom and resets pan only
- Whiteboard objects render above the document block when overlapping
- Canvas text formatting controls added for text-bearing objects
- Rectangles and circles can retain their shape while containing editable text
- Canvas text highlight controls added for text-bearing objects
- Side resize handles added for rectangles, circles, and text boxes
- Canvas object color, highlight, and text size controls compacted into dropdowns/popovers
- Canvas stroke, fill, text color, and highlight controls now use the shared HEX-capable color picker
- Custom HEX colors persist as recent colors in localStorage
- Rectangle, line, and arrow stroke styles added with solid, dashed, and dotted options
- Standalone whiteboard text boxes default to transparent fill and stroke
- Grid and Snap moved into the bottom toolbar settings menu

## Document Editor Polish

- Document editor horizontal alignment controls added
- Document editor vertical content alignment controls added
- Document editor color, highlight, and text size controls added
- Document vertical alignment preference now loads after mount and persists after hydration

## Sidebar Management

- Sidebar collapse/expand added
- Project/folder collapse/expand added
- Project creation moved to Projects header
- Folder creation added to project rows
- Page creation added to folder rows
- Project delete added
- Folder delete added
- Page delete preserved
- Project rename added
- Folder rename added
- Page rename preserved
- Project duplicate added
- Folder duplicate added
- Page duplicate added
- Page row actions added
- Delete actions moved to far-right action position
- Hover actions added to reduce visual clutter

## Current Recommended Next Task

Short manual QA/polish pass for profiles, image insert, color pickers, toolbar shortcuts, pan/zoom/reset, snap/grid, canvas object editing, document formatting, whiteboard text formatting, and localStorage persistence.
