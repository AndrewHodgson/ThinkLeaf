"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Workspace } from "@/components/workspace/Workspace";
import {
  createDefaultCanvasViewState,
  defaultCanvasCreationToolDefaults,
  defaultCanvasViewState,
  defaultPenSettings,
  maxZoom,
  minZoom,
  zoomStep,
} from "@/lib/canvasStyle";
import { useAuth } from "@/hooks/useAuth";
import { useFirstSignIn } from "@/hooks/useFirstSignIn";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { useWorkspace } from "@/hooks/useWorkspace";
import { MigrationPrompt } from "@/components/MigrationPrompt";
import { softDeleteAllCloudRecords } from "@/lib/cloudSync";
import { exportWorkspaceBackup } from "@/lib/exportUtils";
import { safeSetLocalStorage, storageWriteErrorEvent } from "@/lib/storage";
import { createId, searchPages, sortPagesByUpdatedAt, timestamp } from "@/lib/workspaceUtils";
import type {
  CanvasCreationDefaultStyle,
  CanvasCreationToolDefaults,
  CanvasHistoryOptions,
  CanvasObject,
  CanvasPenSettings,
  CanvasShapeType,
  CanvasTool,
  Page,
  PageTemplate,
} from "@/types/workspace";

const toolShortcuts: Record<string, CanvasTool> = {
  "1": "Select",
  "2": "Pan",
  "3": "Shape",
  "4": "Text Box",
  "5": "Line",
  "6": "Arrow",
  "9": "Pen",
  "0": "Eraser",
};

const SNAP_TO_GRID_STORAGE_KEY = "thinkleaf.snapToGrid.v1";
const PEN_SETTINGS_STORAGE_KEY = "thinkleaf.penSettings.v1";
const CREATION_TOOL_DEFAULTS_STORAGE_KEY = "thinkleaf.canvasCreationToolDefaults.v1";
const ACTIVE_SHAPE_TYPE_STORAGE_KEY = "thinkleaf.activeShapeType.v1";
const FLOWCHART_CONNECTOR_ARROW_STORAGE_KEY = "thinkleaf.flowchartConnectorArrow.v1";
const PAGE_TEMPLATES_STORAGE_KEY = "thinkleaf.pageTemplates.v1";
const THEME_STORAGE_KEY = "thinkleaf.theme.v1";
const CANVAS_HISTORY_LIMIT = 25;

type CanvasPageHistory = {
  redoStack: CanvasObject[][];
  undoStack: CanvasObject[][];
};

