# Thinkleaf Project Vision

## Product Summary

Thinkleaf is a web-based, note-first visual workspace for people working on projects.

It combines clean meeting notes, flexible project organization, custom tags, search, and light whiteboard tools in one calm interface. The core idea is simple: users can type structured notes in a focused document area while also drawing, sketching, placing images, and mapping ideas beside those notes on an open canvas.

Thinkleaf is not meant to be a full whiteboard app first. It is a note-taking app that gives users enough canvas freedom to think visually.

## Working Tagline

Notes with room to think.

## Core Problem

Most whiteboard apps are not built for taking organized notes. They are useful for brainstorming and sketching, but they are weak for meeting notes, search, folder structure, and long-term information recall.

Traditional note-taking apps like OneNote solve some of this, but they can feel cluttered, overly menu-driven, and rigid in how information is organized. OneNote has useful page + drawing behavior, but its notebooks/sections/pages model can feel confusing, and its tagging/folder system does not feel flexible enough.

Thinkleaf solves this by creating a cleaner note-taking workspace where users can:

- Capture meeting notes quickly
- Organize notes by project
- Search old notes easily
- Create their own tags
- Add images and reference material
- Draw concepts, plans, booth layouts, arrows, and visual ideas beside the notes
- Own and control their own workspace

## Product Positioning

Thinkleaf is a calm, project-based note-taking app with built-in visual thinking tools.

It sits between apps like OneNote and Excalidraw:

- OneNote gets the idea of notes plus drawing right, but feels cluttered and rigid.
- Excalidraw has a great simple interface, but it is not designed for organized note-taking.
- Thinkleaf should feel like a cleaner note-first version of that middle ground.

## Target Users

Thinkleaf is primarily for people working on projects who need to capture, organize, and revisit information.

Primary users include:

- Project managers
- Creative professionals
- Designers
- Event planners
- People managing shows, meetings, booths, concepts, and project details
- General note-takers who want visual flexibility without using a full whiteboard app

Thinkleaf is not primarily for users who only want a pure whiteboard app.

## Primary Use Cases

Thinkleaf should be especially useful for:

- Meeting notes
- Show planning
- Custom booth planning
- Project planning
- Design thinking
- Research notes
- Inspiration boards
- Personal notes
- Recipes or other general collections
- Recollection of past project details

Example page:

```text
Show Name Year - Meeting Type - Date

Tags: Show, Year, Custom Booth, Rental

Meeting Notes:
- What was discussed
- Client goals
- Important deadlines
- Open questions
- Follow-up tasks

Booth Details:
| Field | Information |
|---|---|
| Booth Size | 20x30 |
| Booth Number | 821 |
| Show Date | January 2027 |
| Booth Budget | $100,000 |

Canvas Area:
- Quick booth sketch
- Arrows pointing to important notes
- Sticky note with concerns
- Image reference or inspiration
```

## Product Philosophy

Thinkleaf should be:

- Note-first
- Calm
- Professional
- Clean
- Searchable
- Easy to understand
- Flexible without becoming chaotic
- Visual without becoming a full design tool
- Personal and single-user focused at first

Thinkleaf should not become:

- A full team collaboration whiteboard
- A project management app
- A replacement for Figma
- A replacement for Miro
- A cluttered productivity suite
- A complicated all-in-one workspace

The strongest version of Thinkleaf is:

A clean visual notebook where typed notes and sketches live together on the same page.

## Current Interface Layout

Thinkleaf should have three primary interface areas:

### 1. Editor Formatting and Bottom Canvas Toolbar

The document editor should expose practical formatting controls near the note content, while canvas tools should live in a fixed bottom floating toolbar.

Thinkleaf should avoid the clutter of multiple tabs like:

- Home
- Insert
- Draw
- View
- Help

The current prototype uses:

- Document formatting controls for headings, text size, color, highlight, alignment, lists, links, tables, and images
- A bottom floating canvas toolbar for Undo, Redo, Select, Pan, Rectangle, Circle, Text, Line, Arrow, Image Import, Zoom In, Zoom Out, Reset View, and canvas settings
- A compact settings menu for Grid and Snap to Grid
- Shortcut badges on bottom toolbar tools

Future tools can be added carefully, but the toolbar should stay calm and compact.

Future toolbar ideas include:

- Pen/pencil tool
- Eraser
- Page settings
- Presenter view toggle later

The interface can adapt based on selected content later, but the current direction is to keep the main note editor primary and the canvas controls visually secondary.

### 2. Left Sidebar

The left sidebar should handle organization and navigation.

It should include:

- Profiles
- Search bar
- Projects
- Folders
- Pages
- Favorite pages

The structure should be:

```text
Profile
  Project
    Folder
      Page
```

Example:

```text
Work
  Shows
    PCMA Convening Leaders 2027
      CL27 Planning Meeting - 2026-05-21
      Custom Booth Ideas - 2026-05-24
      Sponsor Activation Notes - 2026-05-30
```

For the MVP, Thinkleaf supports one profile layer above the project structure:

```text
Profile → Project → Folder → Page
```

