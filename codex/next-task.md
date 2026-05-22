# Next Codex Task: Manual Browser QA for Profiles, Canvas, and Editor

## Goal

Do a hands-on browser QA pass for the Profiles layer, shared color picker, canvas interactions, and main document editor.

The latest code-path/build stability pass found and fixed a hydration mismatch around saved UI preferences. A full click-through pass is still recommended before adding another feature.

## Requirements

1. Verify profile behavior.
   - Existing localStorage data appears under the default Work profile.
   - Users can create, rename, delete, and switch profiles.
   - Deleting a profile removes only that profile's projects, folders, pages, and canvas objects.
   - The last remaining profile is not removed.
   - Each profile has its own projects, folders, and pages.
   - Search only returns pages from the active profile.
   - Favorite Pages only shows favorites from the active profile.
   - Active profile persists after refresh.
   - Project/folder/page create, rename, duplicate, and delete still work inside each profile.

2. Verify color and formatting behavior.
   - Shared color picker popovers have a solid surface and do not visually float or overlap awkwardly.
   - Color picker popovers close on outside click and when another color picker opens.
   - Custom HEX colors apply from text, highlight, stroke, and fill pickers.
   - Recent colors only show custom HEX colors the user added.
   - Document text color and highlight work.
   - Whiteboard text color and highlight work.
   - Stroke and fill colors work.
   - Solid, dashed, and dotted stroke styles work for rectangles, lines, and arrows.
   - H1/H2/H3 work from the compact text-style dropdown.

3. Verify canvas behavior.
   - Pan, zoom, and Reset View still work.
   - Select, move, resize, endpoint edit, and text edit still work.
   - Rectangle/circle click-drag creation defines width and height.
   - Line/arrow click-drag creation defines start and end points.
   - Single-click object creation still creates default-sized objects.
   - Object creation works after panning and zooming.
   - Snap to Grid persists separately from Show Grid.
   - Snap to Grid affects creation, movement, resizing, and line/arrow endpoints.
   - Turning Snap to Grid off allows free movement.
   - Number-key shortcuts 1-7 switch tools outside editable fields.

4. Verify editor behavior.
   - Tiptap typing, rich text formatting, links, checklists, and tables still work.
   - Document left, center, and right alignment work.
   - Table header left, center, and right alignment work.
   - Document text size and vertical content alignment work.
   - Canvas text object formatting works for standalone text boxes and rectangles/circles with text.

5. Verify persistence.
   - Profiles persist in localStorage.
   - Active profile persists in localStorage.
   - Sidebar collapsed state persists without hydration errors.
   - Snap to Grid persists without hydration errors.
   - Canvas view state persists per page.
   - Canvas objects persist per page.
   - Switching pages and refreshing restores the expected profile/page/canvas state.

## Recommended Next Feature After QA

Document block lock/unlock.

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

Run:

- `npm run build`

Also check the running dev server logs for fresh browser runtime errors after loading and interacting with the app.

## Response Format

After completing this, summarize:

1. Files changed
2. What was tested
3. Bugs found
4. Bugs fixed
5. Build status
6. Remaining issues
7. Recommended next feature
