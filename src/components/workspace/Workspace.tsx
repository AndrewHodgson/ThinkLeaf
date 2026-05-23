"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type {
  CanvasHistoryOptions,
  CanvasCreationToolDefaults,
  CanvasCreationDefaultStyle,
  CanvasObject,
  CanvasPenSettings,
  CanvasTool,
  Page,
  WorkspaceData,
} from "@/types/workspace";
import { createId, findFolder, findProject, timestamp, toDateInputValue } from "@/lib/workspaceUtils";
import {
  defaultCanvasViewState,
  defaultCanvasStyle,
  documentBlockX,
  documentBlockWidth,
  documentBlockY,
  objectCanvasOriginX,
  objectCanvasOriginY,
  snapToGrid,
  virtualBoardHeight,
  virtualBoardWidth,
  maxZoom,
  minZoom,
  zoomStep,
} from "@/lib/canvasStyle";
import { TagEditor } from "@/components/workspace/TagEditor";
import { RichTextEditor, type FormattingTarget } from "@/components/workspace/RichTextEditor";
import { Calendar, Clock3, Star, Trash2 } from "lucide-react";
import { CanvasLayer } from "@/components/workspace/CanvasLayer";
import { CanvasCreationToolbar } from "@/components/workspace/CanvasCreationToolbar";
import {
  CanvasObjectToolbar,
  CanvasToolDefaultsToolbar,
  PenToolToolbar,
} from "@/components/workspace/CanvasObjectToolbar";
import { getImageFilesFromClipboard, type ProcessedImage, processImageFile } from "@/lib/imageUtils";

type BoardPanInteraction = {
  pointerX: number;
  pointerY: number;
  startPanX: number;
  startPanY: number;
};

type WorkspaceProps = {
  activeTool: CanvasTool;
  activePage?: Page;
  canRedoCanvas: boolean;
  canUndoCanvas: boolean;
  creationToolDefaults: CanvasCreationToolDefaults;
  data: WorkspaceData;
  imageImportRequestId: number;
  isGridVisible: boolean;
  isSnapToGridEnabled: boolean;
  selectedObjectId: string | null;
  onCreationToolDefaultsChange: (defaults: CanvasCreationToolDefaults) => void;
  onDeletePage: (pageId: string) => void;
  onPenSettingsChange: Dispatch<SetStateAction<CanvasPenSettings>>;
  onRedoCanvas: () => void;
  onResetView: () => void;
  onSearchByTag: (tag: string) => void;
  onSelectionChange: (objectId: string | null) => void;
  onToggleGrid: () => void;
  onToggleSnapToGrid: () => void;
  onToolChange: (tool: CanvasTool) => void;
  onUndoCanvas: () => void;
  onUpdateCanvasObjects: (pageId: string, canvasObjects: CanvasObject[], options?: CanvasHistoryOptions) => void;
  onUpdatePage: (
    pageId: string,
    updates: Partial<
      Pick<Page, "title" | "body" | "noteDate" | "canvasViewState" | "canvasObjects" | "tags" | "isFavorite">
    >,
  ) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  penSettings: CanvasPenSettings;
  zoomIndicatorTick: number;
  zoomPercent: number;
};