This keeps the app organized without recreating OneNote’s confusing notebook/section/page model.

### 3. Main Workspace

The main workspace should feel like an open whiteboard canvas with a document area inside it.

The user starts in a default centered view with one document block. The canvas should be infinite or feel endless, but the intended use is smaller note sessions rather than giant boards.

The document block should support structured note-taking. Users should be able to draw, sketch, and place visual objects around it, especially to the right side.

## Page Model

Thinkleaf should be profile- and page-based.

For the MVP, each meeting should be its own page.

Recommended structure:

Project: Show Name / Year
Folder: Meeting Notes
Page: Show Name - Meeting Type - Date

This is better than having multiple pages inside one note because it makes search, tags, dates, and organization cleaner.

Later, Thinkleaf can add links between pages, so one project overview page can connect to individual meeting pages.

## Page Types

Thinkleaf can eventually support multiple page types, but the MVP should focus on the primary page type.

### Current Page Type: Document + Canvas

A fixed-width document block appears in an open canvas workspace.

Users can:

- Type structured notes inside the document block
- Add images inside or near the document
- Draw around the document
- Place arrows, shapes, sticky notes, and sketches beside the notes
- Move around the canvas
- Zoom in and out
- Add additional document blocks later

### Future Page Type: Whiteboard

A full open whiteboard with no default document block.

Useful for:

- Brainstorming
- Flowcharts
- Layout planning
- Mind mapping
- Inspiration boards

### Future Page Type: Note

A simple writing-first page with minimal canvas tools.

Useful for:

- Clean notes
- Documentation
- Lists
- Reference material

## Document Block Behavior

Each page starts with one main document block.

The document block should:

- Start in a default centered position
- Be fixed-width by default
- Allow the width to be expanded
- Move with the canvas
- Be lockable so it cannot be accidentally moved
- Use a subtle border or outline to show where the writing area is
- Not look like a heavy visible piece of paper
- Feel clean and modern

Users should eventually be able to add multiple document blocks to a page, but the MVP should start with one main document block.

Typing inside the document block should behave like a normal document editor. Pressing Enter should move to the next line, like Google Docs.

## Canvas Behavior

The canvas should:

- Feel endless
- Support zooming in and out
- Support panning
- Move as one unified workspace
- Not have separate scrolling for the document and canvas
- Use a white background
- Use a light gray dotted grid by default
- Allow the grid to be toggled off
- Allow drawings and objects to float freely

Canvas objects should not need to anchor to text for the MVP. Drawings, arrows, and shapes can float freely near the related notes.

## Text Editor Requirements

The note editor should feel closer to Google Docs than OneNote.

MVP text features should include:

- Headings
- Bullets
- Numbered lists
- Checklists
- Bold
- Italic
- Tables
- Callouts
- Links
- Images

Slash commands are not required for the MVP, but they could be considered later.

Pages should autosave.

Version history can be planned for later but is not required for the first version.

## Whiteboard Tool Requirements

Current whiteboard tools include:

- Select
- Pan
- Rectangle
- Circle
- Text box
- Line
- Arrow
- Image insert
- Undo
- Redo
- Zoom In
- Zoom Out
- Reset View
- Grid toggle
- Snap to Grid

The visual style should be clean and modern, closer to Figma/FigJam than a hand-drawn sketch style.

The canvas should support:

- Light gray dotted grid
- Optional grid toggle
- Snap to Grid as a separate preference
- Basic object resizing
- Basic object deletion
- Image objects
- Text formatting for whiteboard text objects and text-bearing shapes

Pen, eraser, grouping, layers, rotation, connectors, and document block locking are future ideas, not active MVP requirements.

## Tags

Tags should be custom-created by the user.

There should be no large default tag library.

Example tags:

- Show
- Year
- Rental
- Custom Booth
- Meeting Notes
- Design
- Recipe
- Research
- Inspiration

Tags should be optional.

Tags should appear near the top of the active page, above the note title or near the page header, similar to Evernote.

Users should be able to filter notes by tag.

## Search

Search is one of the most important features because the app is primarily for remembering and finding notes later.

MVP search should search:

- Page titles
- Tags
- Body text

Future search should search:

- Canvas text boxes
- Image names
- Linked pages
- Folders
- Projects
- OCR text from images
- AI-generated summaries

Search should be fast and visible in the left sidebar.

## Page Linking

Users should eventually be able to link to:

- Other pages
- Folders
- Projects

This would allow a project overview page to connect to meeting notes, sketches, references, or related pages.

Backlinks are not required for the MVP.

A backlink is an automatic list of pages that link back to the current page. For example, if Page A links to Page B, then Page B can show “Linked from Page A.” This can be useful later, but it is not essential for the first version.

## Favorites and Recents

Thinkleaf should include Favorite pages in the left sidebar.

Recent pages can be considered later if it still fits the calm sidebar direction.

The ability to quickly switch between notes is part of the core experience.

## Visual Design Direction

Thinkleaf should feel:

- Calm
- Professional
- Bright
- Modern
- Clean
- Focused
- Lightweight

