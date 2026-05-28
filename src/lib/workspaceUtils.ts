import type { Folder, Page, Project, WorkspaceData } from "@/types/workspace";
import { htmlToSearchText } from "@/lib/editorContent";

export const defaultProfileId = "profile-work";
export const defaultProfileName = "Personal";

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function timestamp() {
  return new Date().toISOString();
}

export function toDateInputValue(value?: string) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function findProject(data: WorkspaceData, projectId: string): Project | undefined {
  return data.projects.find((project) => project.id === projectId);
}

export function findFolder(data: WorkspaceData, folderId: string): Folder | undefined {
  return data.folders.find((folder) => folder.id === folderId);
}

export function sortPagesByUpdatedAt(pages: Page[]) {
  return [...pages].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function searchPages(pages: Page[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return sortPagesByUpdatedAt(
    pages.filter((page) => {
      const searchable = `${page.title} ${htmlToSearchText(page.body)} ${page.tags.join(" ")}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    }),
  );
}
