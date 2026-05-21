"use client";

import { useEffect } from "react";
import type { CanvasTool, Page, WorkspaceData } from "@/types/workspace";
import { findFolder, findProject, toDateInputValue } from "@/lib/workspaceUtils";
import { TagEditor } from "@/components/workspace/TagEditor";
import { RichTextEditor } from "@/components/workspace/RichTextEditor";
import { Calendar, Clock3, Star, Trash2 } from "lucide-react";
import { CanvasLayer } from "@/components/workspace/CanvasLayer";
import { CanvasCreationToolbar } from "@/components/workspace/CanvasCreationToolbar";
import { ObjectPropertiesPanel } from "@/components/workspace/ObjectPropertiesPanel";

type WorkspaceProps = {
  activeTool: CanvasTool;
  activePage?: Page;
  data: WorkspaceData;
  isGridVisible: boolean;
  sidebarWidth: number;
  selectedObjectId: string | null;
  onDeletePage: (pageId: string) => void;
  onSearchByTag: (tag: string) => void;
  onSelectionChange: (objectId: string | null) => void;
  onToggleGrid: () => void;
  onToolChange: (tool: CanvasTool) => void;
  onUpdatePage: (
    pageId: string,
    updates: Partial<Pick<Page, "title" | "body" | "noteDate" | "canvasObjects" | "tags" | "isFavorite">>,
  ) => void;
};

export function Workspace({
  activeTool,
  activePage,
  data,
  isGridVisible,
  sidebarWidth,
  selectedObjectId,
  onDeletePage,
  onSearchByTag,
  onSelectionChange,
  onToggleGrid,
  onToolChange,
  onUpdatePage,
}: WorkspaceProps) {
  useEffect(() => {
    onSelectionChange(null);
  }, [activePage?.id, onSelectionChange]);

  if (!activePage) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white text-slate-500">
        Create a project, folder, and page to start taking notes.
      </div>
    );
  }

  const page = activePage;
  const project = findProject(data, page.projectId);
  const folder = findFolder(data, page.folderId);
  const selectedObject = page.canvasObjects.find((object) => object.id === selectedObjectId) ?? null;
  const propertiesPanelWidth = selectedObject ? 300 : 0;

  function confirmDelete() {
    const shouldDelete = window.confirm(`Delete "${page.title || "Untitled"}"?`);
    if (shouldDelete) {
      onDeletePage(page.id);
    }
  }

  function updateSelectedObject(updates: Partial<NonNullable<typeof selectedObject>>) {
    if (!selectedObject) {
      return;
    }

    onUpdatePage(page.id, {
      canvasObjects: page.canvasObjects.map((object) =>
        object.id === selectedObject.id
          ? {
              ...object,
              ...updates,
            }
          : object,
      ),
    });
  }

  return (
    <div className={["min-h-0 flex-1 overflow-auto bg-white", isGridVisible ? "dotted-grid" : ""].join(" ")}>
      <div className="flex min-h-full min-w-[1500px] items-start gap-10 px-12 py-10">
        <article className="min-h-[760px] w-[780px] shrink-0 rounded-md border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-100 px-9 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 text-sm text-slate-500">
                <span className="font-medium text-slate-700">{project?.name ?? "Project"}</span>
                <span className="mx-2 text-slate-300">/</span>
                <span>{folder?.name ?? "Folder"}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  aria-label={page.isFavorite ? "Remove from favorites" : "Add to favorites"}
                  className={[
                    "inline-flex h-9 w-9 items-center justify-center rounded-md border",
                    page.isFavorite
                      ? "border-leaf-200 bg-leaf-50 text-leaf-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                  title={page.isFavorite ? "Remove from favorites" : "Add to favorites"}
                  type="button"
                  onClick={() => onUpdatePage(page.id, { isFavorite: !page.isFavorite })}
                >
                  <Star
                    aria-hidden="true"
                    className={["h-4 w-4", page.isFavorite ? "fill-leaf-500" : ""].join(" ")}
                  />
                </button>
                <button
                  aria-label="Delete page"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-100 bg-white text-rose-600 hover:bg-rose-50"
                  title="Delete page"
                  type="button"
                  onClick={confirmDelete}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>

            <input
              className="mt-5 w-full border-none bg-transparent text-3xl font-semibold tracking-normal text-slate-950 outline-none placeholder:text-slate-300"
              placeholder="Untitled meeting note"
              value={page.title}
              onChange={(event) => onUpdatePage(page.id, { title: event.target.value })}
            />

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
              <label className="inline-flex items-center gap-1.5">
                <Calendar aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                <span>Note Date:</span>
                <input
                  className="w-[112px] border-none bg-transparent font-medium text-slate-700 outline-none"
                  type="date"
                  value={page.noteDate}
                  onChange={(event) => onUpdatePage(page.id, { noteDate: event.target.value })}
                />
              </label>
              <span className="text-slate-300">-</span>
              <div className="inline-flex items-center gap-1.5">
                <Clock3 aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                <span>Updated:</span>
                <span className="font-medium text-slate-700">{toDateInputValue(page.updatedAt)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-slate-100 bg-white px-3 py-2">
              <TagEditor
                tags={page.tags}
                onChange={(tags) => onUpdatePage(page.id, { tags })}
                onSearchByTag={onSearchByTag}
              />
            </div>
          </div>

          <div className="px-9 py-7">
            <RichTextEditor
              key={page.id}
              content={page.body}
              pageId={page.id}
              onChange={(body) => onUpdatePage(page.id, { body })}
            />
          </div>
        </article>

        <div className="relative min-w-0 flex-1">
          <CanvasLayer
            key={page.id}
            activeTool={activeTool}
            objects={page.canvasObjects}
            selectedObjectId={selectedObjectId}
            onChange={(canvasObjects) => onUpdatePage(page.id, { canvasObjects })}
            onSelectionChange={onSelectionChange}
          />
          <CanvasCreationToolbar
            activeTool={activeTool}
            centerOffsetPx={Math.round((sidebarWidth - propertiesPanelWidth) / 2)}
            isGridVisible={isGridVisible}
            onToggleGrid={onToggleGrid}
            onToolChange={onToolChange}
          />
        </div>

        {selectedObject ? (
          <ObjectPropertiesPanel
            key={selectedObject.id}
            object={selectedObject}
            onDelete={() => {
              onUpdatePage(page.id, {
                canvasObjects: page.canvasObjects.filter((object) => object.id !== selectedObject.id),
              });
              onSelectionChange(null);
            }}
            onUpdate={(updates) => updateSelectedObject(updates)}
          />
        ) : null}
      </div>
    </div>
  );
}
