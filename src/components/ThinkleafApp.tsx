"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { TopToolbar } from "@/components/toolbar/TopToolbar";
import { Workspace } from "@/components/workspace/Workspace";
import { createDefaultCanvasViewState, defaultCanvasViewState, maxZoom, minZoom, zoomStep } from "@/lib/canvasStyle";
import { useWorkspace } from "@/hooks/useWorkspace";
import { searchPages, sortPagesByUpdatedAt } from "@/lib/workspaceUtils";
import type { CanvasTool } from "@/types/workspace";

const toolShortcuts: Record<string, CanvasTool> = {
  "1": "Select",
  "2": "Pan",
  "3": "Rectangle",
  "4": "Circle",
  "5": "Text Box",
  "6": "Line",
  "7": "Arrow",
};

const SNAP_TO_GRID_STORAGE_KEY = "thinkleaf.snapToGrid.v1";

export function ThinkleafApp() {
  const workspace = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isSnapToGridEnabled, setIsSnapToGridEnabled] = useState(true);
  const [activeTool, setActiveTool] = useState<CanvasTool>("Select");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasLoadedUiPreferences, setHasLoadedUiPreferences] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setIsSidebarCollapsed(window.localStorage.getItem("thinkleaf.ui.v1") === "sidebar-collapsed");
      setIsSnapToGridEnabled(window.localStorage.getItem(SNAP_TO_GRID_STORAGE_KEY) !== "off");
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
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      const nextTool = toolShortcuts[event.key];
      if (!nextTool) {
        return;
      }

      event.preventDefault();
      setActiveTool(nextTool);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const searchResults = useMemo(
    () => searchPages(workspace.activeProfileData.pages, searchQuery),
    [searchQuery, workspace.activeProfileData.pages],
  );

  const favoritePages = useMemo(
    () => sortPagesByUpdatedAt(workspace.activeProfileData.pages.filter((page) => page.isFavorite)),
    [workspace.activeProfileData.pages],
  );
  const canvasViewState = workspace.activePage?.canvasViewState ?? defaultCanvasViewState;

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
        <TopToolbar
          activeTool={activeTool}
          zoomPercent={Math.round(canvasViewState.zoom * 100)}
          onResetView={resetView}
          onZoomIn={() => updateZoom(canvasViewState.zoom + zoomStep)}
          onZoomOut={() => updateZoom(canvasViewState.zoom - zoomStep)}
        />
        <Workspace
          activeTool={activeTool}
          activePage={workspace.activePage}
          data={workspace.activeProfileData}
          isGridVisible={isGridVisible}
          isSnapToGridEnabled={isSnapToGridEnabled}
          onDeletePage={workspace.deletePage}
          onSearchByTag={(tag) => setSearchQuery(tag)}
          onUpdatePage={workspace.updatePage}
          onSelectionChange={setSelectedObjectId}
          onToggleSnapToGrid={() => setIsSnapToGridEnabled((value) => !value)}
          onToggleGrid={() => setIsGridVisible((value) => !value)}
          selectedObjectId={selectedObjectId}
          onToolChange={setActiveTool}
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
