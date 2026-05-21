"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { TopToolbar } from "@/components/toolbar/TopToolbar";
import { Workspace } from "@/components/workspace/Workspace";
import { useWorkspace } from "@/hooks/useWorkspace";
import { searchPages, sortPagesByUpdatedAt } from "@/lib/workspaceUtils";
import type { CanvasTool } from "@/types/workspace";

export function ThinkleafApp() {
  const workspace = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [activeTool, setActiveTool] = useState<CanvasTool>("Select");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      return window.localStorage.getItem("thinkleaf.ui.v1") === "sidebar-collapsed";
    } catch {
      return false;
    }
  });
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "thinkleaf.ui.v1",
        isSidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded",
      );
    } catch {
      // Ignore storage errors in private/incognito modes.
    }
  }, [isSidebarCollapsed]);

  const searchResults = useMemo(
    () => searchPages(workspace.data.pages, searchQuery),
    [searchQuery, workspace.data.pages],
  );

  const favoritePages = useMemo(
    () => sortPagesByUpdatedAt(workspace.data.pages.filter((page) => page.isFavorite)),
    [workspace.data.pages],
  );

  return (
    <main className="flex h-screen min-h-0 bg-slate-50 text-slate-900">
      <Sidebar
        activePageId={workspace.activePageId}
        data={workspace.data}
        favoritePages={favoritePages}
        isCollapsed={isSidebarCollapsed}
        searchQuery={searchQuery}
        searchResults={searchResults}
        onCreateFolder={workspace.createFolder}
        onCreatePage={workspace.createPage}
        onCreateProject={workspace.createProject}
        onToggleCollapsed={() => setIsSidebarCollapsed((value) => !value)}
        onSearchChange={setSearchQuery}
        onSelectPage={workspace.selectPage}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        <TopToolbar
          activeTool={activeTool}
        />
        <Workspace
          activeTool={activeTool}
          activePage={workspace.activePage}
          data={workspace.data}
          isGridVisible={isGridVisible}
          onDeletePage={workspace.deletePage}
          onSearchByTag={(tag) => setSearchQuery(tag)}
          onUpdatePage={workspace.updatePage}
          onSelectionChange={setSelectedObjectId}
          onToggleGrid={() => setIsGridVisible((value) => !value)}
          selectedObjectId={selectedObjectId}
          onToolChange={setActiveTool}
        />
      </section>
    </main>
  );
}
