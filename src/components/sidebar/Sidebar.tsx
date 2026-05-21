"use client";

import { useEffect, useMemo, useState } from "react";
import type { Page, WorkspaceData } from "@/types/workspace";
import type { MouseEvent, ReactNode } from "react";
import { PageButton } from "@/components/sidebar/PageButton";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  FilePlus,
  Folder,
  FolderPlus,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";

type SidebarProps = {
  activePageId: string;
  data: WorkspaceData;
  favoritePages: Page[];
  isCollapsed: boolean;
  searchQuery: string;
  searchResults: Page[];
  onCreateFolder: (projectId: string, name: string) => void;
  onCreatePage: (projectId: string, folderId: string, title?: string) => void;
  onCreateProject: (name: string) => void;
  onDuplicateFolder: (folderId: string) => void;
  onDuplicatePage: (pageId: string) => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onDeletePage: (pageId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onRenameProject: (projectId: string, name: string) => void;
  onRenamePage: (pageId: string, name: string) => void;
  onToggleFavoritePage: (pageId: string) => void;
  onSearchChange: (value: string) => void;
  onSelectPage: (pageId: string) => void;
  onToggleCollapsed: () => void;
};

type SidebarState = {
  expandedFolderIds: string[];
  expandedProjectIds: string[];
};

const storageKey = "thinkleaf.sidebar.v1";

function loadSidebarState(): SidebarState {
  if (typeof window === "undefined") {
    return { expandedFolderIds: [], expandedProjectIds: [] };
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return { expandedFolderIds: [], expandedProjectIds: [] };
    }

    const parsed = JSON.parse(stored) as Partial<SidebarState>;
    return {
      expandedFolderIds: Array.isArray(parsed.expandedFolderIds) ? parsed.expandedFolderIds : [],
      expandedProjectIds: Array.isArray(parsed.expandedProjectIds) ? parsed.expandedProjectIds : [],
    };
  } catch {
    return { expandedFolderIds: [], expandedProjectIds: [] };
  }
}

