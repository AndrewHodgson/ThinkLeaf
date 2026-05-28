"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBetaResetWorkspace, sampleWorkspace } from "@/lib/sampleWorkspace";
import { createDefaultCanvasViewState, defaultCanvasStyle, defaultPenSettings } from "@/lib/canvasStyle";
import { safeSetLocalStorage } from "@/lib/storage";
import { loadAllFromDB, saveAllToDB } from "@/lib/storageAdapter";
import { createId, defaultProfileId, defaultProfileName, timestamp, toDateInputValue } from "@/lib/workspaceUtils";
import type {
  CanvasConnectorAnchor,
  CanvasConnectorArrowDirection,
  CanvasConnectorStyle,
  CanvasObject,
  Folder,
  Page,
  PageTemplate,
  Profile,
  Project,
  SidebarItemColor,
  WorkspaceData,
} from "@/types/workspace";

const STORAGE_KEY = "thinkleaf.workspace.v1";
const CORRUPTED_KEY_PREFIX = "thinkleaf.workspace.corrupted.";
const MIGRATION_DONE_KEY = "thinkleaf.idb.v1.migrated";

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
    sourceObjectId: typeof object.sourceObjectId === "string" ? object.sourceObjectId : undefined,
    targetObjectId: typeof object.targetObjectId === "string" ? object.targetObjectId : undefined,
    sourceAnchor: normalizeConnectorAnchor(object.sourceAnchor),
    targetAnchor: normalizeConnectorAnchor(object.targetAnchor),
    connectorStyle: normalizeConnectorStyle(object.connectorStyle),
    arrowDirection: normalizeArrowDirection(object.arrowDirection),
    connectorLabel: typeof object.connectorLabel === "string" ? object.connectorLabel : undefined,
    groupColor: normalizeSidebarItemColor(object.groupColor),
    groupId: typeof object.groupId === "string" ? object.groupId : undefined,
    groupLabel: typeof object.groupLabel === "string" ? object.groupLabel : undefined,
    shapeLabel: typeof object.shapeLabel === "string" ? object.shapeLabel : undefined,
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
              : undefined,
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

function normalizeConnectorAnchor(anchor: CanvasObject["sourceAnchor"]): CanvasConnectorAnchor | undefined {
  return anchor === "top" || anchor === "right" || anchor === "bottom" || anchor === "left" ? anchor : undefined;
}

function normalizeConnectorStyle(style: CanvasObject["connectorStyle"]): CanvasConnectorStyle | undefined {
  return style === "straight" || style === "elbow" || style === "curve" ? style : undefined;
}

function normalizeArrowDirection(
  arrowDirection: CanvasObject["arrowDirection"],
): CanvasConnectorArrowDirection | undefined {
  return arrowDirection === "none" ||
    arrowDirection === "forward" ||
    arrowDirection === "backward" ||
    arrowDirection === "both"
    ? arrowDirection
    : undefined;
}

function normalizeSidebarItemColor(color: CanvasObject["groupColor"]): SidebarItemColor | undefined {
  return color === "green" ||
    color === "blue" ||
    color === "purple" ||
    color === "orange" ||
    color === "red" ||
    color === "gray"
    ? color
    : undefined;
}

