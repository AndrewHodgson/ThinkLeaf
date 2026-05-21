"use client";

import { useEffect, useMemo, useState } from "react";
import { sampleWorkspace } from "@/lib/sampleWorkspace";
import { defaultCanvasStyle } from "@/lib/canvasStyle";
import { createId, timestamp, toDateInputValue } from "@/lib/workspaceUtils";
import type { CanvasObject, Folder, Page, Project, WorkspaceData } from "@/types/workspace";

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
    textColor: object.textColor ?? defaultCanvasStyle.textColor,
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

function normalizeWorkspace(data: WorkspaceData): WorkspaceData {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      noteDate: page.noteDate ?? toDateInputValue(page.createdAt),
      canvasObjects: Array.isArray(page.canvasObjects)
        ? page.canvasObjects.map((object) => normalizeCanvasObject(object))
        : [],
    })),
  };
}

function pickFallbackPageId(pages: Page[], preferredPageId: string) {
  if (pages.some((page) => page.id === preferredPageId)) {
    return preferredPageId;
  }

  return pages[0]?.id ?? "";
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
    const parsed = JSON.parse(stored) as WorkspaceData;

    if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.folders) || !Array.isArray(parsed.pages)) {
      return sampleWorkspace;
    }

    return normalizeWorkspace({
      projects: parsed.projects,
      folders: parsed.folders,
      pages: parsed.pages,
      recentPageIds: Array.isArray(parsed.recentPageIds) ? parsed.recentPageIds : [],
    });
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
    setActivePageId(loaded.recentPageIds[0] ?? loaded.pages[0]?.id ?? "");
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hasHydrated]);

  const activePage = useMemo(
    () => data.pages.find((page) => page.id === activePageId) ?? data.pages[0],
    [activePageId, data.pages],
  );

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
            folderId: nextFolderId ?? copiedFolders[0]?.id ?? page.folderId,
            title: `${page.title || "Untitled meeting note"} Copy`,
            body: page.body,
            noteDate: page.noteDate,
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
        name: `${sourceProject.name} Copy`,
        createdAt: now,
        updatedAt: now,
      };

      const nextPages = [...current.pages, ...copiedPages];
      const nextActivePageId = copiedPages[0]?.id ?? pickFallbackPageId(nextPages, activePageId);

      setActivePageId(nextActivePageId);

      return {
        ...current,
        projects: [...current.projects, copiedProject],
        folders: [...current.folders, ...copiedFolders],
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
      const nextActivePageId = pickFallbackPageId(nextPages, activePageId);

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

  function createFolder(projectId: string, name: string) {
    const cleanName = name.trim();
    if (!projectId || !cleanName) {
      return;
    }

    const now = timestamp();
    const folder: Folder = {
      id: createId("folder"),
      projectId,
      name: cleanName,
      createdAt: now,
      updatedAt: now,
    };

    setData((current) => ({
      ...current,
      folders: [...current.folders, folder],
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, updatedAt: now } : project,
      ),
    }));
  }

  function duplicateFolder(folderId: string) {
    setData((current) => {
      const sourceFolder = current.folders.find((folder) => folder.id === folderId);
      if (!sourceFolder) {
        return current;
      }

      const now = timestamp();
      const nextFolderId = createId("folder");
      const copiedPages = current.pages
        .filter((page) => page.folderId === folderId)
        .map((page) => {
          const nextPageId = createId("page");
          return {
            ...page,
            id: nextPageId,
            projectId: sourceFolder.projectId,
            folderId: nextFolderId,
            title: `${page.title || "Untitled meeting note"} Copy`,
            body: page.body,
            noteDate: page.noteDate,
            canvasObjects: cloneCanvasObjects(page.canvasObjects),
            tags: [...page.tags],
            isFavorite: false,
            createdAt: now,
            updatedAt: now,
          };
        });

      const copiedFolder: Folder = {
        ...sourceFolder,
        id: nextFolderId,
        name: `${sourceFolder.name} Copy`,
        createdAt: now,
        updatedAt: now,
      };

      const nextPages = [...current.pages, ...copiedPages];
      const nextActivePageId = copiedPages[0]?.id ?? pickFallbackPageId(nextPages, activePageId);

      setActivePageId(nextActivePageId);

      return {
        ...current,
        folders: [...current.folders, copiedFolder],
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
      const deletedPageIds = new Set(current.pages.filter((page) => page.folderId === folderId).map((page) => page.id));
      const nextPages = current.pages.filter((page) => page.folderId !== folderId);
      const nextActivePageId = pickFallbackPageId(nextPages, activePageId);

      setActivePageId(nextActivePageId);

      return {
        ...current,
        folders: current.folders.filter((folder) => folder.id !== folderId),
        pages: nextPages,
        recentPageIds: current.recentPageIds.filter((pageId) => !deletedPageIds.has(pageId)),
      };
    });
  }

  function createPage(projectId: string, folderId: string, title = "Untitled meeting note") {
    if (!projectId || !folderId) {
      return;
    }

    const now = timestamp();
    const page: Page = {
      id: createId("page"),
      projectId,
      folderId,
      title,
      body: "",
      noteDate: toDateInputValue(now),
      canvasObjects: [],
      tags: [],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    };

    setData((current) => ({
      ...current,
      pages: [...current.pages, page],
      folders: current.folders.map((folder) =>
        folder.id === folderId ? { ...folder, updatedAt: now } : folder,
      ),
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, updatedAt: now } : project,
      ),
      recentPageIds: [page.id, ...current.recentPageIds.filter((id) => id !== page.id)].slice(0, 8),
    }));
    setActivePageId(page.id);
  }

  function duplicatePage(pageId: string) {
    setData((current) => {
      const sourcePage = current.pages.find((page) => page.id === pageId);
      if (!sourcePage) {
        return current;
      }

      const now = timestamp();
      const copiedPage: Page = {
        ...sourcePage,
        id: createId("page"),
        title: `${sourcePage.title || "Untitled meeting note"} Copy`,
        body: sourcePage.body,
        noteDate: sourcePage.noteDate,
        canvasObjects: cloneCanvasObjects(sourcePage.canvasObjects),
        tags: [...sourcePage.tags],
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
      };

      setActivePageId(copiedPage.id);

      return {
        ...current,
        pages: [...current.pages, copiedPage],
        recentPageIds: [copiedPage.id, ...current.recentPageIds.filter((id) => id !== copiedPage.id)].slice(0, 8),
      };
    });
  }

  function updatePage(
    pageId: string,
    updates: Partial<Pick<Page, "title" | "body" | "noteDate" | "canvasObjects" | "tags" | "isFavorite">>,
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

  function deletePage(pageId: string) {
    setData((current) => {
      const nextPages = current.pages.filter((page) => page.id !== pageId);
      const nextActivePageId = pickFallbackPageId(nextPages, activePageId);

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
    activePage,
    activePageId,
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
    deletePage,
  };
}
