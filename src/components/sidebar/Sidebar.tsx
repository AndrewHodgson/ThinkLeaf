"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Folder as WorkspaceFolder, Page, Profile, SidebarItemColor, WorkspaceData } from "@/types/workspace";
import type { PageTemplate } from "@/types/workspace";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent, ReactNode } from "react";
import { PageButton } from "@/components/sidebar/PageButton";
import {
  SIDEBAR_COLOR_ICON,
  SIDEBAR_COLOR_OPTIONS,
  SIDEBAR_COLOR_TEXT,
  SIDEBAR_ITEM_PADDING_CLASS,
} from "@/components/sidebar/sidebarStyles";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Copy,
  FilePlus,
  Folder,
  FolderPlus,
  LogIn,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import { safeSetLocalStorage } from "@/lib/storage";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import type { SyncStatus } from "@/hooks/useSyncEngine";

type SidebarProps = {
  activePageId: string;
  activeProfileId: string;
  data: WorkspaceData;
  favoritePages: Page[];
  isCollapsed: boolean;
  profiles: Profile[];
  searchQuery: string;
  searchResults: Page[];
  onCreateProfile: (name: string) => void;
  onCreateFolder: (projectId: string, name: string, parentFolderId?: string) => void;
  onCreatePage: (projectId: string, folderId: string | undefined, title?: string, template?: PageTemplate) => void;
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
  onColorProject: (projectId: string, color: SidebarItemColor | undefined) => void;
  onColorFolder: (folderId: string, color: SidebarItemColor | undefined) => void;
  onMovePage: (pageId: string, targetProjectId: string, targetFolderId: string | undefined) => void;
  onMoveFolder: (folderId: string, targetParentFolderId: string | null, targetProjectId?: string) => void;
  onSearchChange: (value: string) => void;
  onSelectProfile: (profileId: string) => void;
  onSelectPage: (pageId: string) => void;
  onToggleCollapsed: () => void;
  // Auth (optional — app works fully without these)
  authLoading?: boolean;
  authUser?: { email?: string } | null;
  isAuthConfigured?: boolean;
  onSignIn?: (email: string, password: string) => Promise<{ error: string | null }>;
  onSignOut?: () => Promise<void>;
  onSignUp?: (email: string, password: string) => Promise<{ error: string | null }>;
  // Sync status (optional — only shown when signed in)
  syncStatus?: SyncStatus;
  lastSyncedAt?: string | null;
  lastSyncError?: string | null;
  onSyncNow?: () => void;
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

function getFolderDescendantIds(folders: WorkspaceFolder[], folderId: string): Set<string> {
  const ids = new Set<string>([folderId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of folders) {
      if (!ids.has(f.id) && f.parentFolderId && ids.has(f.parentFolderId)) {
        ids.add(f.id);
        changed = true;
      }
    }
  }
  return ids;
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
  onColorProject,
  onColorFolder,
  onMovePage,
  onMoveFolder,
  onSavePageAsTemplate,
  onToggleFavoritePage,
  onSearchChange,
  onSelectProfile,
  onSelectPage,
  onToggleCollapsed,
  authLoading = false,
  authUser = null,
  isAuthConfigured = false,
  onSignIn,
  onSignOut,
  onSignUp,
  syncStatus,
  lastSyncedAt = null,
  lastSyncError = null,
  onSyncNow,
}: SidebarProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [selectedSidebarId, setSelectedSidebarId] = useState<string | null>(null);
  const [selectedSidebarType, setSelectedSidebarType] = useState<"project" | "folder" | null>(null);

  type DragItemInfo = { type: "page" | "folder"; id: string; label: string };
  type DropTarget =
    | { type: "folder"; folderId: string; projectId: string }
    | { type: "project-root"; projectId: string }
    | null;

  const dataRef = useRef(data);
  dataRef.current = data;

  const dragTrackRef = useRef<{
    type: "page" | "folder";
    id: string;
    startX: number;
    startY: number;
    active: boolean;
    activeDropTarget: DropTarget;
  } | null>(null);
  const dragListenersRef = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void } | null>(null);

  const [dragState, setDragState] = useState<(DragItemInfo & { x: number; y: number }) | null>(null);
  const [visualDropTarget, setVisualDropTarget] = useState<DropTarget>(null);

  type InlineRenameState = { type: "project" | "folder" | "page"; id: string; value: string };
  const [inlineRename, setInlineRename] = useState<InlineRenameState | null>(null);
  const inlineRenameRef = useRef<InlineRenameState | null>(null);
  inlineRenameRef.current = inlineRename;
  const renameKeyCommittedRef = useRef(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    if (!onSignIn || !onSignUp) return;
    setAuthSubmitting(true);
    setAuthError(null);
    const result = authMode === "signIn"
      ? await onSignIn(authEmail, authPassword)
      : await onSignUp(authEmail, authPassword);
    setAuthSubmitting(false);
    if (result.error) {
      setAuthError(result.error);
    } else {
      setAuthModalOpen(false);
      setAuthEmail("");
      setAuthPassword("");
    }
  }

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

    safeSetLocalStorage(
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
      return next.length !== current.length ? next : current;
    });

    setExpandedFolderIds((current) => {
      const existingIds = new Set(data.folders.map((folder) => folder.id));
      const next = current.filter((id) => existingIds.has(id));
      return next.length !== current.length ? next : current;
    });
  }, [data.folders, data.projects]);

  useEffect(() => {
    if (!activePageId) return;
    const { pages, folders, projects } = dataRef.current;
    const page = pages.find((p) => p.id === activePageId);
    if (!page) return;

    const folderIdsToExpand: string[] = [];
    let currentFolderId = page.folderId;
    while (currentFolderId) {
      folderIdsToExpand.push(currentFolderId);
      const folder = folders.find((f) => f.id === currentFolderId);
      currentFolderId = folder?.parentFolderId;
    }

    setExpandedProjectIds((current) =>
      current.includes(page.projectId) ? current : [...current, page.projectId],
    );

    setExpandedFolderIds((current) => {
      const toAdd = folderIdsToExpand.filter((id) => !current.includes(id));
      return toAdd.length === 0 ? current : [...current, ...toAdd];
    });
  }, [activePageId]);

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

  useEffect(() => {
    return () => {
      if (dragListenersRef.current) {
        window.removeEventListener("pointermove", dragListenersRef.current.move);
        window.removeEventListener("pointerup", dragListenersRef.current.up);
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
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

  function promptPage(projectId: string, folderId: string | undefined) {
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

  function promptMovePage(page: Page) {
    type MoveDestination = { label: string; projectId: string; folderId: string | undefined };
    const destinations: MoveDestination[] = [];

    if (page.folderId) {
      const currentProject = data.projects.find((p) => p.id === page.projectId);
      destinations.push({
        label: `${currentProject?.name ?? "Project"} (project root)`,
        projectId: page.projectId,
        folderId: undefined,
      });
    }

    for (const f of data.folders) {
      if (f.id === page.folderId && f.projectId === page.projectId) continue;
      const project = data.projects.find((p) => p.id === f.projectId);
      const inOtherProject = f.projectId !== page.projectId;
      destinations.push({
        label: `${f.name}${inOtherProject && project ? ` (${project.name})` : ""}`,
        projectId: f.projectId,
        folderId: f.id,
      });
    }

    if (!destinations.length) {
      window.alert("No valid destinations to move this page to.");
      return;
    }

    const lines = destinations.map((d, i) => `${i + 1}. ${d.label}`);
    const choice = window.prompt(`Move "${page.title || "Untitled"}" to:\n${lines.join("\n")}`, "1");
    if (choice === null) return;

    const index = Number.parseInt(choice, 10) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= destinations.length) {
      window.alert("Invalid selection.");
      return;
    }

    const target = destinations[index];
    onMovePage(page.id, target.projectId, target.folderId);
  }

  function promptMoveFolder(folder: WorkspaceFolder) {
    const descendantIds = getFolderDescendantIds(data.folders, folder.id);
    const currentProject = data.projects.find((p) => p.id === folder.projectId);
    const currentParentId = folder.parentFolderId ?? null;

    type MoveFolderDestination = { label: string; projectId: string; parentFolderId: string | null };
    const destinations: MoveFolderDestination[] = [];

    // Same-project root (only if currently nested)
    if (currentParentId !== null) {
      destinations.push({
        label: `${currentProject?.name ?? "Project"} (project root)`,
        projectId: folder.projectId,
        parentFolderId: null,
      });
    }

    // Same-project peer/parent folders (exclude self, descendants, current parent)
    for (const f of data.folders) {
      if (f.projectId !== folder.projectId) continue;
      if (descendantIds.has(f.id)) continue;
      if (f.id === currentParentId) continue;
      destinations.push({ label: f.name, projectId: folder.projectId, parentFolderId: f.id });
    }

    // Other projects in the same profile
    for (const project of data.projects) {
      if (project.id === folder.projectId) continue;
      destinations.push({
        label: `${project.name} (project root)`,
        projectId: project.id,
        parentFolderId: null,
      });
      for (const f of data.folders) {
        if (f.projectId !== project.id) continue;
        destinations.push({ label: `${f.name} (${project.name})`, projectId: project.id, parentFolderId: f.id });
      }
    }

    if (!destinations.length) {
      window.alert("No valid destinations to move this folder to.");
      return;
    }

    const lines = destinations.map((d, i) => `${i + 1}. ${d.label}`);
    const choice = window.prompt(`Move "${folder.name}" to:\n${lines.join("\n")}`, "1");
    if (choice === null) return;

    const index = Number.parseInt(choice, 10) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= destinations.length) {
      window.alert("Invalid selection.");
      return;
    }

    const dest = destinations[index];
    onMoveFolder(folder.id, dest.parentFolderId, dest.projectId);
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

  function getCreationContext(): { projectId: string; folderId: string | null } | null {
    if (selectedSidebarType === "folder" && selectedSidebarId) {
      const folder = data.folders.find((f) => f.id === selectedSidebarId);
      if (folder) return { projectId: folder.projectId, folderId: folder.id };
    }
    if (selectedSidebarType === "project" && selectedSidebarId) {
      const project = data.projects.find((p) => p.id === selectedSidebarId);
      if (project) return { projectId: project.id, folderId: null };
    }
    const activePage = data.pages.find((p) => p.id === activePageId);
    if (activePage) {
      return { projectId: activePage.projectId, folderId: activePage.folderId ?? null };
    }
    const firstProject = data.projects[0];
    if (!firstProject) {
      return null;
    }
    const firstFolder = data.folders.find((f) => f.projectId === firstProject.id && !f.parentFolderId);
    return { projectId: firstProject.id, folderId: firstFolder?.id ?? null };
  }

  function isValidDrop(dragItem: DragItemInfo, target: NonNullable<DropTarget>): boolean {
    const d = dataRef.current;
    if (dragItem.type === "page") {
      const page = d.pages.find((p) => p.id === dragItem.id);
      if (!page) return false;
      if (target.type === "folder") {
        return !(page.folderId === target.folderId && page.projectId === target.projectId);
      }
      return !(!page.folderId && page.projectId === target.projectId);
    }
    if (dragItem.type === "folder") {
      const folder = d.folders.find((f) => f.id === dragItem.id);
      if (!folder) return false;
      if (target.type === "folder") {
        // Can't drop into self or any descendant (cross-project targets can't be descendants, so this is safe)
        const descendantIds = getFolderDescendantIds(d.folders, dragItem.id);
        if (descendantIds.has(target.folderId)) return false;
        // Same project: can't drop into current parent (no-op)
        if (target.projectId === folder.projectId && folder.parentFolderId === target.folderId) return false;
        return true;
      }
      // Project-root target: valid if cross-project, or if currently nested in same project
      return target.projectId !== folder.projectId || folder.parentFolderId !== undefined;
    }
    return false;
  }

  function findDropTargetFromElement(el: Element, dragItem: DragItemInfo): DropTarget {
    let current: Element | null = el;
    while (current) {
      const folderId = current.getAttribute("data-drop-folder-id");
      const folderProjectId = current.getAttribute("data-drop-folder-project-id");
      if (folderId && folderProjectId) {
        const candidate: NonNullable<DropTarget> = { type: "folder", folderId, projectId: folderProjectId };
        return isValidDrop(dragItem, candidate) ? candidate : null;
      }
      const rootProjectId = current.getAttribute("data-drop-root-project-id");
      if (rootProjectId) {
        const candidate: NonNullable<DropTarget> = { type: "project-root", projectId: rootProjectId };
        return isValidDrop(dragItem, candidate) ? candidate : null;
      }
      current = current.parentElement;
    }
    return null;
  }

  function handleItemPointerDown(e: React.PointerEvent, type: "page" | "folder", id: string, label: string) {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const dragItem: DragItemInfo = { type, id, label };

    dragTrackRef.current = { type, id, startX, startY, active: false, activeDropTarget: null };

    function onMove(ev: PointerEvent) {
      const track = dragTrackRef.current;
      if (!track) return;
      const dx = ev.clientX - track.startX;
      const dy = ev.clientY - track.startY;
      if (!track.active && Math.hypot(dx, dy) > 5) {
        track.active = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        setDragState({ type, id, label, x: ev.clientX, y: ev.clientY });
      }
      if (track.active) {
        setDragState((prev) => (prev ? { ...prev, x: ev.clientX, y: ev.clientY } : null));
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const target = el ? findDropTargetFromElement(el, dragItem) : null;
        track.activeDropTarget = target;
        setVisualDropTarget(target);
      }
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      dragListenersRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const track = dragTrackRef.current;
      if (track?.active) {
        window.addEventListener(
          "click",
          (ev) => { ev.stopPropagation(); },
          { capture: true, once: true },
        );
        const target = track.activeDropTarget;
        if (target) executeDrop(type, id, target);
      }
      dragTrackRef.current = null;
      setDragState(null);
      setVisualDropTarget(null);
    }

    dragListenersRef.current = { move: onMove, up: onUp };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function executeDrop(type: "page" | "folder", id: string, target: NonNullable<DropTarget>) {
    if (type === "page") {
      const folderId = target.type === "folder" ? target.folderId : undefined;
      onMovePage(id, target.projectId, folderId);
    } else {
      const parentFolderId = target.type === "folder" ? target.folderId : null;
      onMoveFolder(id, parentFolderId, target.projectId);
    }
  }

  function startRename(type: "project" | "folder" | "page", id: string, name: string) {
    setOpenActionMenuId(null);
    const state: InlineRenameState = { type, id, value: name };
    inlineRenameRef.current = state;
    setInlineRename(state);
  }

  function commitRename() {
    const rename = inlineRenameRef.current;
    if (!rename) return;
    const trimmed = rename.value.trim();
    if (trimmed) {
      if (rename.type === "project") onRenameProject(rename.id, trimmed);
      else if (rename.type === "folder") onRenameFolder(rename.id, trimmed);
      else onRenamePage(rename.id, trimmed);
    }
    inlineRenameRef.current = null;
    setInlineRename(null);
  }

  function handleRenameChange(value: string) {
    if (!inlineRenameRef.current) return;
    const next: InlineRenameState = { ...inlineRenameRef.current, value };
    inlineRenameRef.current = next;
    setInlineRename(next);
  }

  function handleRenameKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      renameKeyCommittedRef.current = true;
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      renameKeyCommittedRef.current = true;
      inlineRenameRef.current = null;
      setInlineRename(null);
    }
  }

  function handleRenameBlur() {
    if (renameKeyCommittedRef.current) {
      renameKeyCommittedRef.current = false;
      return;
    }
    commitRename();
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

  function colorPicker(
    currentColor: SidebarItemColor | undefined,
    onSelect: (color: SidebarItemColor | undefined) => void,
  ) {
    return (
      <div className="mt-1 border-t border-slate-100 pt-1">
        <div className="px-2 pb-0.5 pt-0.5 text-[10px] text-slate-400">Color</div>
        <div className="flex gap-1 px-2 pb-1">
          {SIDEBAR_COLOR_OPTIONS.map(({ value, label, swatch }) => (
            <button
              key={label}
              title={label}
              className={[
                "h-4 w-4 rounded-full border transition",
                swatch,
                currentColor === value
                  ? "ring-2 ring-slate-600 ring-offset-1"
                  : "hover:ring-1 hover:ring-slate-400 hover:ring-offset-1",
              ].join(" ")}
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpenActionMenuId(null);
                onSelect(value);
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  function actionMenu(menuId: string, label: string, children: ReactNode) {
    const isOpen = openActionMenuId === menuId;

    return (
      <div className="relative shrink-0" data-sidebar-action-menu="true">
        <button
          aria-label={label}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100"
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
    return actionMenu(
      `${menuScope}-page-${page.id}`,
      `Page actions for ${page.title || "Untitled"}`,
      <>
        {menuActionButton(
          page.isFavorite ? "Remove from Favorites" : "Add to Favorites",
          <Star
            aria-hidden="true"
            className={["h-3.5 w-3.5", page.isFavorite ? "fill-leaf-500 text-leaf-600" : ""].join(" ")}
          />,
          () => {
            onToggleFavoritePage(page.id);
          },
        )}
        {menuActionButton("Save as template", <Copy aria-hidden="true" className="h-3.5 w-3.5" />, () => {
          onSavePageAsTemplate(page);
        })}
        {menuActionButton("Duplicate", <Copy aria-hidden="true" className="h-3.5 w-3.5" />, () => {
          onDuplicatePage(page.id);
        })}
        {menuActionButton("Move to...", <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />, () => {
          promptMovePage(page);
        })}
        {menuActionButton("Rename", <Pencil aria-hidden="true" className="h-3.5 w-3.5" />, () => {
          startRename("page", page.id, page.title || "Untitled");
        })}
        {menuActionButton(
          "Delete",
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />,
          () => {
            const shouldDelete = window.confirm(
              `Delete page "${page.title || "Untitled"}"? This will remove the page and its canvas objects.`,
            );
            if (shouldDelete) {
              onDeletePage(page.id);
            }
          },
          "danger",
        )}
      </>,
    );
  }

  function renderFolder(projectId: string, folder: WorkspaceFolder, depth = 0): ReactNode {
    const childFolders = data.folders.filter(
      (item) => item.projectId === projectId && item.parentFolderId === folder.id,
    );
    const pages = data.pages.filter((page) => page.folderId === folder.id);
    const folderExpanded = expandedFolderSet.has(folder.id);
    const hasChildren = childFolders.length > 0 || pages.length > 0;
    const isFolderBeingDragged = dragState?.type === "folder" && dragState.id === folder.id;
    const isFolderDropTarget = visualDropTarget?.type === "folder" && visualDropTarget.folderId === folder.id;
    const folderIconClass = folder.color ? SIDEBAR_COLOR_ICON[folder.color] : "";

    return (
      <div
        key={folder.id}
        className={["border-l border-slate-200 pl-3 transition-opacity", isFolderBeingDragged ? "opacity-40" : ""].join(" ")}
        style={{ marginLeft: depth ? 8 : 0 }}
      >
        <div
          className={[
            "group flex items-center gap-1.5 rounded transition",
            isFolderDropTarget ? "bg-leaf-100 ring-1 ring-leaf-300" : "",
          ].join(" ")}
          data-drop-folder-id={folder.id}
          data-drop-folder-project-id={folder.projectId}
        >
          <button
            aria-label={`${folderExpanded ? "Collapse" : "Expand"} folder ${folder.name}`}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            title={`${folderExpanded ? "Collapse" : "Expand"} folder`}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => toggleFolder(folder.id)}
          >
            {folderExpanded ? (
              <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            )}
          </button>
          {inlineRename?.type === "folder" && inlineRename.id === folder.id ? (
            <div className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-md ${SIDEBAR_ITEM_PADDING_CLASS}`}>
              <Folder aria-hidden="true" className={["h-3.5 w-3.5 shrink-0", folderIconClass].filter(Boolean).join(" ")} />
              <input
                autoFocus
                className="min-w-0 flex-1 rounded bg-white px-0.5 text-xs font-semibold uppercase leading-4 tracking-wide outline-none ring-1 ring-inset ring-leaf-400"
                value={inlineRename.value}
                onPointerDown={(e) => e.stopPropagation()}
                onChange={(e) => handleRenameChange(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={handleRenameBlur}
              />
            </div>
          ) : (
            <button
              className={[
                `flex min-w-0 flex-1 items-center gap-1.5 break-words rounded-md ${SIDEBAR_ITEM_PADDING_CLASS} text-left text-xs font-semibold uppercase leading-4 tracking-wide transition`,
                selectedSidebarType === "folder" && selectedSidebarId === folder.id
                  ? "bg-leaf-50 text-leaf-700"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
              ].join(" ")}
              type="button"
              onPointerDown={(e) => handleItemPointerDown(e, "folder", folder.id, folder.name)}
              onDoubleClick={() => startRename("folder", folder.id, folder.name)}
              onClick={() => {
                setSelectedSidebarId(folder.id);
                setSelectedSidebarType("folder");
                if (!expandedFolderSet.has(folder.id)) {
                  setExpandedFolderIds((current) => [...current, folder.id]);
                }
              }}
            >
              <Folder aria-hidden="true" className={["h-3.5 w-3.5 shrink-0", folderIconClass].filter(Boolean).join(" ")} />
              <span className="min-w-0">{folder.name}</span>
            </button>
          )}
          <div className="flex shrink-0 items-center gap-1">
            {actionMenu(
              `folder-${folder.id}`,
              `Folder actions for ${folder.name}`,
              <>
                {menuActionButton("New Page Here", <FilePlus aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                  promptPage(projectId, folder.id);
                })}
                {menuActionButton("New Subfolder", <FolderPlus aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                  promptFolder(projectId, folder.id);
                })}
                {menuActionButton("Duplicate", <Copy aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                  onDuplicateFolder(folder.id);
                })}
                {menuActionButton("Move to...", <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                  promptMoveFolder(folder);
                })}
                {menuActionButton("Rename", <Pencil aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                  startRename("folder", folder.id, folder.name);
                })}
                {menuActionButton(
                  "Delete",
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />,
                  () => {
                    const shouldDelete = window.confirm(
                      `Delete folder "${folder.name}"? This will remove all nested folders and pages inside it.`,
                    );
                    if (shouldDelete) {
                      onDeleteFolder(folder.id);
                    }
                  },
                  "danger",
                )}
                {colorPicker(folder.color, (color) => onColorFolder(folder.id, color))}
              </>,
            )}
          </div>
        </div>

        {folderExpanded ? (
          <div className="mt-1 space-y-1">
            {childFolders.map((childFolder) => renderFolder(projectId, childFolder, depth + 1))}
            {pages.map((page) => (
              <div
                key={page.id}
                className={dragState?.type === "page" && dragState.id === page.id ? "opacity-40" : ""}
                onPointerDown={(e) => handleItemPointerDown(e, "page", page.id, page.title || "Untitled")}
              >
                <PageButton
                  isActive={page.id === activePageId}
                  actions={pageActions(page, "project-tree")}
                  page={page}
                  compact
                  onClick={() => {
                    setSelectedSidebarId(null);
                    setSelectedSidebarType(null);
                    onSelectPage(page.id);
                  }}
                  onDoubleClickTitle={() => startRename("page", page.id, page.title || "Untitled")}
                  isRenaming={inlineRename?.type === "page" && inlineRename.id === page.id}
                  renameValue={inlineRename?.type === "page" && inlineRename.id === page.id ? inlineRename.value : undefined}
                  onRenameChange={handleRenameChange}
                  onRenameKeyDown={handleRenameKeyDown}
                  onRenameBlur={handleRenameBlur}
                />
              </div>
            ))}
            {!hasChildren ? <p className="px-2 py-1 text-xs text-slate-400">No pages yet.</p> : null}
          </div>
        ) : null}
      </div>
    );
  }

  const creationContextLabel: string = (() => {
    if (selectedSidebarType === "folder" && selectedSidebarId) {
      const folder = data.folders.find((f) => f.id === selectedSidebarId);
      return folder ? `in "${folder.name}"` : "";
    }
    if (selectedSidebarType === "project" && selectedSidebarId) {
      const project = data.projects.find((p) => p.id === selectedSidebarId);
      return project ? `in "${project.name}"` : "";
    }
    const activePage = data.pages.find((p) => p.id === activePageId);
    if (activePage) {
      if (activePage.folderId) {
        const folder = data.folders.find((f) => f.id === activePage.folderId);
        return folder ? `in "${folder.name}"` : "";
      }
      const project = data.projects.find((p) => p.id === activePage.projectId);
      return project ? `in "${project.name}"` : "";
    }
    return "";
  })();

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

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-4" data-sidebar-action-menu="true">
          <div className="relative">
            <button
              aria-expanded={openActionMenuId === "new-item"}
              aria-label="Create new page or folder"
              className="flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpenActionMenuId((current) => (current === "new-item" ? null : "new-item"));
              }}
            >
              <Plus aria-hidden="true" className="h-4 w-4 text-leaf-600" />
              New...
            </button>
            {openActionMenuId === "new-item" ? (
              <div className="absolute left-0 top-10 z-30 grid min-w-44 gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-soft">
                {creationContextLabel ? (
                  <div className="truncate border-b border-slate-100 px-2 pb-1 pt-0.5 text-[10px] text-slate-400">
                    {creationContextLabel}
                  </div>
                ) : null}
                {menuActionButton("New Page", <FilePlus aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                  const ctx = getCreationContext();
                  if (!ctx) {
                    window.alert("Create a project first.");
                    return;
                  }
                  promptPage(ctx.projectId, ctx.folderId ?? undefined);
                })}
                {menuActionButton("New Folder", <FolderPlus aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                  const ctx = getCreationContext();
                  if (!ctx) {
                    window.alert("Create a project first.");
                    return;
                  }
                  promptFolder(ctx.projectId, ctx.folderId ?? undefined);
                })}
              </div>
            ) : null}
          </div>
        </div>

        {searchQuery.trim() ? (
          <section className="mb-3">
            <div className="mb-1 flex items-center justify-between px-1">
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
                    onClick={() => {
                  setSelectedSidebarId(null);
                  setSelectedSidebarType(null);
                  onSelectPage(page.id);
                }}
                    onDoubleClickTitle={() => startRename("page", page.id, page.title || "Untitled")}
                    isRenaming={inlineRename?.type === "page" && inlineRename.id === page.id}
                    renameValue={inlineRename?.type === "page" && inlineRename.id === page.id ? inlineRename.value : undefined}
                    onRenameChange={handleRenameChange}
                    onRenameKeyDown={handleRenameKeyDown}
                    onRenameBlur={handleRenameBlur}
                  />
                ))}
              </div>
            ) : (
              <p className="px-2 text-sm text-slate-500">No pages match this search.</p>
            )}
          </section>
        ) : null}

        <section className="mb-3">
          <div className="mb-1 flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Profiles</h2>
            <button
              aria-label="Create profile"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-leaf-700 hover:bg-leaf-50"
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

        <section className="mb-3">
          <div className="mb-1 flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Projects</h2>
            <button
              aria-label="Create project"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-leaf-700 hover:bg-leaf-50"
              title="Create project"
              type="button"
              onClick={promptProject}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {data.projects.map((project) => {
              const folders = data.folders.filter(
                (folder) => folder.projectId === project.id && !folder.parentFolderId,
              );
              const isExpanded = expandedProjectSet.has(project.id);

              const isProjectRootDropTarget =
                visualDropTarget?.type === "project-root" && visualDropTarget.projectId === project.id;
              const projectTextClass = project.color ? SIDEBAR_COLOR_TEXT[project.color] : "text-slate-800";

              return (
                <div key={project.id} className="rounded-md border border-slate-200 bg-white p-1.5">
                  <div
                    className={[
                      "group flex items-center gap-1.5 rounded transition",
                      isProjectRootDropTarget ? "bg-leaf-100 ring-1 ring-leaf-300" : "",
                    ].join(" ")}
                    data-drop-root-project-id={project.id}
                  >
                    <button
                      aria-label={`${isExpanded ? "Collapse" : "Expand"} project ${project.name}`}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      title={`${isExpanded ? "Collapse" : "Expand"} project`}
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => toggleProject(project.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <ChevronRight aria-hidden="true" className="h-4 w-4" />
                      )}
                    </button>
                    {inlineRename?.type === "project" && inlineRename.id === project.id ? (
                      <input
                        autoFocus
                        className={`min-w-0 flex-1 rounded-md bg-white ${SIDEBAR_ITEM_PADDING_CLASS} text-sm font-semibold leading-5 outline-none ring-1 ring-inset ring-leaf-400`}
                        value={inlineRename.value}
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) => handleRenameChange(e.target.value)}
                        onKeyDown={handleRenameKeyDown}
                        onBlur={handleRenameBlur}
                      />
                    ) : (
                      <button
                        className={[
                          `min-w-0 flex-1 break-words rounded-md ${SIDEBAR_ITEM_PADDING_CLASS} text-left text-sm font-semibold leading-5 transition`,
                          selectedSidebarType === "project" && selectedSidebarId === project.id
                            ? "bg-leaf-50 text-leaf-700"
                            : `${projectTextClass} hover:bg-slate-100 hover:text-slate-600`,
                        ].join(" ")}
                        type="button"
                        onDoubleClick={() => startRename("project", project.id, project.name)}
                        onClick={() => {
                          setSelectedSidebarId(project.id);
                          setSelectedSidebarType("project");
                          if (!expandedProjectSet.has(project.id)) {
                            setExpandedProjectIds((current) => [...current, project.id]);
                          }
                        }}
                      >
                        {project.name}
                      </button>
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                      {actionMenu(
                        `project-${project.id}`,
                        `Project actions for ${project.name}`,
                        <>
                          {menuActionButton("New Folder", <FolderPlus aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                            promptFolder(project.id);
                          })}
                          {menuActionButton("Duplicate", <Copy aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                            onDuplicateProject(project.id);
                          })}
                          {menuActionButton("Rename", <Pencil aria-hidden="true" className="h-3.5 w-3.5" />, () => {
                            startRename("project", project.id, project.name);
                          })}
                          {menuActionButton(
                            "Delete",
                            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />,
                            () => {
                              const shouldDelete = window.confirm(
                                `Delete project "${project.name}"? This will remove all folders and pages inside the project.`,
                              );
                              if (shouldDelete) {
                                onDeleteProject(project.id);
                              }
                            },
                            "danger",
                          )}
                          {colorPicker(project.color, (color) => onColorProject(project.id, color))}
                        </>,
                      )}
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="mt-1 space-y-1">
                      {data.pages
                        .filter((page) => page.projectId === project.id && !page.folderId)
                        .map((page) => (
                          <div
                            key={page.id}
                            className={dragState?.type === "page" && dragState.id === page.id ? "opacity-40" : ""}
                            onPointerDown={(e) => handleItemPointerDown(e, "page", page.id, page.title || "Untitled")}
                          >
                            <PageButton
                              isActive={page.id === activePageId}
                              actions={pageActions(page, "project-tree")}
                              page={page}
                              compact
                              onClick={() => {
                                setSelectedSidebarId(null);
                                setSelectedSidebarType(null);
                                onSelectPage(page.id);
                              }}
                              onDoubleClickTitle={() => startRename("page", page.id, page.title || "Untitled")}
                              isRenaming={inlineRename?.type === "page" && inlineRename.id === page.id}
                              renameValue={inlineRename?.type === "page" && inlineRename.id === page.id ? inlineRename.value : undefined}
                              onRenameChange={handleRenameChange}
                              onRenameKeyDown={handleRenameKeyDown}
                              onRenameBlur={handleRenameBlur}
                            />
                          </div>
                        ))}
                      {folders.map((folder) => renderFolder(project.id, folder))}
                      {!folders.length && !data.pages.some((page) => page.projectId === project.id && !page.folderId) ? (
                        <p className="px-2 py-1 text-xs text-slate-400">No pages yet.</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-3">
          <div className="mb-1 flex items-center justify-between px-1">
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
                    onClick={() => {
                  setSelectedSidebarId(null);
                  setSelectedSidebarType(null);
                  onSelectPage(page.id);
                }}
                    onDoubleClickTitle={() => startRename("page", page.id, page.title || "Untitled")}
                    isRenaming={inlineRename?.type === "page" && inlineRename.id === page.id}
                    renameValue={inlineRename?.type === "page" && inlineRename.id === page.id ? inlineRename.value : undefined}
                    onRenameChange={handleRenameChange}
                    onRenameKeyDown={handleRenameKeyDown}
                    onRenameBlur={handleRenameBlur}
                  />
                ))}
            </div>
          ) : (
            <p className="px-2 text-sm text-slate-500">No favorites yet.</p>
          )}
        </section>
      </div>

      {isAuthConfigured && !authLoading && (
        <div className="shrink-0 border-t border-slate-100 px-4 py-3">
          {authUser ? (
            <div className="flex items-center gap-2">
              <UserCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{authUser.email}</span>
              {syncStatus !== undefined && (
                <SyncStatusBadge
                  lastError={lastSyncError}
                  lastSyncedAt={lastSyncedAt}
                  status={syncStatus}
                  onSyncNow={onSyncNow}
                />
              )}
              <button
                className="shrink-0 text-slate-400 hover:text-slate-600"
                title="Sign out"
                type="button"
                onClick={() => onSignOut?.()}
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only">Sign out</span>
              </button>
            </div>
          ) : (
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              type="button"
              onClick={() => { setAuthMode("signIn"); setAuthError(null); setAuthModalOpen(true); }}
            >
              <LogIn aria-hidden="true" className="h-3.5 w-3.5" />
              Sign in to sync
            </button>
          )}
        </div>
      )}

      {authModalOpen && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          onClick={(e) => { if (e.target === e.currentTarget) setAuthModalOpen(false); }}
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">
                {authMode === "signIn" ? "Sign in" : "Create account"}
              </h2>
              <button
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600"
                type="button"
                onClick={() => setAuthModalOpen(false)}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAuthSubmit}>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="auth-email">
                    Email
                  </label>
                  <input
                    autoComplete="email"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100"
                    id="auth-email"
                    required
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="auth-password">
                    Password
                  </label>
                  <input
                    autoComplete={authMode === "signIn" ? "current-password" : "new-password"}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100"
                    id="auth-password"
                    minLength={6}
                    required
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                  />
                </div>
                {authError ? (
                  <p className="text-sm text-red-600">{authError}</p>
                ) : null}
                <button
                  className="w-full rounded-md bg-leaf-600 px-4 py-2 text-sm font-medium text-white hover:bg-leaf-700 disabled:opacity-60"
                  disabled={authSubmitting}
                  type="submit"
                >
                  {authSubmitting ? "…" : authMode === "signIn" ? "Sign in" : "Create account"}
                </button>
              </div>
            </form>
            <p className="mt-4 text-center text-xs text-slate-500">
              {authMode === "signIn" ? (
                <>
                  No account?{" "}
                  <button
                    className="text-leaf-600 hover:underline"
                    type="button"
                    onClick={() => { setAuthMode("signUp"); setAuthError(null); }}
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Have an account?{" "}
                  <button
                    className="text-leaf-600 hover:underline"
                    type="button"
                    onClick={() => { setAuthMode("signIn"); setAuthError(null); }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {dragState ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 max-w-[200px] truncate rounded-md border border-leaf-400 bg-leaf-50 px-2 py-1 text-xs font-medium text-leaf-700 shadow-md"
          style={{ left: dragState.x + 14, top: dragState.y + 14 }}
        >
          {dragState.label}
        </div>
      ) : null}
    </aside>
  );
}