export function Sidebar({
  activePageId,
  data,
  favoritePages,
  isCollapsed,
  searchQuery,
  searchResults,
  onCreateFolder,
  onCreatePage,
  onCreateProject,
  onDuplicateFolder,
  onDuplicatePage,
  onDuplicateProject,
  onDeleteFolder,
  onDeleteProject,
  onDeletePage,
  onRenameFolder,
  onRenameProject,
  onRenamePage,
  onToggleFavoritePage,
  onSearchChange,
  onSelectPage,
  onToggleCollapsed,
}: SidebarProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);

  useEffect(() => {
    const state = loadSidebarState();
    setExpandedProjectIds(state.expandedProjectIds);
    setExpandedFolderIds(state.expandedFolderIds);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        expandedFolderIds,
        expandedProjectIds,
      }),
    );
  }, [expandedFolderIds, expandedProjectIds, isHydrated]);

  useEffect(() => {
    setExpandedProjectIds((current) => {
      const existingIds = new Set(data.projects.map((project) => project.id));
      const next = current.filter((id) => existingIds.has(id));
      let changed = next.length !== current.length;

      for (const project of data.projects) {
        if (!next.includes(project.id)) {
          next.push(project.id);
          changed = true;
        }
      }

      return changed ? next : current;
    });

    setExpandedFolderIds((current) => {
      const existingIds = new Set(data.folders.map((folder) => folder.id));
      const next = current.filter((id) => existingIds.has(id));
      let changed = next.length !== current.length;

      for (const folder of data.folders) {
        if (!next.includes(folder.id)) {
          next.push(folder.id);
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [data.folders, data.projects]);

  const expandedProjectSet = useMemo(() => new Set(expandedProjectIds), [expandedProjectIds]);
  const expandedFolderSet = useMemo(() => new Set(expandedFolderIds), [expandedFolderIds]);

  function promptProject() {
    const name = window.prompt("Project name");
    if (!name) {
      return;
    }

    onCreateProject(name);
  }

  function promptFolder(projectId: string) {
    const name = window.prompt("Folder name");
    if (!name) {
      return;
    }

    onCreateFolder(projectId, name);
  }

  function promptPage(projectId: string, folderId: string) {
    const title = window.prompt("Page title", "Untitled meeting note");
    if (title === null) {
      return;
    }

    onCreatePage(projectId, folderId, title || "Untitled meeting note");
  }

  function promptProjectRename(projectId: string, currentName: string) {
    const nextName = window.prompt("Rename project", currentName);
    if (nextName === null) {
      return;
    }

    onRenameProject(projectId, nextName);
  }

  function promptFolderRename(folderId: string, currentName: string) {
    const nextName = window.prompt("Rename folder", currentName);
    if (nextName === null) {
      return;
    }

    onRenameFolder(folderId, nextName);
  }

  function promptPageRename(pageId: string, currentName: string) {
    const nextName = window.prompt("Rename page", currentName);
    if (nextName === null) {
      return;
    }

    onRenamePage(pageId, nextName);
  }

  function toggleProject(projectId: string) {
    setExpandedProjectIds((current) =>
      current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId],
    );
  }

  function toggleFolder(folderId: string) {
    setExpandedFolderIds((current) =>
      current.includes(folderId) ? current.filter((id) => id !== folderId) : [...current, folderId],
    );
  }

  function actionButton(
    label: string,
    icon: ReactNode,
    onClick: (event: MouseEvent<HTMLButtonElement>) => void,
    tone: "default" | "danger" = "default",
  ) {
    return (
      <button
        aria-label={label}
        className={[
          "inline-flex h-7 w-7 items-center justify-center rounded transition",
          tone === "danger"
            ? "text-rose-500 hover:bg-rose-50"
            : "text-slate-500 hover:bg-slate-100",
        ].join(" ")}
        title={label}
        type="button"
        onClick={onClick}
      >
        {icon}
      </button>
    );
  }

  function pageActions(page: Page) {
    return (
      <>
        {actionButton(
          page.isFavorite ? "Remove favorite" : "Mark favorite",
          <Star aria-hidden="true" className={["h-3.5 w-3.5", page.isFavorite ? "fill-leaf-500 text-leaf-600" : ""].join(" ")} />,
          (event) => {
            event.stopPropagation();
            onToggleFavoritePage(page.id);
          },
        )}
        {actionButton("Duplicate page", <Copy aria-hidden="true" className="h-3.5 w-3.5" />, (event) => {
          event.stopPropagation();
          onDuplicatePage(page.id);
        })}
        {actionButton("Rename page", <Pencil aria-hidden="true" className="h-3.5 w-3.5" />, (event) => {
          event.stopPropagation();
          promptPageRename(page.id, page.title || "Untitled");
        })}
        {actionButton("Delete page", <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />, (event) => {
          event.stopPropagation();
          const shouldDelete = window.confirm(
            `Delete page "${page.title || "Untitled"}"? This will remove the page and its canvas objects.`,
          );
          if (shouldDelete) {
            onDeletePage(page.id);
          }
        }, "danger")}
      </>
    );
  }

  if (isCollapsed) {
    return (
      <aside className="flex h-full w-[72px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-center border-b border-slate-200">
          <button
            aria-label="Expand sidebar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            title="Expand sidebar"
            type="button"
            onClick={onToggleCollapsed}
          >
            <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center gap-3 py-4">
          <div className="rounded-md border border-dashed border-slate-200 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
            TL
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold tracking-tight text-slate-950">Thinkleaf</div>
            <div className="text-xs text-slate-500">Notes with room to think.</div>
          </div>
          <button
            aria-label="Collapse sidebar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            title="Collapse sidebar"
            type="button"
            onClick={onToggleCollapsed}
          >
            <PanelLeftClose aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <label className="relative mt-4 block">
          <span className="sr-only">Search pages</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-9 text-sm outline-none transition focus:border-leaf-500 focus:bg-white focus:ring-2 focus:ring-leaf-100"
            placeholder="Search title, notes, or tags"
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {searchQuery.trim() ? (
          <section className="mb-5">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Search Results</h2>
            </div>
            {searchResults.length ? (
              <div className="space-y-1">
                {searchResults.map((page) => (
                  <PageButton
                    key={page.id}
                    isActive={page.id === activePageId}
                    actions={pageActions(page)}
                    page={page}
                    onClick={() => onSelectPage(page.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="px-2 text-sm text-slate-500">No pages match this search.</p>
            )}
          </section>
        ) : null}

        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Projects</h2>
            <button
              aria-label="Create project"
              className="inline-flex h-7 w-7 items-center justify-center rounded text-leaf-700 hover:bg-leaf-50"
              title="Create project"
              type="button"
              onClick={promptProject}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {data.projects.map((project) => {
              const folders = data.folders.filter((folder) => folder.projectId === project.id);
              const isExpanded = expandedProjectSet.has(project.id);

              return (
                <div key={project.id} className="rounded-md border border-slate-200 bg-white p-2">
                  <div className="group flex items-center justify-between gap-2">
                    <button
                      className="flex min-w-0 items-center gap-2 text-left"
                      type="button"
                      onClick={() => toggleProject(project.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <div className="min-w-0 truncate text-sm font-semibold text-slate-800">{project.name}</div>
                    </button>
                    <div className="flex items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                      {actionButton(
                        `Create folder in ${project.name}`,
                        <FolderPlus aria-hidden="true" className="h-3.5 w-3.5" />,
                        (event) => {
                          event.stopPropagation();
                          promptFolder(project.id);
                        },
                      )}
                      {actionButton(
                        `Duplicate project ${project.name}`,
                        <Copy aria-hidden="true" className="h-3.5 w-3.5" />,
                        (event) => {
                          event.stopPropagation();
                          onDuplicateProject(project.id);
                        },
                      )}
                      {actionButton(
                        `Rename project ${project.name}`,
                        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />,
                        (event) => {
                          event.stopPropagation();
                          promptProjectRename(project.id, project.name);
                        },
                      )}
                      {actionButton(
                        `Delete project ${project.name}`,
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />,
                        (event) => {
                          event.stopPropagation();
                          const shouldDelete = window.confirm(
                            `Delete project "${project.name}"? This will remove all folders and pages inside the project.`,
                          );
                          if (shouldDelete) {
                            onDeleteProject(project.id);
                          }
                        },
                        "danger",
                      )}
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="mt-2 space-y-2">
                      {folders.map((folder) => {
                        const pages = data.pages.filter((page) => page.folderId === folder.id);
                        const folderExpanded = expandedFolderSet.has(folder.id);

                        return (
                          <div key={folder.id} className="border-l border-slate-200 pl-3">
                            <div className="group flex items-center justify-between gap-2">
                              <button
                                className="flex min-w-0 items-center gap-1.5 text-left"
                                type="button"
                                onClick={() => toggleFolder(folder.id)}
                              >
                                {folderExpanded ? (
                                  <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                ) : (
                                  <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                )}
                                <div className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  <Folder aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                                  {folder.name}
                                </div>
                              </button>
                              <div className="flex items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                                {actionButton(
                                  `Create page in ${folder.name}`,
                                  <FilePlus aria-hidden="true" className="h-3.5 w-3.5" />,
                                  (event) => {
                                    event.stopPropagation();
                                    promptPage(project.id, folder.id);
                                  },
                                )}
                                {actionButton(
                                  `Duplicate folder ${folder.name}`,
                                  <Copy aria-hidden="true" className="h-3.5 w-3.5" />,
                                  (event) => {
                                    event.stopPropagation();
                                    onDuplicateFolder(folder.id);
                                  },
                                )}
                                {actionButton(
                                  `Rename folder ${folder.name}`,
                                  <Pencil aria-hidden="true" className="h-3.5 w-3.5" />,
                                  (event) => {
                                    event.stopPropagation();
                                    promptFolderRename(folder.id, folder.name);
                                  },
                                )}
                                {actionButton(
                                  `Delete folder ${folder.name}`,
                                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />,
                                  (event) => {
                                    event.stopPropagation();
                                    const shouldDelete = window.confirm(
                                      `Delete folder "${folder.name}"? This will remove all pages inside the folder.`,
                                    );
                                    if (shouldDelete) {
                                      onDeleteFolder(folder.id);
                                    }
                                  },
                                  "danger",
                                )}
                              </div>
                            </div>

                            {folderExpanded ? (
                              <div className="mt-1 space-y-1">
                                {pages.map((page) => (
                                  <PageButton
                                    key={page.id}
                                    isActive={page.id === activePageId}
                                    actions={pageActions(page)}
                                    page={page}
                                    compact
                                    onClick={() => onSelectPage(page.id)}
                                  />
                                ))}
                                {!pages.length ? (
                                  <p className="px-2 py-1 text-xs text-slate-400">No pages yet.</p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {!folders.length ? (
                        <p className="px-2 py-1 text-xs text-slate-400">Add a folder to start pages.</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Star aria-hidden="true" className="h-3.5 w-3.5" />
              Favorite Pages
            </h2>
          </div>
          {favoritePages.length ? (
            <div className="space-y-1">
                {favoritePages.map((page) => (
                  <PageButton
                    key={page.id}
                    isActive={page.id === activePageId}
                    actions={pageActions(page)}
                    page={page}
                    onClick={() => onSelectPage(page.id)}
                  />
                ))}
            </div>
          ) : (
            <p className="px-2 text-sm text-slate-500">No favorites yet.</p>
          )}
        </section>
      </div>
    </aside>
  );
}