function normalizeLegacyCanvasGroups(objects: CanvasObject[]) {
  const nextObjects = objects.filter((object) => object.type !== "group");
  const nextObjectsById = new Map(nextObjects.map((object) => [object.id, object]));

  for (const legacyGroup of objects) {
    if (legacyGroup.type !== "group" || !Array.isArray(legacyGroup.groupedObjectIds)) {
      continue;
    }

    const groupId = legacyGroup.id;
    const groupColor = normalizeSidebarItemColor(legacyGroup.groupColor) ?? "green";
    const groupLabel = legacyGroup.groupLabel?.trim() || "Group";

    for (const objectId of legacyGroup.groupedObjectIds) {
      const object = nextObjectsById.get(objectId);
      if (!object) {
        continue;
      }

      nextObjectsById.set(objectId, {
        ...object,
        groupColor,
        groupId,
        groupLabel,
      });
    }
  }

  return nextObjects.map((object) => nextObjectsById.get(object.id) ?? object);
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
    pages: (Array.isArray(data.pages) ? data.pages : []).map((page) => {
      const canvasObjects = Array.isArray(page.canvasObjects)
        ? normalizeLegacyCanvasGroups(page.canvasObjects.map((object) => normalizeCanvasObject(object)))
        : [];

      return {
        ...page,
        profileId:
          page.profileId && profileIds.has(page.profileId)
            ? page.profileId
            : projectProfileIds.get(page.projectId) ?? (page.folderId ? folderProfileIds.get(page.folderId) : undefined) ?? activeProfileId,
        noteDate: page.noteDate ?? toDateInputValue(page.createdAt),
        canvasViewState: page.canvasViewState ?? createDefaultCanvasViewState(),
        canvasObjects,
      };
    }),
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

function cloneCanvasObjectsWithNewIds(objects: CanvasObject[]) {
  const objectIdMap = new Map<string, string>();
  const groupIdMap = new Map<string, string>();

  for (const object of objects) {
    objectIdMap.set(object.id, createId("object"));
    if (object.groupId && !groupIdMap.has(object.groupId)) {
      groupIdMap.set(object.groupId, createId("group"));
    }
  }

  return objects.map((object) => {
    const nextId = objectIdMap.get(object.id) ?? createId("object");
    return {
      ...object,
      id: nextId,
      groupId: object.groupId ? groupIdMap.get(object.groupId) : undefined,
      sourceObjectId: object.sourceObjectId ? objectIdMap.get(object.sourceObjectId) : undefined,
      targetObjectId: object.targetObjectId ? objectIdMap.get(object.targetObjectId) : undefined,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };
  });
}

type LoadResult = {
  data: WorkspaceData;
  corruptedKey: string | null;
};

function preserveCorruptedWorkspace(raw: string): string {
  const key = `${CORRUPTED_KEY_PREFIX}${Date.now()}`;
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    // Storage may be full; the original corrupted value remains under STORAGE_KEY
    // until the user explicitly starts fresh, so recovery is still possible.
  }
  return key;
}

function loadFromLocalStorage(): LoadResult {
  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return { data: sampleWorkspace, corruptedKey: null };
  }

  try {
    const parsed = JSON.parse(stored) as Partial<WorkspaceData>;

    if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.folders) || !Array.isArray(parsed.pages)) {
      const corruptedKey = preserveCorruptedWorkspace(stored);
      console.warn("[ThinkLeaf] Workspace data failed validation; preserved under", corruptedKey);
      return { data: sampleWorkspace, corruptedKey };
    }

    return { data: normalizeWorkspace(parsed), corruptedKey: null };
  } catch (error) {
    const corruptedKey = preserveCorruptedWorkspace(stored);
    console.warn("[ThinkLeaf] Workspace JSON could not be parsed; preserved under", corruptedKey, error);
    return { data: sampleWorkspace, corruptedKey };
  }
}

async function loadWorkspace(): Promise<LoadResult> {
  if (typeof window === "undefined") {
    return { data: sampleWorkspace, corruptedKey: null };
  }

  // Already migrated: load from IndexedDB.
  if (window.localStorage.getItem(MIGRATION_DONE_KEY) === "true") {
    try {
      const idbData = await loadAllFromDB();
      if (idbData) {
        return { data: normalizeWorkspace(idbData), corruptedKey: null };
      }
      // IndexedDB exists but is empty (e.g. cleared externally) — fall through to localStorage.
    } catch (err) {
      console.warn("[ThinkLeaf] IndexedDB read failed, falling back to localStorage", err);
    }
  }

  // First load or IDB unavailable: read from localStorage and migrate.
  const result = loadFromLocalStorage();

  if (result.corruptedKey === null) {
    try {
      await saveAllToDB(result.data);
      window.localStorage.setItem(MIGRATION_DONE_KEY, "true");
    } catch (err) {
      // Migration write failed; will retry on next load.
      console.warn("[ThinkLeaf] IndexedDB migration write failed, will retry on next load", err);
    }
  } else {
    // Corrupted localStorage data — still mark as migrated so we don't loop.
    window.localStorage.setItem(MIGRATION_DONE_KEY, "true");
  }

  return result;
}

