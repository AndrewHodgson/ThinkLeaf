## Latest Completed Milestone

- Focused toolbar cleanup pass completed
- Removed the top canvas bar that showed "CANVAS"
- Zoom In, Zoom Out, and Reset View now live in the fixed bottom floating canvas toolbar
- Bottom toolbar remains icon-only for primary controls with accessible labels and tooltips
- Bottom toolbar still contains Select, Pan, Rectangle, Circle, Text, Line, Arrow, Image, and Settings/Grid/Snap controls
- Image support added for the main document and whiteboard canvas
- Main Tiptap document now supports inserted/pasted images stored as compressed data URLs
- Whiteboard canvas now supports image objects stored as compressed data URLs
- Canvas image objects can be moved, resized, selected, deleted, and persisted per page
- Image import buttons added for both document editing and whiteboard canvas import
- Clipboard image paste routes to the document when focus is in the editor and to the canvas when focus is on the whiteboard
- Large images are resized to a max dimension of about 1600px and compressed before localStorage storage
- Basic image import errors now surface when an image is too large or cannot be processed
- Focused profiles/color-picker stability pass completed
- Production build passes after the latest Profiles and color-picker work
- Existing dev server responds successfully on localhost
- Fixed hydration mismatch caused by reading saved sidebar collapsed state during initial client render
- Snap to Grid and sidebar collapsed preferences now load after mount and persist after hydration
- Document vertical alignment preference now loads after mount and persists after hydration
- Code-path QA covered profile scoping, existing-data migration, active-profile search/favorites, color picker recent HEX storage, stroke/fill/text color controls, stroke styles, canvas persistence, and Tiptap formatting extensions
- Profiles organization layer added above Projects
- Existing localStorage workspace data now migrates into the default Work profile
- Profiles persist in localStorage along with the active profile
- Users can create, rename, delete, and switch profiles from the sidebar
- Each profile now owns its own projects, folders, and pages
- Search is scoped to the active profile
- Favorite Pages only shows favorites from the active profile
- Project, folder, page, editor, canvas, and localStorage behavior is preserved inside each profile
- Color and toolbar polish pass completed
- Shared color picker now uses a solid popover with a clean swatch grid, padding, border, and shadow
- Main document text color, document highlight, whiteboard text color, whiteboard highlight, stroke color, and fill color now reuse the shared color picker
- Color picker popovers close on outside click and when another color picker opens
- Custom HEX color entry added to every shared color picker
- Recent colors now persist in localStorage and only include custom HEX colors added by the user
- H1/H2/H3 controls are now consolidated into a compact text-style dropdown
- Rectangle, line, and arrow objects now support solid, dashed, and dotted stroke styles
- Toolbar and formatting UX cleanup pass completed
- Main document text size, color, and highlight controls are now compact dropdowns/popovers
- Whiteboard object stroke, fill, text color, highlight, and text size controls are now compact dropdowns/popovers
- Formatting toolbar active states now refresh from the current Tiptap selection/cursor where practical
- Table header left alignment now writes explicit left alignment instead of relying on browser table-header defaults
- Standalone whiteboard text boxes now default to transparent fill and stroke
- Bottom toolbar Grid and Snap controls moved into a compact canvas settings menu
- Text formatting and resize polish pass completed
- Table header cells now support left, center, and right alignment
- Main document editor now has text color, highlight, and text size controls
- Whiteboard text-bearing objects now have matching highlight controls alongside text color, size, bold, italic, and alignment
- Rectangle, circle, and text box objects now have top, right, bottom, and left resize handles in addition to corner handles
- Side resize handles preserve snap-to-grid behavior when Snap to Grid is enabled
- Canvas/editor polish pass completed
- Next.js dev and build scripts now use webpack mode to avoid the current Turbopack internal error path
- Snap to Grid added as a separate ON-by-default canvas preference
- Snap to Grid persists in localStorage and is independent from Show Grid
- Object creation, movement, resizing, and line/arrow endpoints honor Snap to Grid when enabled and move freely when disabled
- Line and arrow creation now starts from the cursor point and previews naturally while dragging or before a second click
- Reset View now resets pan to the default board position while preserving the current zoom level
- Main document editor now has left, center, right, top, middle, and bottom alignment controls
- Whiteboard text objects now support bold, italic, alignment, text color, and size controls
- Rectangle/circle objects can retain their shape while gaining editable text
- Whiteboard objects now render above the main document block when they overlap it
- Canvas interaction stabilization pass completed
- Bottom floating canvas toolbar now stays visually fixed to the workspace viewport
- Bottom toolbar no longer shifts when objects are created, selected, resized, or when the right properties panel appears
- Click-drag creation restored for rectangles, circles, lines, and arrows
- Drag-created objects show live size/endpoint updates while dragging
- Single-click creation still creates default-sized objects
- Object creation still snaps to the 8px grid and works after pan/zoom
- Object movement bug fixed
- Click-and-drag object creation added
- Bottom floating canvas toolbar added
- Right-side object properties panel added
- Sidebar collapse/expand added
- Project and folder collapse/expand added
- Hand/Pan tool fixed for board-level left-click drag on empty canvas space
- Document block and canvas objects now pan/zoom together
- Bottom toolbar and right properties panel stay fixed while the board moves
- New pages and Reset View use the correct left-document default board view
- Tool switching after using Pan no longer gets stuck
- Board surface expanded to a large virtual canvas so objects are not clipped by the initial right-side area
- Object creation, rendering, and editing now use the larger board surface
- Object creation hit area now covers the full virtual board after pan/zoom
- Number-key shortcuts added for canvas tools: 1 Select, 2 Pan, 3 Rectangle, 4 Circle, 5 Text Box, 6 Line, 7 Arrow
- Canvas pan/zoom state persists per page
- Canvas objects still persist per page in localStorage
- Build passes with npm run build

## Current Canvas Tools

- Select
- Pan
- Rectangle
- Circle
- Text Box
- Line
- Arrow
- Image Import
- Zoom Out
- Reset View
- Zoom In
- Grid Toggle
- Canvas Settings

## Current Object Editing

- Move objects
- Resize rectangles, circles, and text boxes
- Move and resize image objects
- Edit line and arrow endpoints
- Edit text boxes
- Change stroke color
- Change fill color
- Change text color for text boxes
- Change text bold, italic, alignment, vertical alignment, highlight, and size for text-bearing canvas objects
- Change stroke width
- Change stroke style for rectangles, lines, and arrows
- Resize rectangles, circles, and text boxes from side or corner handles
- Delete selected object

## Recommended Next

Do a manual browser QA pass on profile switching, image import/paste, color picker interactions, and core canvas/editor workflows before adding new major features.

Possible next feature after stabilization:
- Simple connectors later
- Document block lock/unlock
- Freehand pen
