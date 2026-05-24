"use client";

import { useEffect, useMemo, useState } from "react";
import type { Folder as WorkspaceFolder, Page, Profile, WorkspaceData } from "@/types/workspace";
import type { PageTemplate } from "@/types/workspace";
import type { MouseEvent, ReactNode } from "react";
import { PageButton } from "@/components/sidebar/PageButton";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  FilePlus,
  Folder,
  FolderPlus,
  MoreHorizontal,
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
  activeProfileId: string;
  data: WorkspaceData;
  favoritePages: Page[];
  isCollapsed: boolean;
  profiles: Profile[];
  searchQuery: string;
  searchResults: Page[];
  templates: PageTemplate[];
  onCreateProfile: (name: string) => void;
  onCreateFolder: (projectId: string, name: string, parentFolderId?: string) => void;
  onCreatePage: (projectId: string, folderId: string, title?: string, template?: PageTemplate) => void;
  onCreateProject: (name: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onDuplicateFolder: (folderId: string) => void;
  onDuplicatePage: (pageId: string) => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onDeletePage: (pageId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onRenameProfile: (profileId: string, name: string) => void;
  onRenameProject: (projectId: string, name: string) => void;
  onRenamePage: (pageId: string, name: string) => void;
  onSavePageAsTemplate: (page: Page) => void;
  onToggleFavoritePage: (pageId: string) => void;
  onSearchChange: (value: string) => void;
  onSelectProfile: (profileId: string) => void;
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
  activeProfileId,
  data,
  favoritePages,
  isCollapsed,
  profiles,
  searchQuery,
  searchResults,
  templates,
  onCreateProfile,
  onCreateFolder,
  onCreatePage,
  onCreateProject,
  onDeleteProfile,
  onDuplicateFolder,
  onDuplicatePage,
  onDuplicateProject,
  onDeleteFolder,
  onDeleteProject,
  onDeletePage,
  onRenameFolder,
  onRenameProfile,
  onRenameProject,
  onRenamePage,
  onSavePageAsTemplate,
  onToggleFavoritePage,
  onSearchChange,
  onSelectProfile,
  onSelectPage,
  onToggleCollapsed,
}: SidebarProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

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

  useEffect(() => {
    function closeActionMenu(event: PointerEvent) {
      if (event.target instanceof HTMLElement && event.target.closest("[data-sidebar-action-menu='true']")) {
        return;
      }

      setOpenActionMenuId(null);
    }

    document.addEventListener("pointerdown", closeActionMenu);

    return () => {
      document.removeEventListener("pointerdown", closeActionMenu);
    };
  }, []);

  const expandedProjectSet = useMemo(() => new Set(expandedProjectIds), [expandedProjectIds]);
  const expandedFolderSet = useMemo(() => new Set(expandedFolderIds), [expandedFolderIds]);
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];

  function promptProject() {
    const name = window.prompt("Project name");
    if (!name) {
      return;
    }

    onCreateProject(name);
  }

  function promptProfile() {
    const name = window.prompt("Profile name", "New Profile");
    if (!name) {
      return;
    }

    onCreateProfile(name);
  }

  function promptFolder(projectId: string, parentFolderId?: string) {
    const name = window.prompt("Folder name");
    if (!name) {
      return;
    }

    onCreateFolder(projectId, name, parentFolderId);
  }

  function promptPage(projectId: string, folderId: string) {
    let selectedTemplate: PageTemplate | undefined;
    const creationChoice = window.prompt("Create page:\n1. Blank Page\n2. From Template", "1");

    if (creationChoice === null) {
      return;
    }

    const normalizedChoice = creationChoice.trim().toLowerCase();
    const shouldUseTemplate = normalizedChoice === "2" || normalizedChoice === "template" || normalizedChoice === "t";

    if (shouldUseTemplate) {
      if (!templates.length) {
        window.alert("No templates saved yet.");
        return;
      }

      const templateChoice = window.prompt(
        `Choose a template:\n${templates.map((template, index) => `${index + 1}. ${template.name}`).join("\n")}`,
        "1",
      );
      if (templateChoice === null) {
        return;
      }
      const templateIndex = Number.parseInt(templateChoice, 10) - 1;
      selectedTemplate = Number.isInteger(templateIndex) ? templates[templateIndex] : undefined;
      if (!selectedTemplate) {
        window.alert("Template not found.");
        return;
      }
    } else if (normalizedChoice !== "1" && normalizedChoice !== "blank" && normalizedChoice !== "b") {
      window.alert("Choose Blank Page or From Template.");
      return;
    }

    const title = window.prompt("Page title", selectedTemplate?.title || "Untitled meeting note");
    if (title === null) {
      return;
    }

    onCreatePage(projectId, folderId, title || selectedTemplate?.title || "Untitled meeting note", selectedTemplate);
  }

  function promptProjectRename(projectId: string, currentName: string) {
    const nextName = window.prompt("Rename project", currentName);
    if (nextName === null) {
      return;
    }

    onRenameProject(projectId, nextName);
  }

  function promptProfileRename(profileId: string, currentName: string) {
    const nextName = window.prompt("Rename profile", currentName);
    if (nextName === null) {
      return;
    }

    onRenameProfile(profileId, nextName);
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
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpenActionMenuId(null);
          onClick(event);
        }}
      >
        {icon}
      </button>
    );
  }

  function menuActionButton(
    label: string,
    icon: ReactNode,
    onClick: (event: MouseEvent<HTMLButtonElement>) => void,
    tone: "default" | "danger" = "default",
  ) {
    return (
      <button
        className={[
          "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium transition",
          tone === "danger"
            ? "text-rose-600 hover:bg-rose-50"
            : "text-slate-600 hover:bg-slate-100",
        ].join(" ")}
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpenActionMenuId(null);
          onClick(event);
        }}
      >
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>
        <span className="min-w-0 truncate">{label}</span>
      </button>
    );
  }

  function actionMenu(menuId: string, label: string, children: ReactNode) {
    const isOpen = openActionMenuId === menuId;

    return (
      <div className="relative shrink-0" data-sidebar-action-menu="true">
        <button
          aria-label={label}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100"
          title={label}
          type="button"
          aria-expanded={isOpen}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpenActionMenuId((current) => (current === menuId ? null : menuId));
          }}
        >
          <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
        </button>
        {isOpen ? (
          <div
            className="absolute right-0 top-8 z-30 grid min-w-44 gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-soft"
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          >
            {children}
          </div>
        ) : null}
      </div>
    );
  }

  function pageActions(page: Page, menuScope: string) {
    return (
      <>
        {actionButton(
          page.isFavorite ? "Remove favorite" : "Mark favorite",
          <Star
            aria-hidden="true"
            className={["h-3.5 w-3.5", page.isFavorite ? "fill-leaf-500 text-leaf-600" : ""].join(" ")}
          />,
          () => {
            onToggleFavoritePage(page.id);
          },
        )}
        {actionMenu(
          `${menuScope}-page-${page.id}`,
          `Page actions for ${page.title || "Untitled"}`,
          <>
            {menuActionButton("Save as template", <Copy aria-hidden="true" className="h-3.5 w-3.5" />, () => {
              onSavePageAsTemplate(page);
            })}
            {menuActionButton("Duplicate", <Copy aria-hidden="true" className="h-3.5 w-3.5" />, () => {
              onDuplicatePage(page.id);
            })}
            {menuActionButton("Rename", <Pencil aria-hidden="true" className="h-3.5 w-3.5" />, () => {
              promptPageRename(page.id, page.title || "Untitled");
            })}
            {menuActionButton("Delete", <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />, () => {
              const shouldDelete = window.confirm(
                `Delete page "${page.title || "Untitled"}"? This will remove the page and its canvas objects.`,
              );
              if (shouldDelete) {
                onDeletePage(page.id);
              }
            }, "danger")}
          </>,
        )}
      </>
    );
  }

  function renderFolder(projectId: string, folder: WorkspaceFolder, depth = 0): ReactNode {
    const childFolders = data.folders.filter(
      (item) => item.projectId === projectId && item.parentFolderId === folder.id,
    );
    const pages = data.pages.filter((page) => page.folderId === folder.id);
    const folderExpanded = expandedFolderSet.has(folder.id);
    const hasChildren = childFolders.length > 0 || pages.length > 0;

    return (
      <div key={folder.id} className="border-l border-slate-200 pl-3" style={{ marginLeft: depth ? 8 : 0 }}>
        <div className="group flex items-start gap-2">
          <button
            aria-label={`${folderExpanded ? "Collapse" : "Expand"} folder ${folder.name}`}
            className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            title={`${folderExpanded ? "Collapse" : "Expand"} folder`}
            type="button"
            onClick={() => toggleFolder(folder.id)}
          >
            {folderExpanded ? (
              <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            )}
          </button>
          <div className="flex min-w-0 flex-1 items-start gap-1.5 break-words text-xs font-semibold uppercase leading-4 tracking-wide text-slate-500">
            <Folder aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0">{folder.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {actionButton(
              `Create folder in ${folder.name}`,
              <FolderPlus aria-hidden="true" className="h-3.5 w-3.5" />,
              () => {
                promptFolder(projectId, folder.id);
              },
            )}
            {actionButton(
              `Create page in ${folder.name}`,
              <FilePlus aria-hidden="true" className="h-3.5 w-3.5" />,
              () => {
                promptPage(projectId, folder.id);
              },
            )}
            {actionMenu(
              `folder-${folder.id}`,
              `Folder actions for ${folder.name}`,
              <>
                {menuActionButton("Duplicate", <Copy aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                  onDuplicateFolder(folder.id);
                })}
                {menuActionButton("Rename", <Pencil aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                  promptFolderRename(folder.id, folder.name);
                })}
                {menuActionButton("Delete", <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                  const shouldDelete = window.confirm(
                    `Delete folder "${folder.name}"? This will remove all nested folders and pages inside it.`,
                  );
                  if (shouldDelete) {
                    onDeleteFolder(folder.id);
                  }
                }, "danger")}
              </>,
            )}
          </div>
        </div>

        {folderExpanded ? (
          <div className="mt-1 space-y-1">
            {childFolders.map((childFolder) => renderFolder(projectId, childFolder, depth + 1))}
            {pages.map((page) => (
              <PageButton
                key={page.id}
                isActive={page.id === activePageId}
                actions={pageActions(page, "project-tree")}
                page={page}
                compact
                onClick={() => onSelectPage(page.id)}
              />
            ))}
            {!hasChildren ? <p className="px-2 py-1 text-xs text-slate-400">No pages yet.</p> : null}
          </div>
        ) : null}
      </div>
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
          <img
            alt="Thinkleaf"
            className="h-10 w-10 object-contain"
            src="/brand/ThinkLeaf-Vertical.svg"
          />
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <img
            alt="Thinkleaf"
            className="h-10 max-w-[190px] object-contain object-left"
            src="/brand/ThinkLeaf-Horizontal.svg"
          />
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
                    actions={pageActions(page, "search")}
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
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Profiles</h2>
            <button
              aria-label="Create profile"
              className="inline-flex h-7 w-7 items-center justify-center rounded text-leaf-700 hover:bg-leaf-50"
              title="Create profile"
              type="button"
              onClick={promptProfile}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-2">
            <label className="block">
              <span className="sr-only">Active profile</span>
              <select
                className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-sm font-medium text-slate-700 outline-none transition focus:border-leaf-500 focus:bg-white focus:ring-2 focus:ring-leaf-100"
                value={activeProfileId}
                onChange={(event) => onSelectProfile(event.target.value)}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="min-w-0 truncate text-xs text-slate-500">{activeProfile?.name ?? "Profile"}</div>
              <div className="flex items-center gap-1">
                {activeProfile
                  ? actionButton(
                      `Rename profile ${activeProfile.name}`,
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />,
                      (event) => {
                        event.stopPropagation();
                        promptProfileRename(activeProfile.id, activeProfile.name);
                      },
                    )
                  : null}
                {activeProfile
                  ? actionButton(
                      `Delete profile ${activeProfile.name}`,
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />,
                      (event) => {
                        event.stopPropagation();
                        if (profiles.length <= 1) {
                          return;
                        }

                        const shouldDelete = window.confirm(
                          `Delete profile "${activeProfile.name}"? This will remove its projects, folders, pages, and canvas objects.`,
                        );
                        if (shouldDelete) {
                          onDeleteProfile(activeProfile.id);
                        }
                      },
                      "danger",
                    )
                  : null}
              </div>
            </div>
          </div>
        </section>

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
              const folders = data.folders.filter(
                (folder) => folder.projectId === project.id && !folder.parentFolderId,
              );
              const isExpanded = expandedProjectSet.has(project.id);

              return (
                <div key={project.id} className="rounded-md border border-slate-200 bg-white p-2">
                  <div className="group flex items-start gap-2">
                    <button
                      aria-label={`${isExpanded ? "Collapse" : "Expand"} project ${project.name}`}
                      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      title={`${isExpanded ? "Collapse" : "Expand"} project`}
                      type="button"
                      onClick={() => toggleProject(project.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <ChevronRight aria-hidden="true" className="h-4 w-4" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1 break-words text-sm font-semibold leading-5 text-slate-800">
                      {project.name}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {actionButton(
                        `Create folder in ${project.name}`,
                        <FolderPlus aria-hidden="true" className="h-3.5 w-3.5" />,
                        () => {
                          promptFolder(project.id);
                        },
                      )}
                      {actionMenu(
                        `project-${project.id}`,
                        `Project actions for ${project.name}`,
                        <>
                          {menuActionButton("Duplicate", <Copy aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                            onDuplicateProject(project.id);
                          })}
                          {menuActionButton("Rename", <Pencil aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                            promptProjectRename(project.id, project.name);
                          })}
                          {menuActionButton("Delete", <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                            const shouldDelete = window.confirm(
                              `Delete project "${project.name}"? This will remove all folders and pages inside the project.`,
                            );
                            if (shouldDelete) {
                              onDeleteProject(project.id);
                            }
                          }, "danger")}
                        </>,
                      )}
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="mt-2 space-y-2">
                      {folders.map((folder) => renderFolder(project.id, folder))}
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
                    actions={pageActions(page, "favorites")}
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