export function ThinkleafApp() {
  const workspace = useWorkspace();
  const auth = useAuth();
  const firstSignIn = useFirstSignIn(auth.user);
  // When cloud hydration completes, update React state then dismiss.
  // "merge" (auto-hydrate, local was empty): merge cloud records into state.
  // "replace" (user chose "Use cloud"): replace state wholesale so local-only
  //   records don't survive — IDB was already cleared before download.
  useEffect(() => {
    if (firstSignIn.status.stage !== "hydrated") return;
    const { mode, records, assets } = firstSignIn.status;
    if (mode === "replace") {
      workspace.replaceWithCloudData(records, assets);
    } else {
      workspace.applyRemoteRecords(records);
      workspace.applyRemoteAssets(assets);
    }
    firstSignIn.dismiss();
  // workspace callbacks are stable within a render cycle; status drives the trigger.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstSignIn.status]);
  const syncEngine = useSyncEngine(firstSignIn.isLinked ? auth.user : null, {
    onRecordsSynced: workspace.markSynced,
    onRemoteRecords: workspace.applyRemoteRecords,
    onRemoteAssets: workspace.applyRemoteAssets,
  });
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isSnapToGridEnabled, setIsSnapToGridEnabled] = useState(true);
  const [isFlowchartConnectorArrowEnabled, setIsFlowchartConnectorArrowEnabled] = useState(true);
  const [activeTool, setActiveTool] = useState<CanvasTool>("Select");
  const [activeShapeType, setActiveShapeType] = useState<CanvasShapeType>("rectangle");
  const [penSettings, setPenSettings] = useState<CanvasPenSettings>(defaultPenSettings);
  const [creationToolDefaults, setCreationToolDefaults] = useState<CanvasCreationToolDefaults>(
    defaultCanvasCreationToolDefaults,
  );
  const [imageImportRequestId, setImageImportRequestId] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasLoadedUiPreferences, setHasLoadedUiPreferences] = useState(false);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [zoomIndicatorTick, setZoomIndicatorTick] = useState(0);
  const [canvasHistoryByPage, setCanvasHistoryByPage] = useState<Record<string, CanvasPageHistory>>({});
  const [pageTemplates, setPageTemplates] = useState<PageTemplate[]>([]);
  const [hasStorageWriteError, setHasStorageWriteError] = useState(false);
  const recordedCanvasHistoryKeysRef = useRef<Set<string>>(new Set());
  const imageAssetsByPageRef = useRef<Record<string, Record<string, string>>>({});

  useEffect(() => {
    try {
      setIsSidebarCollapsed(window.localStorage.getItem("thinkleaf.ui.v1") === "sidebar-collapsed");
      setIsSnapToGridEnabled(window.localStorage.getItem(SNAP_TO_GRID_STORAGE_KEY) !== "off");
      setPenSettings(normalizeStoredPenSettings(window.localStorage.getItem(PEN_SETTINGS_STORAGE_KEY)));
      setCreationToolDefaults(
        normalizeStoredCreationToolDefaults(window.localStorage.getItem(CREATION_TOOL_DEFAULTS_STORAGE_KEY)),
      );
      setActiveShapeType(normalizeStoredShapeType(window.localStorage.getItem(ACTIVE_SHAPE_TYPE_STORAGE_KEY)));
      setIsFlowchartConnectorArrowEnabled(
        window.localStorage.getItem(FLOWCHART_CONNECTOR_ARROW_STORAGE_KEY) !== "off",
      );
      setPageTemplates(normalizeStoredPageTemplates(window.localStorage.getItem(PAGE_TEMPLATES_STORAGE_KEY)));
      setIsDarkMode(getStoredThemePreference());
    } catch {
      // Ignore storage errors in private/incognito modes.
    } finally {
      setHasLoadedUiPreferences(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedUiPreferences) {
      return;
    }

    document.documentElement.classList.toggle("dark", isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
  }, [hasLoadedUiPreferences, isDarkMode]);

  useEffect(() => {
    function handleStorageWriteError() {
      setHasStorageWriteError(true);
    }

    window.addEventListener(storageWriteErrorEvent, handleStorageWriteError);

    return () => {
      window.removeEventListener(storageWriteErrorEvent, handleStorageWriteError);
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedUiPreferences) {
      return;
    }

    safeSetLocalStorage("thinkleaf.ui.v1", isSidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded");
  }, [hasLoadedUiPreferences, isSidebarCollapsed]);

  useEffect(() => {
    if (!hasLoadedUiPreferences) {
      return;
    }

    safeSetLocalStorage(SNAP_TO_GRID_STORAGE_KEY, isSnapToGridEnabled ? "on" : "off");
  }, [hasLoadedUiPreferences, isSnapToGridEnabled]);

  useEffect(() => {
    if (!hasLoadedUiPreferences) {
      return;
    }

    safeSetLocalStorage(PEN_SETTINGS_STORAGE_KEY, JSON.stringify(penSettings));
  }, [hasLoadedUiPreferences, penSettings]);

  useEffect(() => {
    if (!hasLoadedUiPreferences) {
      return;
    }

    safeSetLocalStorage(CREATION_TOOL_DEFAULTS_STORAGE_KEY, JSON.stringify(creationToolDefaults));
  }, [creationToolDefaults, hasLoadedUiPreferences]);

  useEffect(() => {
    if (!hasLoadedUiPreferences) {
      return;
    }

    safeSetLocalStorage(ACTIVE_SHAPE_TYPE_STORAGE_KEY, activeShapeType);
  }, [activeShapeType, hasLoadedUiPreferences]);

  useEffect(() => {
    if (!hasLoadedUiPreferences) {
      return;
    }

    safeSetLocalStorage(
      FLOWCHART_CONNECTOR_ARROW_STORAGE_KEY,
      isFlowchartConnectorArrowEnabled ? "on" : "off",
    );
  }, [hasLoadedUiPreferences, isFlowchartConnectorArrowEnabled]);

  useEffect(() => {
    if (!hasLoadedUiPreferences) {
      return;
    }

    safeSetLocalStorage(PAGE_TEMPLATES_STORAGE_KEY, JSON.stringify(pageTemplates));
  }, [hasLoadedUiPreferences, pageTemplates]);

  useEffect(() => {
    if (!hasLoadedUiPreferences) {
      return;
    }

    safeSetLocalStorage(THEME_STORAGE_KEY, isDarkMode ? "dark" : "light");
  }, [hasLoadedUiPreferences, isDarkMode]);

  const canvasViewState = workspace.activePage?.canvasViewState ?? defaultCanvasViewState;
  const activeCanvasHistory = workspace.activePage ? canvasHistoryByPage[workspace.activePage.id] : undefined;
  const canUndoCanvas = Boolean(activeCanvasHistory?.undoStack.length);
  const canRedoCanvas = Boolean(activeCanvasHistory?.redoStack.length);
  const selectedObjectId = selectedObjectIds[0] ?? null;
  const handleSelectionChange = useCallback((objectId: string | null) => {
    setSelectedObjectIds(objectId ? [objectId] : []);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isUndoRedoShortcut = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const isCanvasTextEditor = isCanvasTextEditorTarget(event.target);

      if (isUndoRedoShortcut && (key === "z" || key === "y")) {
        if (isEditableTarget(event.target) && !isCanvasTextEditor) {
          return;
        }

        event.preventDefault();

        if (key === "y" || event.shiftKey) {
          redoCanvas();
        } else {
          undoCanvas();
        }

        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      const nextTool = toolShortcuts[event.key];
      if (nextTool) {
        event.preventDefault();
        setActiveTool(nextTool);
        return;
      }

      if (event.key === "8") {
        event.preventDefault();
        setImageImportRequestId((requestId) => requestId + 1);
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        updateZoom(canvasViewState.zoom + zoomStep);
        return;
      }

      if (event.key === "-") {
        event.preventDefault();
        updateZoom(canvasViewState.zoom - zoomStep);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canvasHistoryByPage, canvasViewState.zoom, workspace.activePage]);

  const searchResults = useMemo(
    () => searchPages(workspace.activeProfileData.pages, searchQuery),
    [searchQuery, workspace.activeProfileData.pages],
  );

  const favoritePages = useMemo(
    () => sortPagesByUpdatedAt(workspace.activeProfileData.pages.filter((page) => page.isFavorite)),
    [workspace.activeProfileData.pages],
  );
  const tagSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          workspace.activeProfileData.pages.flatMap((page) =>
            page.tags.map((tag) => tag.trim()).filter(Boolean),
          ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [workspace.activeProfileData.pages],
  );

  function updateZoom(nextZoom: number) {
    const page = workspace.activePage;
    if (!page) {
      return;
    }

    const boundedZoom = Math.min(maxZoom, Math.max(minZoom, nextZoom));
    workspace.updatePage(page.id, {
      canvasViewState: {
        ...canvasViewState,
        zoom: boundedZoom,
      },
    });
    setZoomIndicatorTick((tick) => tick + 1);
  }

  function cloneCanvasObjects(objects: CanvasObject[]) {
    return objects.map((object) => ({ ...object }));
  }

  function collectPageImageAssets(pageId: string, objects: CanvasObject[]) {
    let assets = imageAssetsByPageRef.current[pageId];
    let changed = false;
    for (const obj of objects) {
      if (obj.type === "image" && obj.imageDataUrl && !(assets?.[obj.id])) {
        if (!assets) {
          assets = {};
        }
        assets[obj.id] = obj.imageDataUrl;
        changed = true;
      }
    }
    if (changed) {
      imageAssetsByPageRef.current = { ...imageAssetsByPageRef.current, [pageId]: assets! };
    }
  }

  function cloneHistorySnapshot(objects: CanvasObject[]): CanvasObject[] {
    return objects.map((obj) =>
      obj.type === "image" ? { ...obj, imageDataUrl: undefined } : { ...obj },
    );
  }

  function restoreHistorySnapshot(pageId: string, objects: CanvasObject[]): CanvasObject[] {
    const assets = imageAssetsByPageRef.current[pageId];
    return objects.map((obj) => {
      if (obj.type === "image" && !obj.imageDataUrl) {
        const dataUrl = assets?.[obj.id];
        return dataUrl ? { ...obj, imageDataUrl: dataUrl } : { ...obj };
      }
      return { ...obj };
    });
  }

  function updateCanvasObjects(pageId: string, canvasObjects: CanvasObject[], options: CanvasHistoryOptions = {}) {
    const page = workspace.data.pages.find((item) => item.id === pageId);
    if (!page) {
      return;
    }

    collectPageImageAssets(pageId, page.canvasObjects);
    collectPageImageAssets(pageId, canvasObjects);

    if (options.recordHistory !== false) {
      const historyKey = options.historyKey;
      const hasRecordedHistoryKey = historyKey ? recordedCanvasHistoryKeysRef.current.has(historyKey) : false;

      if (!hasRecordedHistoryKey) {
        if (historyKey) {
          recordedCanvasHistoryKeysRef.current.add(historyKey);
        }

        const previousSnapshot = cloneHistorySnapshot(page.canvasObjects);
        setCanvasHistoryByPage((current) => {
          const pageHistory = current[pageId] ?? { redoStack: [], undoStack: [] };

          return {
            ...current,
            [pageId]: {
              undoStack: [...pageHistory.undoStack, previousSnapshot].slice(-CANVAS_HISTORY_LIMIT),
              redoStack: [],
            },
          };
        });
      }
    }

    workspace.updatePage(pageId, {
      canvasObjects: cloneCanvasObjects(canvasObjects),
    });
  }

  function undoCanvas() {
    const page = workspace.activePage;
    if (!page) {
      return;
    }

    const pageHistory = canvasHistoryByPage[page.id];
    const previousSnapshot = pageHistory?.undoStack.at(-1);
    if (!pageHistory || !previousSnapshot) {
      return;
    }

    collectPageImageAssets(page.id, page.canvasObjects);
    setSelectedObjectIds([]);
    setCanvasHistoryByPage((current) => {
      const currentHistory = current[page.id] ?? { redoStack: [], undoStack: [] };

      return {
        ...current,
        [page.id]: {
          undoStack: currentHistory.undoStack.slice(0, -1),
          redoStack: [cloneHistorySnapshot(page.canvasObjects), ...currentHistory.redoStack].slice(0, CANVAS_HISTORY_LIMIT),
        },
      };
    });
    workspace.updatePage(page.id, {
      canvasObjects: restoreHistorySnapshot(page.id, previousSnapshot),
    });
  }

  function redoCanvas() {
    const page = workspace.activePage;
    if (!page) {
      return;
    }

    const pageHistory = canvasHistoryByPage[page.id];
    const nextSnapshot = pageHistory?.redoStack[0];
    if (!pageHistory || !nextSnapshot) {
      return;
    }

    collectPageImageAssets(page.id, page.canvasObjects);
    setSelectedObjectIds([]);
    setCanvasHistoryByPage((current) => {
      const currentHistory = current[page.id] ?? { redoStack: [], undoStack: [] };

      return {
        ...current,
        [page.id]: {
          undoStack: [...currentHistory.undoStack, cloneHistorySnapshot(page.canvasObjects)].slice(-CANVAS_HISTORY_LIMIT),
          redoStack: currentHistory.redoStack.slice(1),
        },
      };
    });
    workspace.updatePage(page.id, {
      canvasObjects: restoreHistorySnapshot(page.id, nextSnapshot),
    });
  }

  function resetView() {
    const page = workspace.activePage;
    if (!page) {
      return;
    }

    workspace.updatePage(page.id, {
      canvasViewState: {
        ...createDefaultCanvasViewState(),
        zoom: canvasViewState.zoom,
      },
    });
    setZoomIndicatorTick((tick) => tick + 1);
  }

  function savePageAsTemplate(page: Page) {
    const name = window.prompt("Template name", page.title || "Untitled template");
    if (!name?.trim()) {
      return;
    }

    const now = timestamp();
    const template: PageTemplate = {
      id: createId("template"),
      name: name.trim(),
      title: page.title || "Untitled meeting note",
      body: page.body,
      canvasViewState: page.canvasViewState,
      canvasObjects: cloneCanvasObjects(page.canvasObjects),
      tags: [...page.tags],
      createdAt: now,
      updatedAt: now,
    };

    setPageTemplates((current) => [template, ...current].slice(0, 24));
  }

  function exportBackupFile() {
    exportWorkspaceBackup(workspace.data).catch((err) => {
      console.error("[ThinkLeaf] Export failed", err);
      window.alert("Export failed. Please try again.");
    });
  }

  async function resetBetaWorkspace() {
    if (auth.user) {
      // Soft-delete all non-deleted cloud records so other devices don't
      // resurface the old workspace after the local reset.
      console.log("[ThinkLeaf] Reset Beta Workspace — signed in, soft-deleting cloud records first");
      try {
        const result = await softDeleteAllCloudRecords(auth.user.id);
        if (result.error) {
          console.warn("[ThinkLeaf] Cloud soft-delete before reset failed:", result.error);
          // Don't block the reset — local IDB is still cleared below.
        }
      } catch (err) {
        console.warn("[ThinkLeaf] Cloud soft-delete before reset threw:", err);
      }
    } else {
      console.log("[ThinkLeaf] Reset Beta Workspace — not signed in, local-only reset");
    }
    await workspace.resetWorkspace();
    setCanvasHistoryByPage({});
    recordedCanvasHistoryKeysRef.current = new Set();
    imageAssetsByPageRef.current = {};
  }

  function downloadCorruptedWorkspace() {
    try {
      // Try the stashed copy first, fall back to the main key (autosave is gated
      // so the corrupted value is still there until the user starts fresh).
      const raw =
        (workspace.corruptedStorageKey
          ? window.localStorage.getItem(workspace.corruptedStorageKey)
          : null) ?? window.localStorage.getItem("thinkleaf.workspace.v1");

      if (!raw) {
        window.alert("No corrupted data found in browser storage.");
        return;
      }

      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thinkleaf-corrupted-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.alert("Could not read data from browser storage.");
    }
  }

  function requestImportBackupFile() {
    backupFileInputRef.current?.click();
  }

  function importBackupFile(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!window.confirm("Importing a backup will replace the current workspace on this device. Continue?")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(reader.result ?? ""));
      } catch {
        window.alert("Could not import that backup file — the file is not valid JSON.");
        return;
      }

      workspace.importWorkspaceData(parsed).then((ok) => {
        if (!ok) {
          window.alert("That file does not look like a Thinkleaf workspace backup.");
          return;
        }
        window.alert("Backup imported successfully.");
      }).catch(() => {
        window.alert("Could not import that backup file.");
      });
    };
    reader.onerror = () => {
      window.alert("Could not read that backup file.");
    };
    reader.readAsText(file);
  }

  if (workspace.corruptedStorageKey) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-6 text-center text-slate-900">
        <div className="max-w-md">
          <h1 className="text-xl font-semibold text-slate-800">Your saved workspace could not be read</h1>
          <p className="mt-2 text-sm text-slate-600">
            The data stored in your browser appears to be corrupted or invalid. Your notes have
            not been deleted — the raw data has been preserved and can be downloaded below.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Download the corrupted file before starting fresh. A developer may be able to recover
            it manually.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700"
            type="button"
            onClick={downloadCorruptedWorkspace}
          >
            Download corrupted backup
          </button>
          <button
            className="rounded border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "This will discard the corrupted workspace and start fresh with a blank workspace. Download the corrupted backup first if you want to keep it. Continue?",
                )
              ) {
                workspace.clearCorruptedData();
              }
            }}
          >
            Start fresh
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Details have been logged to the browser console (F12 → Console).
        </p>
      </main>
    );
  }

  return (
    <main className="flex h-screen min-h-0 bg-slate-50 text-slate-900">
      <input
        ref={backupFileInputRef}
        accept="application/json,.json"
        className="hidden"
        type="file"
        onChange={(event) => {
          importBackupFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {hasStorageWriteError ? (
        <div
          className="fixed left-1/2 top-3 z-50 w-[min(560px,calc(100vw-24px))] -translate-x-1/2 rounded border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">Storage full — changes may not have been saved</p>
              <p className="mt-0.5 text-sm text-amber-800">
                Export a backup now to avoid losing work, then free up browser storage and reload.
              </p>
              <button
                className="mt-2 rounded bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-300"
                type="button"
                onClick={exportBackupFile}
              >
                Export backup
              </button>
            </div>
            <button
              aria-label="Dismiss storage warning"
              className="shrink-0 text-amber-700 hover:text-amber-900"
              type="button"
              onClick={() => setHasStorageWriteError(false)}
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
      <MigrationPrompt
        status={firstSignIn.status}
        onUpload={firstSignIn.upload}
        onUseCloud={firstSignIn.useCloud}
        onSkip={firstSignIn.skip}
        onDismiss={firstSignIn.dismiss}
      />
      <Sidebar
        activePageId={workspace.activePageId}
        activeProfileId={workspace.activeProfileId}
        data={workspace.activeProfileData}
        favoritePages={favoritePages}
        isCollapsed={isSidebarCollapsed}
        profiles={workspace.data.profiles}
        searchQuery={searchQuery}
        searchResults={searchResults}
        onCreateProfile={workspace.createProfile}
        onCreateFolder={workspace.createFolder}
        onCreatePage={workspace.createPage}
        onCreateProject={workspace.createProject}
        onDeleteProfile={workspace.deleteProfile}
        onDeletePage={workspace.deletePage}
        onDeleteFolder={workspace.deleteFolder}
        onDeleteProject={workspace.deleteProject}
        onColorProject={workspace.colorProject}
        onColorFolder={workspace.colorFolder}
        onMovePage={workspace.movePage}
        onMoveFolder={workspace.moveFolder}
        onDuplicateFolder={workspace.duplicateFolder}
        onDuplicatePage={workspace.duplicatePage}
        onDuplicateProject={workspace.duplicateProject}
        onRenameFolder={workspace.renameFolder}
        onRenameProfile={workspace.renameProfile}
        onRenameProject={workspace.renameProject}
        onRenamePage={workspace.renamePage}
        onSavePageAsTemplate={savePageAsTemplate}
        onToggleFavoritePage={(pageId) =>
          workspace.updatePage(pageId, {
            isFavorite: !workspace.data.pages.find((page) => page.id === pageId)?.isFavorite,
          })
        }
        onToggleCollapsed={() => setIsSidebarCollapsed((value) => !value)}
        onSearchChange={setSearchQuery}
        onSelectProfile={workspace.selectProfile}
        onSelectPage={workspace.selectPage}
        authLoading={auth.loading}
        authUser={auth.user}
        isAuthConfigured={auth.isConfigured}
        onSignIn={auth.signIn}
        onSignOut={auth.signOut}
        onSignUp={auth.signUp}
        syncStatus={firstSignIn.isLinked ? syncEngine.status : undefined}
        lastSyncedAt={firstSignIn.isLinked ? syncEngine.lastSyncedAt : null}
        lastSyncError={firstSignIn.isLinked ? syncEngine.lastError : null}
        onSyncNow={firstSignIn.isLinked ? syncEngine.syncNow : undefined}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        <Workspace
          activeTool={activeTool}
          activeShapeType={activeShapeType}
          activePage={workspace.activePage}
          creationToolDefaults={creationToolDefaults}
          data={workspace.activeProfileData}
          canRedoCanvas={canRedoCanvas}
          canUndoCanvas={canUndoCanvas}
          imageImportRequestId={imageImportRequestId}
          isDarkMode={isDarkMode}
          isFlowchartConnectorArrowEnabled={isFlowchartConnectorArrowEnabled}
          isGridVisible={isGridVisible}
          isSnapToGridEnabled={isSnapToGridEnabled}
          onDeletePage={workspace.deletePage}
          onResetView={resetView}
          onRedoCanvas={redoCanvas}
          onCreationToolDefaultsChange={setCreationToolDefaults}
          onPenSettingsChange={setPenSettings}
          onSearchByTag={(tag) => setSearchQuery(tag)}
          onUndoCanvas={undoCanvas}
          onExportBackup={exportBackupFile}
          onImportBackup={requestImportBackupFile}
          onResetWorkspace={resetBetaWorkspace}
          onUpdateCanvasObjects={updateCanvasObjects}
          onUpdatePage={workspace.updatePage}
          onMultiSelectionChange={setSelectedObjectIds}
          onSelectionChange={handleSelectionChange}
          onShapeTypeChange={setActiveShapeType}
          onToggleDarkMode={() => setIsDarkMode((current) => !current)}
          onToggleFlowchartConnectorArrow={() => setIsFlowchartConnectorArrowEnabled((value) => !value)}
          onToggleSnapToGrid={() => setIsSnapToGridEnabled((value) => !value)}
          onToggleGrid={() => setIsGridVisible((value) => !value)}
          penSettings={penSettings}
          selectedObjectId={selectedObjectId}
          selectedObjectIds={selectedObjectIds}
          tagSuggestions={tagSuggestions}
          onToolChange={setActiveTool}
          onZoomIn={() => updateZoom(canvasViewState.zoom + zoomStep)}
          onZoomOut={() => updateZoom(canvasViewState.zoom - zoomStep)}
          zoomIndicatorTick={zoomIndicatorTick}
          zoomPercent={Math.round(canvasViewState.zoom * 100)}
        />
      </section>
    </main>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    Boolean(target.closest("[contenteditable='true']")) ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

function isCanvasTextEditorTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("[data-canvas-text-editor='true']"));
}

function normalizeStoredPenSettings(value: string | null): CanvasPenSettings {
  if (!value) {
    return defaultPenSettings;
  }

  try {
    const parsed = JSON.parse(value) as Partial<CanvasPenSettings>;
    const strokeWidth =
      typeof parsed.strokeWidth === "number" && Number.isFinite(parsed.strokeWidth)
        ? Math.min(24, Math.max(1, parsed.strokeWidth))
        : defaultPenSettings.strokeWidth;

    return {
      inkDensity:
        parsed.inkDensity === "low" ||
        parsed.inkDensity === "medium" ||
        parsed.inkDensity === "high" ||
        parsed.inkDensity === "veryHigh"
          ? parsed.inkDensity
          : defaultPenSettings.inkDensity,
      laserColor: normalizeHexColorSetting(parsed.laserColor) ?? defaultPenSettings.laserColor,
      laserFadeDuration:
        parsed.laserFadeDuration === "fast" ||
        parsed.laserFadeDuration === "normal" ||
        parsed.laserFadeDuration === "long" ||
        parsed.laserFadeDuration === "longer" ||
        parsed.laserFadeDuration === "longest"
          ? parsed.laserFadeDuration
          : defaultPenSettings.laserFadeDuration,
      mode:
        parsed.mode === "ink" || parsed.mode === "uniform" || parsed.mode === "highlighter" || parsed.mode === "laser"
          ? parsed.mode
          : defaultPenSettings.mode,
      strokeColor: typeof parsed.strokeColor === "string" ? parsed.strokeColor : defaultPenSettings.strokeColor,
      strokeWidth,
    };
  } catch {
    return defaultPenSettings;
  }
}

function normalizeStoredCreationToolDefaults(value: string | null): CanvasCreationToolDefaults {
  if (!value) {
    return defaultCanvasCreationToolDefaults;
  }

  try {
    const parsed = JSON.parse(value) as Partial<Record<keyof CanvasCreationToolDefaults, CanvasCreationDefaultStyle>>;

    return {
      arrow: normalizeCreationDefaultStyle(parsed.arrow, defaultCanvasCreationToolDefaults.arrow),
      circle: normalizeCreationDefaultStyle(parsed.circle, defaultCanvasCreationToolDefaults.circle),
      diamond: normalizeCreationDefaultStyle(parsed.diamond, defaultCanvasCreationToolDefaults.diamond),
      line: normalizeCreationDefaultStyle(parsed.line, defaultCanvasCreationToolDefaults.line),
      rectangle: normalizeCreationDefaultStyle(parsed.rectangle, defaultCanvasCreationToolDefaults.rectangle),
      textBox: normalizeCreationDefaultStyle(parsed.textBox, defaultCanvasCreationToolDefaults.textBox),
    };
  } catch {
    return defaultCanvasCreationToolDefaults;
  }
}

function normalizeStoredShapeType(value: string | null): CanvasShapeType {
  return value === "circle" || value === "diamond" || value === "rectangle" ? value : "rectangle";
}

function getStoredThemePreference() {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark") {
    return true;
  }

  if (stored === "light") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function normalizeStoredPageTemplates(value: string | null): PageTemplate[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Partial<PageTemplate>[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((template): template is PageTemplate => Boolean(template.id && template.name))
      .map((template) => ({
        id: template.id,
        name: template.name.trim() || "Untitled template",
        title: template.title || "Untitled meeting note",
        body: template.body || "",
        canvasViewState: template.canvasViewState ?? createDefaultCanvasViewState(),
        canvasObjects: Array.isArray(template.canvasObjects) ? cloneStoredCanvasObjects(template.canvasObjects) : [],
        tags: Array.isArray(template.tags) ? template.tags.filter((tag) => typeof tag === "string") : [],
        createdAt: template.createdAt || timestamp(),
        updatedAt: template.updatedAt || template.createdAt || timestamp(),
      }));
  } catch {
    return [];
  }
}

function cloneStoredCanvasObjects(objects: CanvasObject[]) {
  return objects.map((object) => ({ ...object }));
}

function normalizeCreationDefaultStyle(
  value: CanvasCreationDefaultStyle | undefined,
  fallback: CanvasCreationDefaultStyle,
): CanvasCreationDefaultStyle {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  return {
    ...fallback,
    ...(isSupportedColorValue(value.fillColor) ? { fillColor: value.fillColor } : {}),
    ...(isSupportedColorValue(value.strokeColor) ? { strokeColor: value.strokeColor } : {}),
    ...(isSupportedColorValue(value.textColor) ? { textColor: value.textColor } : {}),
    ...(isSupportedColorValue(value.textHighlightColor) ? { textHighlightColor: value.textHighlightColor } : {}),
    ...(typeof value.fontSize === "number" && Number.isFinite(value.fontSize)
      ? { fontSize: Math.min(48, Math.max(10, value.fontSize)) }
      : {}),
    ...(value.strokeStyle === "solid" || value.strokeStyle === "dashed" || value.strokeStyle === "dotted"
      ? { strokeStyle: value.strokeStyle }
      : {}),
    ...(typeof value.strokeWidth === "number" && Number.isFinite(value.strokeWidth)
      ? { strokeWidth: Math.min(12, Math.max(0, value.strokeWidth)) }
      : {}),
    ...(value.textAlign === "left" || value.textAlign === "center" || value.textAlign === "right"
      ? { textAlign: value.textAlign }
      : {}),
    ...(value.textVerticalAlign === "top" ||
    value.textVerticalAlign === "middle" ||
    value.textVerticalAlign === "bottom"
      ? { textVerticalAlign: value.textVerticalAlign }
      : {}),
    ...(typeof value.textBold === "boolean" ? { textBold: value.textBold } : {}),
    ...(typeof value.textItalic === "boolean" ? { textItalic: value.textItalic } : {}),
  };
}

function isSupportedColorValue(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  return (
    trimmed === "transparent" ||
    /^#[0-9a-fA-F]{6}$/.test(trimmed) ||
    /^#[0-9a-fA-F]{3}$/.test(trimmed) ||
    /^rgba?\(.+\)$/.test(trimmed)
  );
}

function normalizeHexColorSetting(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{3}$/.test(trimmed) ? trimmed : null;
}
