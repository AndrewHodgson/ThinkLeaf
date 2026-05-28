import type { WorkspaceData } from "@/types/workspace";
import { createDefaultCanvasViewState } from "@/lib/canvasStyle";
import { createId, defaultProfileId, defaultProfileName, timestamp } from "@/lib/workspaceUtils";

export function createOfflineDefaultWorkspace(): WorkspaceData {
  const now = timestamp();
  const projectId = createId("project");
  const folderId = createId("folder");
  const pageId = createId("page");

  return {
    profiles: [
      {
        id: defaultProfileId,
        name: "Personal",
        version: 1,
        deletedAt: null,
        syncedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    activeProfileId: defaultProfileId,
    projects: [
      {
        id: projectId,
        profileId: defaultProfileId,
        name: "Project",
        version: 1,
        deletedAt: null,
        syncedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    folders: [
      {
        id: folderId,
        profileId: defaultProfileId,
        projectId,
        name: "Folder",
        version: 1,
        deletedAt: null,
        syncedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    pages: [
      {
        id: pageId,
        profileId: defaultProfileId,
        projectId,
        folderId,
        title: "Sample Page",
        body: "",
        noteDate: now.slice(0, 10),
        canvasViewState: createDefaultCanvasViewState(),
        canvasObjects: [],
        tags: [],
        isFavorite: false,
        version: 1,
        deletedAt: null,
        syncedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    recentPageIds: [pageId],
  };
}

export const sampleWorkspace: WorkspaceData = createOfflineDefaultWorkspace();

export function createBetaResetWorkspace(): WorkspaceData {
  const now = timestamp();
  const projectId = createId("project");
  const folderId = createId("folder");
  const pageId = createId("page");

  return {
    profiles: [{ id: defaultProfileId, name: defaultProfileName, version: 1, deletedAt: null, syncedAt: null, createdAt: now, updatedAt: now }],
    activeProfileId: defaultProfileId,
    projects: [{ id: projectId, profileId: defaultProfileId, name: "Test Project", version: 1, deletedAt: null, syncedAt: null, createdAt: now, updatedAt: now }],
    folders: [{ id: folderId, profileId: defaultProfileId, projectId, name: "Test Folder", version: 1, deletedAt: null, syncedAt: null, createdAt: now, updatedAt: now }],
    pages: [
      {
        id: pageId,
        profileId: defaultProfileId,
        projectId,
        folderId,
        title: "Test Page",
        body: "",
        noteDate: now.slice(0, 10),
        canvasViewState: createDefaultCanvasViewState(),
        canvasObjects: [],
        tags: [],
        isFavorite: false,
        version: 1,
        deletedAt: null,
        syncedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    recentPageIds: [pageId],
  };
}