export function useWorkspace() {
  const [data, setData] = useState<WorkspaceData>(sampleWorkspace);
  const [activePageId, setActivePageId] = useState(sampleWorkspace.pages[0]?.id ?? "");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [corruptedStorageKey, setCorruptedStorageKey] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadWorkspace().then(({ data: loaded, corruptedKey }) => {
      setData(loaded);
      setActivePageId(pickFallbackPageIdForProfile(loaded, loaded.activeProfileId));
      setCorruptedStorageKey(corruptedKey);
      setHasHydrated(true);
    });
  }, []);

  // Gate autosave while corruption is unresolved so sample data never silently
  // overwrites the user's workspace before they can recover their data.
  // Debounced 500 ms to coalesce rapid changes (e.g. typing) into a single write.
  useEffect(() => {
    if (!hasHydrated || corruptedStorageKey !== null) {
      return;
    }

    const snapshot = data;

    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      saveAllToDB(snapshot).catch((err) => {
        console.warn("[ThinkLeaf] IndexedDB write failed, falling back to localStorage", err);
        safeSetLocalStorage(STORAGE_KEY, JSON.stringify(snapshot));
      });
    }, 500);
  }, [data, hasHydrated, corruptedStorageKey]);

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
          const nextFolderId = page.folderId ? folderIdMap.get(page.folderId) : undefined;
          return {
            ...page,
            id: nextPageId,
            projectId: projectCopyId,
            profileId: sourceProject.profileId,
            folderId: nextFolderId,
            title: `${page.title || "Untitled meeting note"} Copy`,
            body: page.body,
            noteDate: page.noteDate,
            canvasViewState: page.canvasViewState,
            canvasObjects: cloneCanvasObjectsWithNewIds(page.canvasObjects),
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
        .filter((page) => page.folderId !== undefined && folderIdsToCopy.has(page.folderId))
        .map((page) => {
          const nextPageId = createId("page");
          return {
            ...page,
            id: nextPageId,
            profileId: sourceFolder.profileId,
            projectId: sourceFolder.projectId,
            folderId: folderIdMap.get(page.folderId!) ?? nextRootFolderId,
            title: `${page.title || "Untitled meeting note"} Copy`,
            body: page.body,
            noteDate: page.noteDate,
            canvasViewState: page.canvasViewState,
            canvasObjects: cloneCanvasObjectsWithNewIds(page.canvasObjects),
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
        current.pages.filter((page) => page.folderId !== undefined && deletedFolderIds.has(page.folderId)).map((page) => page.id),
      );
      const nextPages = current.pages.filter((page) => page.folderId === undefined || !deletedFolderIds.has(page.folderId));
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

  function movePage(pageId: string, targetProjectId: string, targetFolderId: string | undefined) {
    setData((current) => {
      const page = current.pages.find((p) => p.id === pageId);
      if (!page) return current;

      const targetProject = current.projects.find((p) => p.id === targetProjectId);
      if (!targetProject) return current;
      if (page.folderId === targetFolderId && page.projectId === targetProjectId) return current;

      let targetProfileId = targetProject.profileId;
      if (targetFolderId !== undefined) {
        const targetFolder = current.folders.find(
          (f) => f.id === targetFolderId && f.projectId === targetProjectId && f.profileId === page.profileId,
        );
        if (!targetFolder) return current;
        targetProfileId = targetFolder.profileId;
      }

      const now = timestamp();
      return {
        ...current,
        pages: current.pages.map((p) =>
          p.id === pageId
            ? {
                ...p,
                projectId: targetProjectId,
                folderId: targetFolderId,
                profileId: targetProfileId,
                updatedAt: now,
              }
            : p,
        ),
      };
    });
  }

  function moveFolder(folderId: string, targetParentFolderId: string | null, targetProjectId?: string) {
    setData((current) => {
      const folder = current.folders.find((f) => f.id === folderId);
      if (!folder) return current;

      const resolvedProjectId = targetProjectId ?? folder.projectId;
      const isCrossProject = resolvedProjectId !== folder.projectId;

      const targetProject = current.projects.find((p) => p.id === resolvedProjectId);
      if (!targetProject) return current;

      // Profile boundary: only allow moves within the same profile
      if (targetProject.profileId !== folder.profileId) return current;

      const currentParentId = folder.parentFolderId ?? null;

      // No-op: same project, same parent
      if (!isCrossProject && currentParentId === targetParentFolderId) return current;

      if (isCrossProject) {
        // Cross-project: validate the target parent folder belongs to the target project
        if (targetParentFolderId !== null) {
          const targetParent = current.folders.find(
            (f) => f.id === targetParentFolderId && f.projectId === resolvedProjectId,
          );
          if (!targetParent) return current;
        }
      } else {
        // Same-project: use existing cycle-safe validator
        if (targetParentFolderId !== null) {
          const foldersById = new Map(current.folders.map((f) => [f.id, f]));
          if (!isValidParentFolder(foldersById, folder, targetParentFolderId)) return current;
        }
      }

      const now = timestamp();

      if (!isCrossProject) {
        // Same project: simple parentFolderId update, no cascade needed
        return {
          ...current,
          folders: current.folders.map((f) =>
            f.id === folderId
              ? { ...f, parentFolderId: targetParentFolderId ?? undefined, updatedAt: now }
              : f,
          ),
        };
      }

      // Cross-project: collect all descendant folder IDs (BFS) and cascade projectId
      const movedFolderIds = new Set<string>([folderId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const f of current.folders) {
          if (!movedFolderIds.has(f.id) && f.parentFolderId && movedFolderIds.has(f.parentFolderId)) {
            movedFolderIds.add(f.id);
            changed = true;
          }
        }
      }

      const nextFolders = current.folders.map((f) => {
        if (f.id === folderId) {
          return { ...f, projectId: resolvedProjectId, parentFolderId: targetParentFolderId ?? undefined, updatedAt: now };
        }
        if (movedFolderIds.has(f.id)) {
          return { ...f, projectId: resolvedProjectId, updatedAt: now };
        }
        return f;
      });

      // Cascade projectId to all pages contained in the moved folders
      const nextPages = current.pages.map((p) =>
        p.folderId !== undefined && movedFolderIds.has(p.folderId)
          ? { ...p, projectId: resolvedProjectId, updatedAt: now }
          : p,
      );

      return { ...current, folders: nextFolders, pages: nextPages };
    });
  }

  function createPage(projectId: string, folderId: string | undefined, title = "Untitled meeting note", template?: PageTemplate) {
    if (!projectId) {
      return;
    }

    const pageId = createId("page");
    const cleanTitle = title.trim() || template?.title || "Untitled meeting note";

    setData((current) => {
      const project = current.projects.find((item) => item.id === projectId);
      if (!project) {
        return current;
      }
      const folder = folderId
        ? current.folders.find(
            (item) => item.id === folderId && item.projectId === projectId && item.profileId === project.profileId,
          )
        : undefined;
      if (folderId !== undefined && !folder) {
        return current;
      }

      const now = timestamp();
      const page: Page = {
        id: pageId,
        profileId: folder?.profileId ?? project.profileId,
        projectId,
        folderId,
        title: cleanTitle,
        body: template?.body ?? "",
        noteDate: toDateInputValue(now),
        canvasViewState: template?.canvasViewState ?? createDefaultCanvasViewState(),
        canvasObjects: template ? cloneCanvasObjectsWithNewIds(template.canvasObjects) : [],
        tags: template ? [...template.tags] : [],
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...current,
        pages: [...current.pages, page],
        folders: folderId
          ? current.folders.map((item) => item.id === folderId ? { ...item, updatedAt: now } : item)
          : current.folders,
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
      canvasObjects: cloneCanvasObjectsWithNewIds(sourcePage.canvasObjects),
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

  function colorProject(projectId: string, color: SidebarItemColor | undefined) {
    const now = timestamp();
    setData((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, color, updatedAt: now } : project,
      ),
    }));
  }

  function colorFolder(folderId: string, color: SidebarItemColor | undefined) {
    const now = timestamp();
    setData((current) => ({
      ...current,
      folders: current.folders.map((folder) =>
        folder.id === folderId ? { ...folder, color, updatedAt: now } : folder,
      ),
    }));
  }

  function importWorkspaceData(value: unknown) {
    const parsed = value as Partial<WorkspaceData>;

    if (!parsed || !Array.isArray(parsed.projects) || !Array.isArray(parsed.folders) || !Array.isArray(parsed.pages)) {
      return false;
    }

    const nextData = normalizeWorkspace(parsed);
    setData(nextData);
    setActivePageId(pickFallbackPageIdForProfile(nextData, nextData.activeProfileId));
    return true;
  }

  function clearCorruptedData() {
    try {
      if (corruptedStorageKey) {
        window.localStorage.removeItem(corruptedStorageKey);
      }
    } catch {
      // ignore — stashed copy may not exist if storage was full
    }
    setData(sampleWorkspace);
    setActivePageId(pickFallbackPageIdForProfile(sampleWorkspace, sampleWorkspace.activeProfileId));
    setCorruptedStorageKey(null);
  }

  function resetWorkspace() {
    const next = createBetaResetWorkspace();
    setData(next);
    setActivePageId(next.pages[0]?.id ?? "");
  }

  return {
    data,
    activeProfile,
    activeProfileData,
    activeProfileId,
    activePage,
    activePageId,
    corruptedStorageKey,
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
    colorProject,
    colorFolder,
    movePage,
    moveFolder,
    createPage,
    renamePage,
    duplicatePage,
    updatePage,
    deletePage,
    importWorkspaceData,
    clearCorruptedData,
    resetWorkspace,
  };
}
