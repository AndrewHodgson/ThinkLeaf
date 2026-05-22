"use client";

import { useEffect, useRef, useState } from "react";
import type { CanvasTool, Page, WorkspaceData } from "@/types/workspace";
import { findFolder, findProject, toDateInputValue } from "@/lib/workspaceUtils";
import {
  defaultCanvasViewState,
  documentBlockX,
  documentBlockWidth,
  documentBlockY,
  virtualBoardHeight,
  virtualBoardWidth,
} from "@/lib/canvasStyle";
import { TagEditor } from "@/components/workspace/TagEditor";
import { RichTextEditor } from "@/components/workspace/RichTextEditor";
import { Calendar, Clock3, Star, Trash2 } from "lucide-react";
import { CanvasLayer } from "@/components/workspace/CanvasLayer";
import { CanvasCreationToolbar } from "@/components/workspace/CanvasCreationToolbar";
import { ObjectPropertiesPanel } from "@/components/workspace/ObjectPropertiesPanel";

type BoardPanInteraction = {
  pointerX: number;
  pointerY: number;
  startPanX: number;
  startPanY: number;
};

type WorkspaceProps = {
  activeTool: CanvasTool;
  activePage?: Page;
  data: WorkspaceData;
  isGridVisible: boolean;
  isSnapToGridEnabled: boolean;
  selectedObjectId: string | null;
  onDeletePage: (pageId: string) => void;
  onSearchByTag: (tag: string) => void;
  onSelectionChange: (objectId: string | null) => void;
  onToggleGrid: () => void;
  onToggleSnapToGrid: () => void;
  onToolChange: (tool: CanvasTool) => void;
  onUpdatePage: (
    pageId: string,
    updates: Partial<
      Pick<Page, "title" | "body" | "noteDate" | "canvasViewState" | "canvasObjects" | "tags" | "isFavorite">
    >,
  ) => void;
};

export function Workspace({
  activeTool,
  activePage,
  data,
  isGridVisible,
  isSnapToGridEnabled,
  selectedObjectId,
  onDeletePage,
  onSearchByTag,
  onSelectionChange,
  onToggleGrid,
  onToggleSnapToGrid,
  onToolChange,
  onUpdatePage,
}: WorkspaceProps) {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const panInteractionRef = useRef<BoardPanInteraction | null>(null);
  const capturedPanPointerIdRef = useRef<number | null>(null);
  const [boardPanInteraction, setBoardPanInteraction] = useState<BoardPanInteraction | null>(null);

  useEffect(() => {
    onSelectionChange(null);
  }, [activePage?.id, onSelectionChange]);

  useEffect(() => {
    releaseWorkspacePan();
  }, [activeTool, activePage?.id]);

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
  const canvasViewState = page.canvasViewState ?? defaultCanvasViewState;
  const isPanning = boardPanInteraction !== null;

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

  function isPanBlockedTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest(
        "button, input, textarea, select, [contenteditable='true'], [data-pan-block='true']",
      ),
    );
  }

  function handleWorkspacePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (activeTool === "Select" && event.button === 0 && !isPanBlockedTarget(event.target)) {
      onSelectionChange(null);
      return;
    }

    if (activeTool !== "Pan" || event.button !== 0 || isPanBlockedTarget(event.target)) {
      return;
    }

    event.preventDefault();
    releaseWorkspacePan();
    onSelectionChange(null);
    const interaction = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startPanX: canvasViewState.panX,
      startPanY: canvasViewState.panY,
    };

    panInteractionRef.current = interaction;
    capturedPanPointerIdRef.current = event.pointerId;
    setBoardPanInteraction({
      pointerX: event.clientX,
      pointerY: event.clientY,
      startPanX: canvasViewState.panX,
      startPanY: canvasViewState.panY,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleWorkspacePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const interaction = panInteractionRef.current;
    if (!interaction) {
      return;
    }

    onUpdatePage(page.id, {
      canvasViewState: {
        ...canvasViewState,
        panX: interaction.startPanX + event.clientX - interaction.pointerX,
        panY: interaction.startPanY + event.clientY - interaction.pointerY,
      },
    });
  }

  function releaseWorkspacePan(pointerId = capturedPanPointerIdRef.current) {
    const workspace = workspaceRef.current;
    if (workspace && pointerId !== null && workspace.hasPointerCapture(pointerId)) {
      workspace.releasePointerCapture(pointerId);
    }

    panInteractionRef.current = null;
    capturedPanPointerIdRef.current = null;
    setBoardPanInteraction(null);
  }

  function stopWorkspacePan(event: React.PointerEvent<HTMLDivElement>) {
    releaseWorkspacePan(event.pointerId);
  }

  return (
    <div
      ref={workspaceRef}
      className={[
        "relative min-h-0 flex-1 overflow-hidden bg-white",
        isGridVisible ? "dotted-grid" : "",
        activeTool === "Pan" ? "cursor-grab" : "",
        isPanning ? "cursor-grabbing" : "",
      ].join(" ")}
      onPointerCancel={stopWorkspacePan}
      onPointerDown={handleWorkspacePointerDown}
      onLostPointerCapture={() => releaseWorkspacePan()}
      onPointerMove={handleWorkspacePointerMove}
      onPointerUp={stopWorkspacePan}
      style={
        isGridVisible
          ? {
              backgroundPosition: `${canvasViewState.panX}px ${canvasViewState.panY}px`,
              backgroundSize: `${22 * canvasViewState.zoom}px ${22 * canvasViewState.zoom}px`,
            }
          : undefined
      }
    >
      <div
        className="relative origin-top-left"
        style={{
          height: virtualBoardHeight,
          transform: `translate3d(${canvasViewState.panX}px, ${canvasViewState.panY}px, 0) scale(${canvasViewState.zoom})`,
          width: virtualBoardWidth,
        }}
      >
        <CanvasLayer
          key={page.id}
          activeTool={activeTool}
          isSnapToGridEnabled={isSnapToGridEnabled}
          objects={page.canvasObjects}
          viewState={canvasViewState}
          selectedObjectId={selectedObjectId}
          onChange={(canvasObjects) => onUpdatePage(page.id, { canvasObjects })}
          onViewStateChange={(viewState) => onUpdatePage(page.id, { canvasViewState: viewState })}
          onSelectionChange={onSelectionChange}
        />
        <article
          className="absolute z-10 min-h-[760px] w-[780px] cursor-auto rounded-md border border-slate-200 bg-white shadow-soft"
          data-pan-block="true"
          style={{ left: documentBlockX, top: documentBlockY, width: documentBlockWidth }}
        >
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
      </div>

      {selectedObject ? (
        <div className="absolute right-6 top-6 z-10" data-pan-block="true">
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
        </div>
      ) : null}

      <CanvasCreationToolbar
        activeTool={activeTool}
        isGridVisible={isGridVisible}
        isSnapToGridEnabled={isSnapToGridEnabled}
        onToggleGrid={onToggleGrid}
        onToggleSnapToGrid={onToggleSnapToGrid}
        onToolChange={onToolChange}
      />
    </div>
  );
}