export function Workspace({
  activeTool,
  activePage,
  canRedoCanvas,
  canUndoCanvas,
  creationToolDefaults,
  data,
  imageImportRequestId,
  isGridVisible,
  isSnapToGridEnabled,
  selectedObjectId,
  onCreationToolDefaultsChange,
  onDeletePage,
  onPenSettingsChange,
  onRedoCanvas,
  onResetView,
  onSearchByTag,
  onSelectionChange,
  onToggleGrid,
  onToggleSnapToGrid,
  onToolChange,
  onUndoCanvas,
  onUpdateCanvasObjects,
  onUpdatePage,
  onZoomIn,
  onZoomOut,
  penSettings,
  zoomIndicatorTick,
  zoomPercent,
}: WorkspaceProps) {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const canvasImageInputRef = useRef<HTMLInputElement>(null);
  const panInteractionRef = useRef<BoardPanInteraction | null>(null);
  const capturedPanPointerIdRef = useRef<number | null>(null);
  const [boardPanInteraction, setBoardPanInteraction] = useState<BoardPanInteraction | null>(null);
  const [documentToolbarElement, setDocumentToolbarElement] = useState<HTMLDivElement | null>(null);
  const [isZoomIndicatorVisible, setIsZoomIndicatorVisible] = useState(false);

  useEffect(() => {
    onSelectionChange(null);
  }, [activePage?.id, onSelectionChange]);

  useEffect(() => {
    releaseWorkspacePan();
  }, [activeTool, activePage?.id]);

  useEffect(() => {
    if (imageImportRequestId > 0) {
      canvasImageInputRef.current?.click();
    }
  }, [imageImportRequestId]);

  useEffect(() => {
    if (zoomIndicatorTick <= 0) {
      return;
    }

    setIsZoomIndicatorVisible(true);
    const timeout = window.setTimeout(() => {
      setIsZoomIndicatorVisible(false);
    }, 1200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [zoomIndicatorTick]);

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
  const selectedWhiteboardTextObject = selectedObject && isCanvasTextObject(selectedObject) ? selectedObject : null;
  const formattingTarget: FormattingTarget = selectedWhiteboardTextObject
    ? "whiteboardText"
    : selectedObject
    ? "none"
    : "document";
  const canvasViewState = page.canvasViewState ?? defaultCanvasViewState;
  const isPanning = boardPanInteraction !== null;
  const activeCreationDefaultType = getCreationDefaultType(activeTool);
  const isSelectedPenStroke = selectedObject?.type === "penStroke";
  const shouldShowActivePenDefaults = activeTool === "Pen" && (!selectedObject || isSelectedPenStroke);
  const toolbarExtraContent = shouldShowActivePenDefaults ? (
    <PenToolToolbar penSettings={penSettings} onChange={onPenSettingsChange} />
  ) : selectedObject ? (
    <CanvasObjectToolbar
      object={selectedObject}
      onDelete={deleteSelectedObject}
      onDuplicate={duplicateSelectedObject}
      onUpdate={updateSelectedObject}
    />
  ) : activeCreationDefaultType ? (
    <CanvasToolDefaultsToolbar
      defaults={creationToolDefaults[activeCreationDefaultType]}
      tool={activeTool}
      onUpdate={(updates) => updateCreationToolDefaults(activeCreationDefaultType, updates)}
    />
  ) : null;

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

    onUpdateCanvasObjects(
      page.id,
      page.canvasObjects.map((object) =>
        object.id === selectedObject.id
          ? {
              ...object,
              ...updates,
            }
          : object,
      ),
    );
  }

  function duplicateSelectedObject() {
    if (!selectedObject) {
      return;
    }

    const now = timestamp();
    const offset = isSnapToGridEnabled ? snapToGrid(24) : 24;
    const duplicatedObject: CanvasObject = {
      ...selectedObject,
      id: createId("object"),
      x: selectedObject.x + offset,
      y: selectedObject.y + offset,
      x1: selectedObject.x1 === undefined ? undefined : selectedObject.x1 + offset,
      y1: selectedObject.y1 === undefined ? undefined : selectedObject.y1 + offset,
      x2: selectedObject.x2 === undefined ? undefined : selectedObject.x2 + offset,
      y2: selectedObject.y2 === undefined ? undefined : selectedObject.y2 + offset,
      createdAt: now,
      updatedAt: now,
    };

    onUpdateCanvasObjects(page.id, [...page.canvasObjects, duplicatedObject]);
    onSelectionChange(duplicatedObject.id);
  }

  function deleteSelectedObject() {
    if (!selectedObject) {
      return;
    }

    onUpdateCanvasObjects(
      page.id,
      page.canvasObjects.filter((object) => object.id !== selectedObject.id),
    );
    onSelectionChange(null);
  }

  function updateCreationToolDefaults(
    type: keyof CanvasCreationToolDefaults,
    updates: CanvasCreationDefaultStyle,
  ) {
    onCreationToolDefaultsChange({
      ...creationToolDefaults,
      [type]: {
        ...creationToolDefaults[type],
        ...updates,
      },
    });
  }

  function alignCanvasValue(value: number) {
    return isSnapToGridEnabled ? snapToGrid(value) : value;
  }

  function getVisibleCanvasInsertPoint(width: number, height: number) {
    const bounds = workspaceRef.current?.getBoundingClientRect();
    const screenX = bounds ? bounds.width / 2 : 640;
    const screenY = bounds ? bounds.height / 2 : 360;
    const x = (screenX - canvasViewState.panX) / canvasViewState.zoom - objectCanvasOriginX - width / 2;
    const y = (screenY - canvasViewState.panY) / canvasViewState.zoom - objectCanvasOriginY - height / 2;

    return {
      x: alignCanvasValue(x),
      y: alignCanvasValue(y),
    };
  }

  function createCanvasImageObject(image: ProcessedImage): CanvasObject {
    const maxDisplayDimension = 360;
    const displayScale = Math.min(1, maxDisplayDimension / Math.max(image.width, image.height));
    const width = Math.max(80, Math.round(image.width * displayScale));
    const height = Math.max(80, Math.round(image.height * displayScale));
    const position = getVisibleCanvasInsertPoint(width, height);
    const now = timestamp();

    return {
      id: createId("object"),
      type: "image",
      x: position.x,
      y: position.y,
      width: alignCanvasValue(width),
      height: alignCanvasValue(height),
      imageDataUrl: image.dataUrl,
      ...defaultCanvasStyle,
      fillColor: "transparent",
      strokeColor: "transparent",
      strokeWidth: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  async function importCanvasImageFiles(files: File[]) {
    if (!files.length) {
      return;
    }

    try {
      const importedObjects: CanvasObject[] = [];

      for (const file of files) {
        const image = await processImageFile(file);
        importedObjects.push(createCanvasImageObject(image));
      }

      if (!importedObjects.length) {
        return;
      }

      onUpdateCanvasObjects(page.id, [...page.canvasObjects, ...importedObjects]);
      onSelectionChange(importedObjects[importedObjects.length - 1].id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not import that image.");
    }
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

  function isWheelBlockedTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest(
        "button, input, textarea, select, summary, option, [role='menu'], [role='listbox'], [data-wheel-block='true']",
      ),
    );
  }

  function handleWorkspacePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!isPanBlockedTarget(event.target)) {
      event.currentTarget.focus();
    }

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

  function handleWorkspacePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    if (isPanBlockedTarget(event.target)) {
      return;
    }

    const files = getImageFilesFromClipboard(event);
    if (!files.length) {
      return;
    }

    event.preventDefault();
    void importCanvasImageFiles(files);
  }

  function handleWorkspaceWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (isWheelBlockedTarget(event.target)) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();

      const direction = event.deltaY > 0 ? -1 : 1;
      const nextZoom = Math.min(maxZoom, Math.max(minZoom, canvasViewState.zoom + direction * zoomStep));
      onUpdatePage(page.id, {
        canvasViewState: {
          ...canvasViewState,
          zoom: nextZoom,
        },
      });
      return;
    }

    if (event.deltaX === 0 && event.deltaY === 0) {
      return;
    }

    event.preventDefault();
    onUpdatePage(page.id, {
      canvasViewState: {
        ...canvasViewState,
        panX: canvasViewState.panX - event.deltaX,
        panY: canvasViewState.panY - event.deltaY,
      },
    });
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
      onPaste={handleWorkspacePaste}
      onWheel={handleWorkspaceWheel}
      tabIndex={0}
      style={
        isGridVisible
          ? {
              backgroundPosition: `${canvasViewState.panX}px ${canvasViewState.panY}px`,
              backgroundSize: `${22 * canvasViewState.zoom}px ${22 * canvasViewState.zoom}px`,
            }
          : undefined
      }
    >
      <div ref={setDocumentToolbarElement} className="pointer-events-none absolute left-0 right-0 top-0 z-30" />

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
          creationToolDefaults={creationToolDefaults}
          isSnapToGridEnabled={isSnapToGridEnabled}
          objects={page.canvasObjects}
          penSettings={penSettings}
          viewState={canvasViewState}
          selectedObjectId={selectedObjectId}
          onChange={(canvasObjects, options) => onUpdateCanvasObjects(page.id, canvasObjects, options)}
          onViewStateChange={(viewState) => onUpdatePage(page.id, { canvasViewState: viewState })}
          onSelectionChange={onSelectionChange}
        />
        <article
          className="absolute z-10 min-h-[760px] w-[780px] cursor-auto rounded-md border border-slate-200 bg-white shadow-soft"
          data-pan-block="true"
          onPointerDown={() => {
            if (selectedObjectId) {
              onSelectionChange(null);
            }
          }}
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
              formattingTarget={formattingTarget}
              pageId={page.id}
              toolbarExtraContent={toolbarExtraContent}
              toolbarPortalElement={documentToolbarElement}
              whiteboardTextObject={selectedWhiteboardTextObject}
              onChange={(body) => onUpdatePage(page.id, { body })}
              onFocus={() => onSelectionChange(null)}
              onWhiteboardTextUpdate={updateSelectedObject}
            />
          </div>
        </article>
      </div>

      <CanvasCreationToolbar
        activeTool={activeTool}
        canRedoCanvas={canRedoCanvas}
        canUndoCanvas={canUndoCanvas}
        isGridVisible={isGridVisible}
        isSnapToGridEnabled={isSnapToGridEnabled}
        onImageUploadClick={() => canvasImageInputRef.current?.click()}
        onRedoCanvas={onRedoCanvas}
        onResetView={onResetView}
        onToggleGrid={onToggleGrid}
        onToggleSnapToGrid={onToggleSnapToGrid}
        onToolChange={onToolChange}
        onUndoCanvas={onUndoCanvas}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />
      <div
        aria-live="polite"
        className={[
          "pointer-events-none absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-xs font-semibold text-slate-600 shadow-soft transition duration-300",
          isZoomIndicatorVisible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
        ].join(" ")}
      >
        {zoomPercent}%
      </div>
      <input
        ref={canvasImageInputRef}
        accept="image/*"
        className="hidden"
        multiple
        type="file"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void importCanvasImageFiles(files);
        }}
      />
    </div>
  );
}

function isCanvasTextObject(object: CanvasObject) {
  return object.type === "textBox" || object.text !== undefined;
}

function getCreationDefaultType(tool: CanvasTool): keyof CanvasCreationToolDefaults | null {
  const creationDefaultTypeByTool: Partial<Record<CanvasTool, keyof CanvasCreationToolDefaults>> = {
    Arrow: "arrow",
    Circle: "circle",
    Line: "line",
    Rectangle: "rectangle",
    "Text Box": "textBox",
  };

  return creationDefaultTypeByTool[tool] ?? null;
}
