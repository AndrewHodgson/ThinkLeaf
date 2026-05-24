"use client";

import { useEffect, useMemo, useState } from "react";
import { sampleWorkspace } from "@/lib/sampleWorkspace";
import { createDefaultCanvasViewState, defaultCanvasStyle, defaultPenSettings } from "@/lib/canvasStyle";
import { createId, defaultProfileId, defaultProfileName, timestamp, toDateInputValue } from "@/lib/workspaceUtils";
import type { CanvasObject, Folder, Page, PageTemplate, Profile, Project, WorkspaceData } from "@/types/workspace";

const STORAGE_KEY = "thinkleaf.workspace.v1";

function normalizeCanvasObject(object: CanvasObject): CanvasObject {
  const width = Math.max(24, object.width ?? 120);
  const height = Math.max(24, object.height ?? 80);
  const normalized: CanvasObject = {
    ...object,
    x: object.x ?? 0,
    y: object.y ?? 0,
    width,
    height,
    strokeColor: object.strokeColor ?? defaultCanvasStyle.strokeColor,
    fillColor: object.fillColor ?? defaultCanvasStyle.fillColor,
    strokeWidth: object.strokeWidth ?? defaultCanvasStyle.strokeWidth,
    strokeStyle: object.strokeStyle ?? defaultCanvasStyle.strokeStyle,
    textColor: object.textColor ?? defaultCanvasStyle.textColor,
    textHighlightColor: object.textHighlightColor ?? defaultCanvasStyle.textHighlightColor,
    textBold: object.textBold ?? defaultCanvasStyle.textBold,
    textItalic: object.textItalic ?? defaultCanvasStyle.textItalic,
    textAlign: object.textAlign ?? defaultCanvasStyle.textAlign,
    textVerticalAlign: object.textVerticalAlign ?? defaultCanvasStyle.textVerticalAlign,
    fontSize: object.fontSize ?? defaultCanvasStyle.fontSize,
    imageDataUrl: object.imageDataUrl,
    penPoints: Array.isArray(object.penPoints)
      ? object.penPoints.filter(
          (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
        ).map((point) => ({
          x: point.x,
          y: point.y,
          ...(Number.isFinite(point.t) ? { t: point.t } : {}),
        }))
      : undefined,
    ...(object.type === "penStroke"
      ? {
          penMode:
            object.penMode === "ink" || object.penMode === "uniform" || object.penMode === "highlighter"
              ? object.penMode
              : defaultPenSettings.mode,
          penInkDensity:
            object.penInkDensity === "low" ||
            object.penInkDensity === "medium" ||
            object.penInkDensity === "high" ||
            object.penInkDensity === "veryHigh"
              ? object.penInkDensity
              : defaultPenSettings.inkDensity,
          penSmoothing:
            object.penSmoothing === "off" ||
            object.penSmoothing === "light" ||
            object.penSmoothing === "medium" ||
            object.penSmoothing === "high" ||
            object.penSmoothing === "veryHigh"
              ? object.penSmoothing
              : defaultPenSettings.smoothing,
        }
      : {}),
  };

  if ((object.type === "line" || object.type === "arrow") && object.x1 === undefined) {
    return {
      ...normalized,
      x1: normalized.x,
      y1: normalized.y + normalized.height / 2,
      x2: normalized.x + normalized.width,
      y2: normalized.y + normalized.height / 2,
    };
  }

  return normalized;
}

function createDefaultProfile(now = timestamp()): Profile {
  return {
    id: defaultProfileId,
    name: defaultProfileName,
    createdAt: now,
    updatedAt: now,
  };
}

function createStarterProfileContent(profileId: string, now = timestamp()) {
  const projectId = createId("project");
  const folderId = createId("folder");
  const pageId = createId("page");

  return {
    project: {
      id: projectId,
      profileId,
      name: "New Project",
      createdAt: now,
      updatedAt: now,
    },
    folder: {
      id: folderId,
      profileId,
      projectId,
      name: "Notes",
      createdAt: now,
      updatedAt: now,
    },
    page: {
      id: pageId,
      profileId,
      projectId,
      folderId,
      title: "Untitled meeting note",
      body: "",
      noteDate: toDateInputValue(now),
      canvasViewState: createDefaultCanvasViewState(),
      canvasObjects: [],
      tags: [],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    },
  } satisfies { project: Project; folder: Folder; page: Page };
}

function normalizeWorkspace(data: Partial<WorkspaceData>): WorkspaceData {
  const now = timestamp();
  const profiles =
    Array.isArray(data.profiles) && data.profiles.length
      ? data.profiles.map((profile) => ({
          ...profile,
          name: profile.name?.trim() || defaultProfileName,
          createdAt: profile.createdAt ?? now,
          updatedAt: profile.updatedAt ?? now,
        }))
      : [createDefaultProfile(now)];
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const activeProfileId =
    data.activeProfileId && profileIds.has(data.activeProfileId) ? data.activeProfileId : profiles[0].id;
  const rawProjects = Array.isArray(data.projects) ? data.projects : [];
  const projects = rawProjects.map((project) => ({
    ...project,
    profileId: project.profileId && profileIds.has(project.profileId) ? project.profileId : activeProfileId,
  }));
  const projectProfileIds = new Map(projects.map((project) => [project.id, project.profileId]));
  const rawFolders = Array.isArray(data.folders) ? data.folders : [];
  const foldersWithProfiles = rawFolders.map((folder) => {
    const profileId =
      folder.profileId && profileIds.has(folder.profileId)
        ? folder.profileId
        : projectProfileIds.get(folder.projectId) ?? activeProfileId;

    return {
      ...folder,
      profileId,
    };
  });
  const foldersById = new Map(foldersWithProfiles.map((folder) => [folder.id, folder]));
  const folders = foldersWithProfiles.map((folder) => ({
    ...folder,
    parentFolderId:
      typeof folder.parentFolderId === "string" && isValidParentFolder(foldersById, folder, folder.parentFolderId)
        ? folder.parentFolderId
        : undefined,
  }));
  const folderProfileIds = new Map(folders.map((folder) => [folder.id, folder.profileId]));

  return {
    profiles,
    activeProfileId,
    projects,
    folders,
    pages: (Array.isArray(data.pages) ? data.pages : []).map((page) => ({
      ...page,
      profileId:
        page.profileId && profileIds.has(page.profileId)
          ? page.profileId
          : projectProfileIds.get(page.projectId) ?? folderProfileIds.get(page.folderId) ?? activeProfileId,
      noteDate: page.noteDate ?? toDateInputValue(page.createdAt),
      canvasViewState: page.canvasViewState ?? createDefaultCanvasViewState(),
      canvasObjects: Array.isArray(page.canvasObjects)
        ? page.canvasObjects.map((object) => normalizeCanvasObject(object))
        : [],
    })),
    recentPageIds: Array.isArray(data.recentPageIds) ? data.recentPageIds : [],
  };
}

function pickFallbackPageId(pages: Page[], preferredPageId: string) {
  if (pages.some((page) => page.id === preferredPageId)) {
    return preferredPageId;
  }

  return pages[0]?.id ?? "";
}

function getProfilePages(data: WorkspaceData, profileId: string) {
  return data.pages.filter((page) => page.profileId === profileId);
}

function pickFallbackPageIdForProfile(data: WorkspaceData, profileId: string, preferredPageId?: string) {
  const pages = getProfilePages(data, profileId);
  const recentPageId = data.recentPageIds.find((pageId) => pages.some((page) => page.id === pageId));

  return pickFallbackPageId(pages, preferredPageId ?? recentPageId ?? "");
}

function isValidParentFolder(foldersById: Map<string, Folder>, folder: Folder, parentFolderId: string) {
  const parentFolder = foldersById.get(parentFolderId);
  if (
    !parentFolder ||
    parentFolder.id === folder.id ||
    parentFolder.projectId !== folder.projectId ||
    parentFolder.profileId !== folder.profileId
  ) {
    return false;
  }

  const visitedFolderIds = new Set([folder.id]);
  let currentFolder: Folder | undefined = parentFolder;

  while (currentFolder) {
    if (visitedFolderIds.has(currentFolder.id)) {
      return false;
    }

    visitedFolderIds.add(currentFolder.id);
    if (!currentFolder.parentFolderId) {
      return true;
    }

    currentFolder = foldersById.get(currentFolder.parentFolderId);
    if (
      currentFolder &&
      (currentFolder.projectId !== folder.projectId || currentFolder.profileId !== folder.profileId)
    ) {
      return false;
    }
  }

  return true;
}

function getDescendantFolderIds(folders: Folder[], folderId: string) {
  const ids = new Set<string>([folderId]);
  let changed = true;

  while (changed) {
    changed = false;

    for (const folder of folders) {
      if (!ids.has(folder.id) && folder.parentFolderId && ids.has(folder.parentFolderId)) {
        ids.add(folder.id);
        changed = true;
      }
    }
  }

  return ids;
}

function cloneCanvasObjects(objects: CanvasObject[]) {
  const objectIdMap = new Map<string, string>();

  for (const object of objects) {
    objectIdMap.set(object.id, createId("object"));
  }

  return objects.map((object) => {
    const nextId = objectIdMap.get(object.id) ?? createId("object");
    return {
      ...object,
      id: nextId,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };
  });
}

function loadWorkspace(): WorkspaceData {
  if (typeof window === "undefined") {
    return sampleWorkspace;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return sampleWorkspace;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<WorkspaceData>;

    if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.folders) || !Array.isArray(parsed.pages)) {
      return sampleWorkspace;
    }

    return normalizeWorkspace(parsed);
  } catch {
    return sampleWorkspace;
  }
}

