"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBetaResetWorkspace, sampleWorkspace } from "@/lib/sampleWorkspace";
import { createDefaultCanvasViewState, defaultCanvasStyle, defaultPenSettings } from "@/lib/canvasStyle";
import { safeSetLocalStorage } from "@/lib/storage";
import { db, type AssetRecord } from "@/lib/db";
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
    version: 1,
    deletedAt: null,
    syncedAt: null,
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
      version: 1,
      deletedAt: null,
      syncedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    folder: {
      id: folderId,
      profileId,
      projectId,
      name: "Notes",
      version: 1,
      deletedAt: null,
      syncedAt: null,
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
      version: 1,
      deletedAt: null,
      syncedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  } satisfies { project: Project; folder: Folder; page: Page };
}

const SYNC_DEFAULTS = { version: 1 as number, deletedAt: null as string | null, syncedAt: null as string | null };

function normalizeWorkspace(data: Partial<WorkspaceData>): WorkspaceData {
  const now = timestamp();
  const profiles =
    Array.isArray(data.profiles) && data.profiles.length
      ? data.profiles.map((profile) => ({
          ...SYNC_DEFAULTS,
          ...profile,
          name: profile.name?.trim() || defaultProfileName,
          createdAt: profile.createdAt ?? now,
          updatedAt: profile.updatedAt ?? now,
        }))
      : [createDefaultProfile(now)];
  const profileIds = new Set(profiles.map((profile) => profile.id));
  // Validate activeProfileId against non-deleted profiles only.
  const activeProfileId =
    data.activeProfileId && profileIds.has(data.activeProfileId) && !profiles.find((p) => p.id === data.activeProfileId)?.deletedAt
      ? data.activeProfileId
      : (profiles.find((p) => !p.deletedAt)?.id ?? profiles[0].id);
  const rawProjects = Array.isArray(data.projects) ? data.projects : [];
  const projects = rawProjects.map((project) => ({
    ...SYNC_DEFAULTS,
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
      ...SYNC_DEFAULTS,
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
        ...SYNC_DEFAULTS,
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
  return data.pages.filter((page) => page.profileId === profileId && !page.deletedAt);
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

function applyAssetMappings(data: WorkspaceData, assetMappings: Record<string, string>): WorkspaceData {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      canvasObjects: page.canvasObjects.map((obj) => {
        const newAssetId = assetMappings[obj.id];
        return newAssetId ? { ...obj, assetId: newAssetId } : obj;
      }),
    })),
  };
}

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
  let result = loadFromLocalStorage();

  if (result.corruptedKey === null) {
    try {
      const assetMappings = await saveAllToDB(result.data);
      window.localStorage.setItem(MIGRATION_DONE_KEY, "true");
      if (Object.keys(assetMappings).length > 0) {
        result = { ...result, data: applyAssetMappings(result.data, assetMappings) };
      }
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
      saveAllToDB(snapshot)
        .then((assetMappings) => {
          if (Object.keys(assetMappings).length === 0) return;
          setData((current) => applyAssetMappings(current, assetMappings));
        })
        .catch((err) => {
          console.warn("[ThinkLeaf] IndexedDB write failed, falling back to localStorage", err);
          safeSetLocalStorage(STORAGE_KEY, JSON.stringify(snapshot));
        });
    }, 500);
  }, [data, hasHydrated, corruptedStorageKey]);

  const activeProfile = useMemo(
    () =>
      data.profiles.find((profile) => profile.id === data.activeProfileId && !profile.deletedAt) ??
      data.profiles.find((profile) => !profile.deletedAt) ??
      data.profiles[0],
    [data.activeProfileId, data.profiles],
  );
  const activeProfileId = activeProfile?.id ?? "";
  const activeProfileData = useMemo(
    () => ({
      ...data,
      activeProfileId,
      projects: data.projects.filter((project) => project.profileId === activeProfileId && !project.deletedAt),
      folders: data.folders.filter((folder) => folder.profileId === activeProfileId && !folder.deletedAt),
      pages: data.pages.filter((page) => page.profileId === activeProfileId && !page.deletedAt),
      recentPageIds: data.recentPageIds.filter((pageId) =>
        data.pages.some((page) => page.id === pageId && page.profileId === activeProfileId && !page.deletedAt),
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
      version: 1,
      deletedAt: null,
      syncedAt: null,
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
        profile.id === profileId ? { ...profile, name: cleanName, updatedAt: now, version: profile.version + 1 } : profile,
      ),
    }));
  }

  function deleteProfile(profileId: string) {
    setData((current) => {
      const nonDeleted = current.profiles.filter((p) => !p.deletedAt);
      if (nonDeleted.length <= 1 || !nonDeleted.some((p) => p.id === profileId)) {
        return current;
      }

      const now = timestamp();
      const deletedPageIds = new Set(
        current.pages.filter((page) => page.profileId === profileId && !page.deletedAt).map((page) => page.id),
      );
      const nextActiveProfileId =
        current.activeProfileId === profileId
          ? (nonDeleted.find((p) => p.id !== profileId)?.id ?? "")
          : current.activeProfileId;

      const nextData: WorkspaceData = {
        ...current,
        profiles: current.profiles.map((p) =>
          p.id === profileId ? { ...p, deletedAt: now, updatedAt: now, version: p.version + 1 } : p,
        ),
        activeProfileId: nextActiveProfileId,
        projects: current.projects.map((p) =>
          p.profileId === profileId && !p.deletedAt ? { ...p, deletedAt: now, updatedAt: now, version: p.version + 1 } : p,
        ),
        folders: current.folders.map((f) =>
          f.profileId === profileId && !f.deletedAt ? { ...f, deletedAt: now, updatedAt: now, version: f.version + 1 } : f,
        ),
        pages: current.pages.map((p) =>
          p.profileId === profileId && !p.deletedAt ? { ...p, deletedAt: now, updatedAt: now, version: p.version + 1 } : p,
        ),
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
      version: 1,
      deletedAt: null,
      syncedAt: null,
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
        .filter((folder) => folder.projectId === projectId && !folder.deletedAt)
        .map((folder) => {
          const nextFolderId = createId("folder");
          folderIdMap.set(folder.id, nextFolderId);
          return {
            ...folder,
            id: nextFolderId,
            projectId: projectCopyId,
            profileId: sourceProject.profileId,
            name: `${folder.name} Copy`,
            version: 1,
            deletedAt: null as string | null,
            syncedAt: null as string | null,
            createdAt: now,
            updatedAt: now,
          };
        });

      const copiedPages = current.pages
        .filter((page) => page.projectId === projectId && !page.deletedAt)
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
            version: 1,
            deletedAt: null as string | null,
            syncedAt: null as string | null,
            createdAt: now,
            updatedAt: now,
          };
        });

      const copiedProject: Project = {
        ...sourceProject,
        id: projectCopyId,
        profileId: sourceProject.profileId,
        name: `${sourceProject.name} Copy`,
        version: 1,
        deletedAt: null,
        syncedAt: null,
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
        project.id === projectId ? { ...project, name: cleanName, updatedAt: now, version: project.version + 1 } : project,
      ),
    }));
  }

  function deleteProject(projectId: string) {
    setData((current) => {
      const now = timestamp();
      const deletedPageIds = new Set(
        current.pages.filter((page) => page.projectId === projectId && !page.deletedAt).map((page) => page.id),
      );
      const sourceProject = current.projects.find((project) => project.id === projectId);
      const nextPages = current.pages.map((page) =>
        page.projectId === projectId && !page.deletedAt
          ? { ...page, deletedAt: now, updatedAt: now, version: page.version + 1 }
          : page,
      );
      const nextActivePageId =
        sourceProject?.profileId === current.activeProfileId
          ? pickFallbackPageId(getProfilePages({ ...current, pages: nextPages }, current.activeProfileId), activePageId)
          : activePageId;

      setActivePageId(nextActivePageId);

      return {
        ...current,
        projects: current.projects.map((project) =>
          project.id === projectId ? { ...project, deletedAt: now, updatedAt: now, version: project.version + 1 } : project,
        ),
        folders: current.folders.map((folder) =>
          folder.projectId === projectId && !folder.deletedAt
            ? { ...folder, deletedAt: now, updatedAt: now, version: folder.version + 1 }
            : folder,
        ),
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
        version: 1,
        deletedAt: null,
        syncedAt: null,
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
        .filter((folder) => folderIdsToCopy.has(folder.id) && !folder.deletedAt)
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
          version: 1,
          deletedAt: null as string | null,
          syncedAt: null as string | null,
          createdAt: now,
          updatedAt: now,
        }));
      const copiedPages = current.pages
        .filter((page) => page.folderId !== undefined && folderIdsToCopy.has(page.folderId) && !page.deletedAt)
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
            version: 1,
            deletedAt: null as string | null,
            syncedAt: null as string | null,
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
        folder.id === folderId ? { ...folder, name: cleanName, updatedAt: now, version: folder.version + 1 } : folder,
      ),
    }));
  }

  function deleteFolder(folderId: string) {
    setData((current) => {
      const now = timestamp();
      const sourceFolder = current.folders.find((folder) => folder.id === folderId);
      const deletedFolderIds = getDescendantFolderIds(current.folders, folderId);
      const deletedPageIds = new Set(
        current.pages
          .filter((page) => page.folderId !== undefined && deletedFolderIds.has(page.folderId) && !page.deletedAt)
          .map((page) => page.id),
      );
      const nextPages = current.pages.map((page) =>
        page.folderId !== undefined && deletedFolderIds.has(page.folderId) && !page.deletedAt
          ? { ...page, deletedAt: now, updatedAt: now, version: page.version + 1 }
          : page,
      );
      const nextActivePageId =
        sourceFolder?.profileId === current.activeProfileId
          ? pickFallbackPageId(getProfilePages({ ...current, pages: nextPages }, current.activeProfileId), activePageId)
          : activePageId;

      setActivePageId(nextActivePageId);

      return {
        ...current,
        folders: current.folders.map((folder) =>
          deletedFolderIds.has(folder.id) && !folder.deletedAt
            ? { ...folder, deletedAt: now, updatedAt: now, version: folder.version + 1 }
            : folder,
        ),
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
                version: p.version + 1,
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
              ? { ...f, parentFolderId: targetParentFolderId ?? undefined, updatedAt: now, version: f.version + 1 }
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
          return { ...f, projectId: resolvedProjectId, parentFolderId: targetParentFolderId ?? undefined, updatedAt: now, version: f.version + 1 };
        }
        if (movedFolderIds.has(f.id)) {
          return { ...f, projectId: resolvedProjectId, updatedAt: now, version: f.version + 1 };
        }
        return f;
      });

      // Cascade projectId to all pages contained in the moved folders
      const nextPages = current.pages.map((p) =>
        p.folderId !== undefined && movedFolderIds.has(p.folderId)
          ? { ...p, projectId: resolvedProjectId, updatedAt: now, version: p.version + 1 }
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
        version: 1,
        deletedAt: null,
        syncedAt: null,
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
      version: 1,
      deletedAt: null,
      syncedAt: null,
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
    // Empty updates — nothing to do (e.g. manuallySavePage).
    if (Object.keys(updates).length === 0) return;

    // Content fields that warrant bumping updatedAt and version when changed.
    // canvasViewState (pan/zoom) is excluded — it's a view-only preference.
    const contentFields = new Set<string>(["title", "body", "noteDate", "canvasObjects", "tags", "isFavorite"]);
    const now = timestamp();

    setData((current) => ({
      ...current,
      pages: current.pages.map((page) => {
        if (page.id !== pageId) return page;

        // Determine whether any content field actually changed value.
        const hasContentChange = Object.keys(updates).some(
          (key) => contentFields.has(key) && (updates as Record<string, unknown>)[key] !== (page as Record<string, unknown>)[key],
        );

        return {
          ...page,
          ...updates,
          ...(hasContentChange ? { updatedAt: now, version: page.version + 1 } : {}),
        };
      }),
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
        page.id === pageId ? { ...page, title: cleanTitle, updatedAt: now, version: page.version + 1 } : page,
      ),
    }));
  }

  function deletePage(pageId: string) {
    setData((current) => {
      const now = timestamp();
      const nextPages = current.pages.map((page) =>
        page.id === pageId && !page.deletedAt ? { ...page, deletedAt: now, updatedAt: now, version: page.version + 1 } : page,
      );
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
        project.id === projectId ? { ...project, color, updatedAt: now, version: project.version + 1 } : project,
      ),
    }));
  }

  function colorFolder(folderId: string, color: SidebarItemColor | undefined) {
    const now = timestamp();
    setData((current) => ({
      ...current,
      folders: current.folders.map((folder) =>
        folder.id === folderId ? { ...folder, color, updatedAt: now, version: folder.version + 1 } : folder,
      ),
    }));
  }

  async function importWorkspaceData(value: unknown): Promise<boolean> {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Record<string, unknown>;

    // v2 export: { exportVersion: 2, exportedAt, workspace, assets }
    // v1 export: the WorkspaceData object directly
    const isV2 = record.exportVersion === 2;
    const workspaceRaw = isV2 ? record.workspace : value;
    const assetsRaw = isV2 && Array.isArray(record.assets) ? record.assets : [];

    const parsed = workspaceRaw as Partial<WorkspaceData>;
    if (!parsed || !Array.isArray(parsed.projects) || !Array.isArray(parsed.folders) || !Array.isArray(parsed.pages)) {
      return false;
    }

    // For v2 exports, restore asset records to IDB so future saves preserve the
    // asset-table separation.  Canvas objects already carry imageDataUrl inline
    // (from React state at export time), so images render even if this write fails.
    if (assetsRaw.length > 0) {
      try {
        const validAssets = assetsRaw.filter(
          (a): a is AssetRecord =>
            a !== null &&
            typeof a === "object" &&
            typeof (a as AssetRecord).id === "string" &&
            typeof (a as AssetRecord).data === "string",
        );
        if (validAssets.length > 0) {
          await db.assets.bulkPut(validAssets);
        }
      } catch (err) {
        console.warn("[ThinkLeaf] Failed to write imported assets to IDB", err);
      }
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