The visual direction should borrow from:

- Excalidraw’s simplicity
- Figma/FigJam’s clean object tools
- Google Docs’ familiar writing feel
- A cleaner version of OneNote’s note + drawing concept

It should avoid:

- OneNote-style clutter
- Too many top menu tabs
- Heavy panels
- Overly playful visuals
- A pure whiteboard feel
- A rigid document-only feel

## Background and Page Appearance

The main canvas should use:

- White background
- Light gray dotted grid
- Optional grid toggle

The document block should use:

- Subtle border
- White or very light background
- Clean typography
- Comfortable padding
- Fixed width by default
- Expandable width option

The page should not look like a literal sheet of paper, but it should have enough visual boundary to make writing feel focused.

## Presenter View

Presenter view is not required for the MVP, but it should be considered for later.

Presenter view would hide interface panels and menus so the user can show notes, sketches, or plans cleanly.

## MVP Scope

The first working prototype should prove the core idea:

A user can create a project, create a folder, create a meeting note page, type structured notes, add tags, draw or place objects beside the notes, save the page, search for it later, and reopen it with the content preserved.

## MVP Features

The current MVP/prototype includes:

- Profile creation and switching
- Project creation
- Folder creation inside projects
- Page creation inside folders
- Page rename
- Page delete
- Favorite pages
- Custom tags
- Tag filtering
- Search by title, body text, and tags
- One default document block per page
- Basic rich text editing
- Tables
- Images
- Callouts
- Autosave
- Canvas panning
- Canvas zooming
- Light dotted grid
- Grid toggle
- Snap to Grid
- Basic whiteboard tools
- Floating canvas objects
- Save/load page content
- Save/load canvas objects
- localStorage for prototype storage

## Not Included in MVP

Do not build these in the first prototype:

- User accounts
- Login
- Database
- Cloud sync
- Real-time collaboration
- Team workspaces
- Public sharing
- AI assistant
- Mobile app
- Version history
- Presenter view
- Templates
- Advanced permissions
- Layers
- Backlinks
- OCR
- File management system
- Complex task management

## Future Features

Future versions may include:

- Supabase or database storage
- User login
- Cloud sync
- Version history
- AI summary by project or folder
- AI search across all notes in a project
- AI-generated meeting summaries
- AI extraction of action items
- Page linking
- Backlinks
- Canvas text search
- OCR from images
- Presenter view
- Dark mode
- Page templates
- Export to PDF
- Sharing links
- Basic collaboration

## AI Direction for Later

AI should not be part of the MVP, but Thinkleaf should be designed so AI can eventually help users find and summarize information.

Possible future AI features:

- “Summarize all notes in this project”
- “What was discussed about this booth?”
- “Find all notes related to rentals for this show”
- “Pull all action items from this folder”
- “Create a summary from all meeting notes in this project”
- “Find previous booth budgets mentioned in this project”

AI should support retrieval and summarization, not take over the core note-taking experience.

## Data Model Concept

Each page should store:

- Page title
- Project ID
- Folder ID
- Tags
- Text document content
- Canvas object data
- Canvas position/zoom
- Created date
- Updated date
- Favorite status

Possible early structure:

```text
projects
- id
- name
- created_at
- updated_at

folders
- id
- project_id
- name
- created_at
- updated_at

pages
- id
- project_id
- folder_id
- title
- tags
- document_content_json
- canvas_objects_json
- canvas_view_state_json
- is_favorite
- created_at
- updated_at
```

For the prototype, this can be stored in localStorage.

## Technical Direction

Current prototype stack:

- Next.js
- React
- TypeScript
- Tailwind CSS
- localStorage
- Tiptap for text editing
- Custom lightweight canvas tools for the canvas area

Excalidraw is still a useful reference for interaction simplicity, but Thinkleaf should keep a cleaner note-first visual style.

## First Prototype Goal

The first prototype should focus on the core workflow:

1. Open Thinkleaf
2. See a left sidebar with projects, folders, search, recent pages, and favorites
3. Create a project
4. Create a folder
5. Create a page
6. Add a title
7. Add custom tags
8. Type structured meeting notes
9. Add a simple table for booth details
10. Draw or place shapes/arrows beside the notes
11. Autosave the page
12. Switch to another page
13. Return to the original page and see everything preserved
14. Search for the page by title, tag, or body text

## Definition of Success

The first version is successful if it feels easier and cleaner than OneNote for creating and finding meeting notes, while also allowing quick visual thinking beside the notes.

A successful MVP should prove:

- Notes are easy to create
- Notes are easy to organize
- Notes are easy to search
- Tags are simple and custom
- Drawing beside notes feels natural
- The interface feels calm and uncluttered
- Switching between notes is fast
- The app is clearly note-first, not whiteboard-first

## Core Product Statement

Thinkleaf is a note-first visual workspace for project-based thinking.

It gives users a clean place to capture meeting notes, organize project information, search what they wrote, and sketch ideas beside their notes without the clutter of traditional note apps or the looseness of pure whiteboard tools.