export function useWorkspace() {
  const [data, setData] = useState<WorkspaceData>(sampleWorkspace);
  const [activePageId, setActivePageId] = useState(sampleWorkspace.pages[0]?.id ?? "");
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadWorkspace();
    setData(loaded);
    setActivePageId(pickFallbackPageIdForProfile(loaded, loaded.activeProfileId));
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hasHydrated]);

  const activeProfile = useMemo(
    () => data.profiles.find((profile) => profile.id === data.activeProfileId) ?? data.profiles[0],
    [data.activeProfileId, data.profiles],
  );
  const activeProfileId = activeProfile?.id ?? "";
  const activeProfileData = useMemo(
    () => ({
      ...data,
      activeProfileId,
      projects: data.projects.filter((project) => project.profileId === activeProfileId),
      folders: data.folders.filter((folder) => folder.profileId === activeProfileId),
      pages: data.pages.filter((page) => page.profileId === activeProfileId),
      recentPageIds: data.recentPageIds.filter((pageId) =>
        data.pages.some((page) => page.id === pageId && page.profileId === activeProfileId),
      ),
    }),
    [activeProfileId, data],
  );
  const activePage = useMemo(
    () => activeProfileData.pages.find((page) => page.id === activePageId) ?? activeProfileData.pages[0],
    [activePageId, activeProfileData.pages],
  );

  function selectProfile(profileId: string) {
    setData((current) => {
      if (!current.profiles.some((profile) => profile.id === profileId)) {
        return current;
      }

      setActivePageId(pickFallbackPageIdForProfile(current, profileId));
      return {
        ...current,
        activeProfileId: profileId,
      };
    });
  }

  function createProfile(name: string) {
    const cleanName = name.trim();
    if (!cleanName) {
      return;
    }

    const now = timestamp();
    const profile: Profile = {
      id: createId("profile"),
      name: cleanName,
      createdAt: now,
      updatedAt: now,
    };
    const starter = createStarterProfileContent(profile.id, now);

    setData((current) => ({
      ...current,
      profiles: [...current.profiles, profile],
      activeProfileId: profile.id,
      projects: [...current.projects, starter.project],
      folders: [...current.folders, starter.folder],
      pages: [...current.pages, starter.page],
      recentPageIds: [starter.page.id, ...current.recentPageIds.filter((id) => id !== starter.page.id)].slice(0, 8),
    }));
    setActivePageId(starter.page.id);
  }

  function renameProfile(profileId: string, name: string) {
    const cleanName = name.trim();
    if (!cleanName) {
      return;
    }

    const now = timestamp();

    setData((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === profileId ? { ...profile, name: cleanName, updatedAt: now } : profile,
      ),
    }));
  }

  function deleteProfile(profileId: string) {
    setData((current) => {
      if (current.profiles.length <= 1 || !current.profiles.some((profile) => profile.id === profileId)) {
        return current;
      }

      const nextProfiles = current.profiles.filter((profile) => profile.id !== profileId);
      const nextActiveProfileId =
        current.activeProfileId === profileId ? nextProfiles[0]?.id ?? "" : current.activeProfileId;
      const deletedPageIds = new Set(
        current.pages.filter((page) => page.profileId === profileId).map((page) => page.id),
      );
      const nextData: WorkspaceData = {
        ...current,
        profiles: nextProfiles,
        activeProfileId: nextActiveProfileId,
        projects: current.projects.filter((project) => project.profileId !== profileId),
        folders: current.folders.filter((folder) => folder.profileId !== profileId),
        pages: current.pages.filter((page) => page.profileId !== profileId),
        recentPageIds: current.recentPageIds.filter((pageId) => !deletedPageIds.has(pageId)),
      };

      if (current.activeProfileId === profileId) {
        setActivePageId(pickFallbackPageIdForProfile(nextData, nextActiveProfileId));
      }

      return nextData;
    });
  }

  function selectPage(pageId: string) {
    setActivePageId(pageId);
    setData((current) => ({
      ...current,
      recentPageIds: [pageId, ...current.recentPageIds.filter((id) => id !== pageId)].slice(0, 8),
    }));
  }

  function createProject(name: string) {
    const cleanName = name.trim();
    if (!cleanName) {
      return;
    }

    const now = timestamp();
    const project: Project = {
      id: createId("project"),
      profileId: activeProfileId,
      name: cleanName,
      createdAt: now,
      updatedAt: now,
    };

    setData((current) => ({
      ...current,
      projects: [...current.projects, project],
    }));
  }

  function duplicateProject(projectId: string) {
    setData((current) => {
      const sourceProject = current.projects.find((project) => project.id === projectId);
      if (!sourceProject) {
        return current;
      }

      const now = timestamp();
      const projectCopyId = createId("project");
      const folderIdMap = new Map<string, string>();
      const pageIdMap = new Map<string, string>();

      const copiedFolders = current.folders
        .filter((folder) => folder.projectId === projectId)
        .map((folder) => {
          const nextFolderId = createId("folder");
          folderIdMap.set(folder.id, nextFolderId);
          return {
            ...folder,
            id: nextFolderId,
            projectId: projectCopyId,
            profileId: sourceProject.profileId,
            name: `${folder.name} Copy`,
            createdAt: now,
            updatedAt: now,
          };
        });

      const copiedPages = current.pages
        .filter((page) => page.projectId === projectId)
        .map((page) => {
          const nextPageId = createId("page");
          pageIdMap.set(page.id, nextPageId);
          const nextFolderId = folderIdMap.get(page.folderId);
          return {
            ...page,
            id: nextPageId,
            projectId: projectCopyId,
            profileId: sourceProject.profileId,
            folderId: nextFolderId ?? copiedFolders[0]?.id ?? page.folderId,
            title: `${page.title || "Untitled meeting note"} Copy`,
            body: page.body,
            noteDate: page.noteDate,
            canvasViewState: page.canvasViewState,
            canvasObjects: cloneCanvasObjects(page.canvasObjects),
            tags: [...page.tags],
            isFavorite: false,
            createdAt: now,
            updatedAt: now,
          };
        });

      const copiedProject: Project = {
        ...sourceProject,
        id: projectCopyId,
        profileId: sourceProject.profileId,
        name: `${sourceProject.name} Copy`,
        createdAt: now,
        updatedAt: now,
      };

      const nextPages = [...current.pages, ...copiedPages];
      const nextActivePageId =
        sourceProject.profileId === current.activeProfileId
          ? copiedPages[0]?.id ??
            pickFallbackPageId(getProfilePages({ ...current, pages: nextPages }, sourceProject.profileId), activePageId)
          : activePageId;

      setActivePageId(nextActivePageId);

      return {
        ...current,
        projects: [...current.projects, copiedProject],
        folders: [
          ...current.folders,
          ...copiedFolders.map((folder) => ({
            ...folder,
            parentFolderId: folder.parentFolderId ? folderIdMap.get(folder.parentFolderId) : undefined,
          })),
        ],
        pages: nextPages,
        recentPageIds: [...copiedPages.map((page) => page.id), ...current.recentPageIds]
          .filter((id, index, list) => list.indexOf(id) === index)
          .slice(0, 8),
      };
    });
  }

  function renameProject(projectId: string, name: string) {
    const cleanName = name.trim();
    if (!cleanName) {
      return;
    }

    const now = timestamp();

    setData((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, name: cleanName, updatedAt: now } : project,
      ),
    }));
  }

  function deleteProject(projectId: string) {
    setData((current) => {
      const deletedPageIds = new Set(current.pages.filter((page) => page.projectId === projectId).map((page) => page.id));
      const nextPages = current.pages.filter((page) => page.projectId !== projectId);
      const sourceProject = current.projects.find((project) => project.id === projectId);
      const nextActivePageId =
        sourceProject?.profileId === current.activeProfileId
          ? pickFallbackPageId(getProfilePages({ ...current, pages: nextPages }, current.activeProfileId), activePageId)
          : activePageId;

      setActivePageId(nextActivePageId);

      return {
        ...current,
        projects: current.projects.filter((project) => project.id !== projectId),
        folders: current.folders.filter((folder) => folder.projectId !== projectId),
        pages: nextPages,
        recentPageIds: current.recentPageIds.filter((pageId) => !deletedPageIds.has(pageId)),
      };
    });
  }

  function createFolder(projectId: string, name: string, parentFolderId?: string) {
    const cleanName = name.trim();
    if (!projectId || !cleanName) {
      return;
    }

    setData((current) => {
      const project = current.projects.find((item) => item.id === projectId);
      if (!project) {
        return current;
      }

      const parentFolder = parentFolderId
        ? current.folders.find(
            (folder) =>
              folder.id === parentFolderId &&
              folder.projectId === projectId &&
              folder.profileId === project.profileId,
          )
        : undefined;
      const now = timestamp();
      const folder: Folder = {
        id: createId("folder"),
        profileId: parentFolder?.profileId ?? project.profileId,
        projectId,
        parentFolderId: parentFolder?.id,
        name: cleanName,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...current,
        folders: [...current.folders, folder],
        projects: current.projects.map((item) =>
          item.id === projectId ? { ...item, updatedAt: now } : item,
        ),
      };
    });
  }

  function duplicateFolder(folderId: string) {
    setData((current) => {
      const sourceFolder = current.folders.find((folder) => folder.id === folderId);
      if (!sourceFolder) {
        return current;
      }

      const now = timestamp();
      const folderIdsToCopy = getDescendantFolderIds(current.folders, folderId);
      const folderIdMap = new Map<string, string>();
      for (const sourceId of folderIdsToCopy) {
        folderIdMap.set(sourceId, createId("folder"));
      }
      const nextRootFolderId = folderIdMap.get(folderId) ?? createId("folder");
      const copiedFolders = current.folders
        .filter((folder) => folderIdsToCopy.has(folder.id))
        .map((folder) => ({
          ...folder,
          id: folderIdMap.get(folder.id) ?? createId("folder"),
          profileId: sourceFolder.profileId,
          parentFolderId:
            folder.id === folderId
              ? sourceFolder.parentFolderId
              : folder.parentFolderId
                ? folderIdMap.get(folder.parentFolderId)
                : undefined,
          name: folder.id === folderId ? `${folder.name} Copy` : folder.name,
          createdAt: now,
          updatedAt: now,
        }));
      const copiedPages = current.pages
        .filter((page) => folderIdsToCopy.has(page.folderId))
        .map((page) => {
          const nextPageId = createId("page");
          return {
            ...page,
            id: nextPageId,
            profileId: sourceFolder.profileId,
            projectId: sourceFolder.projectId,
            folderId: folderIdMap.get(page.folderId) ?? nextRootFolderId,
            title: `${page.title || "Untitled meeting note"} Copy`,
            body: page.body,
            noteDate: page.noteDate,
            canvasViewState: page.canvasViewState,
            canvasObjects: cloneCanvasObjects(page.canvasObjects),
            tags: [...page.tags],
            isFavorite: false,
            createdAt: now,
            updatedAt: now,
          };
        });

      const nextPages = [...current.pages, ...copiedPages];
      const nextActivePageId =
        sourceFolder.profileId === current.activeProfileId
          ? copiedPages[0]?.id ??
            pickFallbackPageId(getProfilePages({ ...current, pages: nextPages }, sourceFolder.profileId), activePageId)
          : activePageId;

      setActivePageId(nextActivePageId);

      return {
        ...current,
        folders: [...current.folders, ...copiedFolders],
        pages: nextPages,
        recentPageIds: [...copiedPages.map((page) => page.id), ...current.recentPageIds]
          .filter((id, index, list) => list.indexOf(id) === index)
          .slice(0, 8),
      };
    });
  }

  function renameFolder(folderId: string, name: string) {
    const cleanName = name.trim();
    if (!cleanName) {
      return;
    }

    const now = timestamp();

    setData((current) => ({
      ...current,
      folders: current.folders.map((folder) =>
        folder.id === folderId ? { ...folder, name: cleanName, updatedAt: now } : folder,
      ),
    }));
  }

  function deleteFolder(folderId: string) {
    setData((current) => {
      const sourceFolder = current.folders.find((folder) => folder.id === folderId);
      const deletedFolderIds = getDescendantFolderIds(current.folders, folderId);
      const deletedPageIds = new Set(
        current.pages.filter((page) => deletedFolderIds.has(page.folderId)).map((page) => page.id),
      );
      const nextPages = current.pages.filter((page) => !deletedFolderIds.has(page.folderId));
      const nextActivePageId =
        sourceFolder?.profileId === current.activeProfileId
          ? pickFallbackPageId(getProfilePages({ ...current, pages: nextPages }, current.activeProfileId), activePageId)
          : activePageId;

      setActivePageId(nextActivePageId);

      return {
        ...current,
        folders: current.folders.filter((folder) => !deletedFolderIds.has(folder.id)),
        pages: nextPages,
        recentPageIds: current.recentPageIds.filter((pageId) => !deletedPageIds.has(pageId)),
      };
    });
  }

  function createPage(projectId: string, folderId: string, title = "Untitled meeting note", template?: PageTemplate) {
    if (!projectId || !folderId) {
      return;
    }

    const pageId = createId("page");
    const cleanTitle = title.trim() || template?.title || "Untitled meeting note";

    setData((current) => {
      const project = current.projects.find((item) => item.id === projectId);
      const folder = current.folders.find(
        (item) => item.id === folderId && item.projectId === projectId && item.profileId === project?.profileId,
      );
      if (!project || !folder) {
        return current;
      }

      const now = timestamp();
      const page: Page = {
        id: pageId,
        profileId: folder.profileId,
        projectId,
        folderId,
        title: cleanTitle,
        body: template?.body ?? "",
        noteDate: toDateInputValue(now),
        canvasViewState: template?.canvasViewState ?? createDefaultCanvasViewState(),
        canvasObjects: template ? cloneCanvasObjects(template.canvasObjects) : [],
        tags: template ? [...template.tags] : [],
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...current,
        pages: [...current.pages, page],
        folders: current.folders.map((item) =>
          item.id === folderId ? { ...item, updatedAt: now } : item,
        ),
        projects: current.projects.map((item) =>
          item.id === projectId ? { ...item, updatedAt: now } : item,
        ),
        recentPageIds: [page.id, ...current.recentPageIds.filter((id) => id !== page.id)].slice(0, 8),
      };
    });
    setActivePageId(pageId);
  }

  function duplicatePage(pageId: string) {
    const sourcePage = data.pages.find((page) => page.id === pageId);
    if (!sourcePage) {
      return;
    }

    const copiedPageId = createId("page");
    const now = timestamp();
    const copiedPage: Page = {
      ...sourcePage,
      id: copiedPageId,
      title: `${sourcePage.title || "Untitled meeting note"} Copy`,
      body: sourcePage.body,
      noteDate: sourcePage.noteDate,
      canvasViewState: sourcePage.canvasViewState,
      canvasObjects: cloneCanvasObjects(sourcePage.canvasObjects),
      tags: [...sourcePage.tags],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    };

    setData((current) => {
      if (!current.pages.some((page) => page.id === pageId)) {
        return current;
      }

      return {
        ...current,
        pages: [...current.pages, copiedPage],
        recentPageIds: [copiedPage.id, ...current.recentPageIds.filter((id) => id !== copiedPage.id)].slice(0, 8),
      };
    });
    setActivePageId(copiedPageId);
  }

  function updatePage(
    pageId: string,
    updates: Partial<
      Pick<Page, "title" | "body" | "noteDate" | "canvasViewState" | "canvasObjects" | "tags" | "isFavorite">
    >,
  ) {
    const now = timestamp();

    setData((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              ...updates,
              updatedAt: now,
            }
          : page,
      ),
    }));
  }

  function renamePage(pageId: string, title: string) {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return;
    }

    const now = timestamp();

    setData((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId ? { ...page, title: cleanTitle, updatedAt: now } : page,
      ),
    }));
  }

  function updateCanvasViewState(pageId: string, canvasViewState: Page["canvasViewState"]) {
    const now = timestamp();

    setData((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              canvasViewState,
              updatedAt: now,
            }
          : page,
      ),
    }));
  }

  function deletePage(pageId: string) {
    setData((current) => {
      const nextPages = current.pages.filter((page) => page.id !== pageId);
      const sourcePage = current.pages.find((page) => page.id === pageId);
      const nextActivePageId =
        sourcePage?.profileId === current.activeProfileId
          ? pickFallbackPageId(getProfilePages({ ...current, pages: nextPages }, current.activeProfileId), activePageId)
          : activePageId;

      setActivePageId(nextActivePageId);

      return {
        ...current,
        pages: nextPages,
        recentPageIds: current.recentPageIds.filter((id) => id !== pageId),
      };
    });
  }

  return {
    data,
    activeProfile,
    activeProfileData,
    activeProfileId,
    activePage,
    activePageId,
    selectProfile,
    createProfile,
    renameProfile,
    deleteProfile,
    selectPage,
    createProject,
    renameProject,
    deleteProject,
    duplicateProject,
    createFolder,
    renameFolder,
    deleteFolder,
    duplicateFolder,
    createPage,
    renamePage,
    duplicatePage,
    updatePage,
    updateCanvasViewState,
    deletePage,
  };
}
