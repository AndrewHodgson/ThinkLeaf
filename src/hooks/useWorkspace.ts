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

  function deletePage(pageId: string) {
    setData((current) => {
      const nextPages = current.pages.filter((page) => page.id !== pageId);
      const nextActivePageId =
        activePageId === pageId ? nextPages[0]?.id ?? "" : activePageId;

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
    createFolder,
    createPage,
    updatePage,
    deletePage,
  };
}
