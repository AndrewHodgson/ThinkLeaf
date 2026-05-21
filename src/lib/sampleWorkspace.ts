import type { WorkspaceData } from "@/types/workspace";

const now = "2026-05-21T12:00:00.000Z";

export const sampleWorkspace: WorkspaceData = {
  projects: [
    {
      id: "project-shows",
      name: "Shows",
      createdAt: now,
      updatedAt: now,
    },
  ],
  folders: [
    {
      id: "folder-pcma-2027",
      projectId: "project-shows",
      name: "PCMA Convening Leaders 2027",
      createdAt: now,
      updatedAt: now,
    },
  ],
  pages: [
    {
      id: "page-planning-meeting",
      projectId: "project-shows",
      folderId: "folder-pcma-2027",
      title: "CL27 Planning Meeting - 2026-05-21",
      noteDate: "2026-05-21",
      canvasObjects: [],
      tags: ["Show", "Meeting Notes", "Custom Booth"],
      isFavorite: true,
      createdAt: now,
      updatedAt: now,
      body:
        "<h2>Meeting Notes</h2><ul><li><p>Confirm booth goals and audience priorities</p></li><li><p>Review preliminary booth size, budget, and timeline</p></li><li><p>Collect inspiration references for the right side of the canvas</p></li></ul><h2>Booth Details</h2><table><tbody><tr><th><p>Field</p></th><th><p>Information</p></th></tr><tr><td><p>Booth Size</p></td><td><p>20x30</p></td></tr><tr><td><p>Booth Number</p></td><td><p>821</p></td></tr><tr><td><p>Show Date</p></td><td><p>January 2027</p></td></tr><tr><td><p>Booth Budget</p></td><td><p>$100,000</p></td></tr></tbody></table><h2>Open Questions</h2><ul data-type=\"taskList\"><li data-type=\"taskItem\" data-checked=\"false\"><label><input type=\"checkbox\"><span></span></label><div><p>Which sponsorship elements need dedicated space?</p></div></li><li data-type=\"taskItem\" data-checked=\"false\"><label><input type=\"checkbox\"><span></span></label><div><p>What references should be added beside these notes?</p></div></li></ul><blockquote><p>Use the open canvas beside this document for sketches, arrows, and visual references.</p></blockquote>",
    },
  ],
  recentPageIds: ["page-planning-meeting"],
};
