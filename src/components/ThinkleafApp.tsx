"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Workspace } from "@/components/workspace/Workspace";
import {
  createDefaultCanvasViewState,
  defaultCanvasViewState,
  defaultPenSettings,
  maxZoom,
  minZoom,
  zoomStep,
} from "@/lib/canvasStyle";
import { useWorkspace } from "@/hooks/useWorkspace";
import { searchPages, sortPagesByUpdatedAt } from "@/lib/workspaceUtils";
import type { CanvasHistoryOptions, CanvasObject, CanvasPenSettings, CanvasTool } from "@/types/workspace";

const toolShortcuts: Record<string, CanvasTool> = {
  "1": "Select",
  "2": "Pan",
  "3": "Rectangle",
  "4": "Circle",
  "5": "Text Box",
  "6": "Line",
  "7": "Arrow",
  "9": "Pen",
  "0": "Eraser",
};

const SNAP_TO_GRID_STORAGE_KEY = "thinkleaf.snapToGrid.v1";
const PEN_SETTINGS_STORAGE_KEY = "thinkleaf.penSettings.v1";
const CANVAS_HISTORY_LIMIT = 25;

type CanvasPageHistory = {
  redoStack: CanvasObject[][];
  undoStack: CanvasObject[][];
};

export function ThinkleafApp() {
  const workspace = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isSnapToGridEnabled, setIsSnapToGridEnabled] = useState(true);
  const [activeTool, setActiveTool] = useState<CanvasTool>("Select");
  const [penSettings, setPenSettings] = useState<CanvasPenSettings>(defaultPenSettings);
  const [imageImportRequestId, setImageImportRequestId] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasLoadedUiPreferences, setHasLoadedUiPreferences] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [zoomIndicatorTick, setZoomIndicatorTick] = useState(0);
  const [canvasHistoryByPage, setCanvasHistoryByPage] = useState<Record<string, CanvasPageHistory>>({});
  const recordedCanvasHistoryKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      setIsSidebarCollapsed(window.localStorage.getItem("thinkleaf.ui.v1") === "sidebar-collapsed");
      setIsSnapToGridEnabled(window.localStorage.getItem(SNAP_TO_GRID_STORAGE_KEY) !== "off");
      setPenSettings(normalizeStoredPenSettings(window.localStorage.getItem(PEN_SETTINGS_STORAGE_KEY)));
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

    try {
      window.localStorage.setItem(
        "thinkleaf.ui.v1",
        isSidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded",
      );
    } catch {
      // Ignore storage errors in private/incognito modes.
    }
  }, [hasLoadedUiPreferences, isSidebarCollapsed]);

  useEffect(() => {
    if (!hasLoadedUiPreferences) {
      return;
    }

    try {
      window.localStorage.setItem(SNAP_TO_GRID_STORAGE_KEY, isSnapToGridEnabled ? "on" : "off");
    } catch {
      // Ignore storage errors in private/incognito modes.
    }
  }, [hasLoadedUiPreferences, isSnapToGridEnabled]);

  useEffect(() => {
    if (!hasLoadedUiPreferences) {
      return;
    }

    try {
      window.localStorage.setItem(PEN_SETTINGS_STORAGE_KEY, JSON.stringify(penSettings));
    } catch {
      // Ignore storage errors in private/incognito modes.
    }
  }, [hasLoadedUiPreferences, penSettings]);

  const canvasViewState = workspace.activePage?.canvasViewState ?? defaultCanvasViewState;
  const activeCanvasHistory = workspace.activePage ? canvasHistoryByPage[workspace.activePage.id] : undefined;
  const canUndoCanvas = Boolean(activeCanvasHistory?.undoStack.length);
  const canRedoCanvas = Boolean(activeCanvasHistory?.redoStack.length);

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

  function updateCanvasObjects(pageId: string, canvasObjects: CanvasObject[], options: CanvasHistoryOptions = {}) {
    const page = workspace.data.pages.find((item) => item.id === pageId);
    if (!page) {
      return;
    }

    if (options.recordHistory !== false) {
      const historyKey = options.historyKey;
      const hasRecordedHistoryKey = historyKey ? recordedCanvasHistoryKeysRef.current.has(historyKey) : false;

      if (!hasRecordedHistoryKey) {
        if (historyKey) {
          recordedCanvasHistoryKeysRef.current.add(historyKey);
        }

        const previousObjects = cloneCanvasObjects(page.canvasObjects);
        setCanvasHistoryByPage((current) => {
          const pageHistory = current[pageId] ?? { redoStack: [], undoStack: [] };

          return {
            ...current,
            [pageId]: {
              undoStack: [...pageHistory.undoStack, previousObjects].slice(-CANVAS_HISTORY_LIMIT),
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
    const previousObjects = pageHistory?.undoStack.at(-1);
    if (!pageHistory || !previousObjects) {
      return;
    }

    setSelectedObjectId(null);
    setCanvasHistoryByPage((current) => {
      const currentHistory = current[page.id] ?? { redoStack: [], undoStack: [] };

      return {
        ...current,
        [page.id]: {
          undoStack: currentHistory.undoStack.slice(0, -1),
          redoStack: [cloneCanvasObjects(page.canvasObjects), ...currentHistory.redoStack].slice(0, CANVAS_HISTORY_LIMIT),
        },
      };
    });
    workspace.updatePage(page.id, {
      canvasObjects: cloneCanvasObjects(previousObjects),
    });
  }

  function redoCanvas() {
    const page = workspace.activePage;
    if (!page) {
      return;
    }

    const pageHistory = canvasHistoryByPage[page.id];
    const nextObjects = pageHistory?.redoStack[0];
    if (!pageHistory || !nextObjects) {
      return;
    }

    setSelectedObjectId(null);
    setCanvasHistoryByPage((current) => {
      const currentHistory = current[page.id] ?? { redoStack: [], undoStack: [] };

      return {
        ...current,
        [page.id]: {
          undoStack: [...currentHistory.undoStack, cloneCanvasObjects(page.canvasObjects)].slice(-CANVAS_HISTORY_LIMIT),
          redoStack: currentHistory.redoStack.slice(1),
        },
      };
    });
    workspace.updatePage(page.id, {
      canvasObjects: cloneCanvasObjects(nextObjects),
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

  return (
    <main className="flex h-screen min-h-0 bg-slate-50 text-slate-900">
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
        onDuplicateFolder={workspace.duplicateFolder}
        onDuplicatePage={workspace.duplicatePage}
        onDuplicateProject={workspace.duplicateProject}
        onRenameFolder={workspace.renameFolder}
        onRenameProfile={workspace.renameProfile}
        onRenameProject={workspace.renameProject}
        onRenamePage={workspace.renamePage}
        onToggleFavoritePage={(pageId) =>
          workspace.updatePage(pageId, {
            isFavorite: !workspace.data.pages.find((page) => page.id === pageId)?.isFavorite,
          })
        }
        onToggleCollapsed={() => setIsSidebarCollapsed((value) => !value)}
        onSearchChange={setSearchQuery}
        onSelectProfile={workspace.selectProfile}
        onSelectPage={workspace.selectPage}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        <Workspace
          activeTool={activeTool}
          activePage={workspace.activePage}
          data={workspace.activeProfileData}
          canRedoCanvas={canRedoCanvas}
          canUndoCanvas={canUndoCanvas}
          imageImportRequestId={imageImportRequestId}
          isGridVisible={isGridVisible}
          isSnapToGridEnabled={isSnapToGridEnabled}
          onDeletePage={workspace.deletePage}
          onResetView={resetView}
          onRedoCanvas={redoCanvas}
          onPenSettingsChange={setPenSettings}
          onSearchByTag={(tag) => setSearchQuery(tag)}
          onUndoCanvas={undoCanvas}
          onUpdateCanvasObjects={updateCanvasObjects}
          onUpdatePage={workspace.updatePage}
          onSelectionChange={setSelectedObjectId}
          onToggleSnapToGrid={() => setIsSnapToGridEnabled((value) => !value)}
          onToggleGrid={() => setIsGridVisible((value) => !value)}
          penSettings={penSettings}
          selectedObjectId={selectedObjectId}
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
        ? Math.min(12, Math.max(1, parsed.strokeWidth))
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
      smoothing:
        parsed.smoothing === "off" ||
        parsed.smoothing === "light" ||
        parsed.smoothing === "medium" ||
        parsed.smoothing === "high" ||
        parsed.smoothing === "veryHigh"
          ? parsed.smoothing
          : defaultPenSettings.smoothing,
      strokeColor: typeof parsed.strokeColor === "string" ? parsed.strokeColor : defaultPenSettings.strokeColor,
      strokeWidth,
    };
  } catch {
    return defaultPenSettings;
  }
}

function normalizeHexColorSetting(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{3}$/.test(trimmed) ? trimmed : null;
}
