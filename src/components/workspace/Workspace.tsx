"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type {
  CanvasConnectorAnchor,
  CanvasConnectorStart,
  CanvasHistoryOptions,
  CanvasCreationToolDefaults,
  CanvasCreationDefaultStyle,
  CanvasObject,
  CanvasPenSettings,
  CanvasShapeType,
  CanvasTool,
  Page,
  SidebarItemColor,
  WorkspaceData,
} from "@/types/workspace";
import { createId, timestamp, toDateInputValue } from "@/lib/workspaceUtils";
import {
  defaultCanvasViewState,
  defaultCanvasStyle,
  documentBlockX,
  documentBlockWidth,
  documentBlockY,
  gridSize,
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
import { Check, Clock3, Download, FileDown, Save, Star, Trash2, X } from "lucide-react";
import { CanvasLayer } from "@/components/workspace/CanvasLayer";
import {
  alignCanvasSize,
  alignCanvasX,
  alignCanvasY,
  removeObjectsAndConnectedLines,
  syncConnectedLines,
} from "@/components/workspace/canvas/canvasGeometry";
import {
  defaultCanvasGroupColor,
  getCanvasGroupColor,
  getCanvasGroupLabel,
  normalizeCanvasGroupMemberships,
} from "@/components/workspace/canvas/canvasGroups";
import { CanvasCreationToolbar } from "@/components/workspace/CanvasCreationToolbar";
import {
  CanvasMultiSelectionToolbar,
  CanvasObjectToolbar,
  CanvasToolDefaultsToolbar,
  PenToolToolbar,
} from "@/components/workspace/CanvasObjectToolbar";
import { exportPageAsPdf } from "@/lib/exportUtils";
import { getImageFilesFromClipboard, type ProcessedImage, processImageFile } from "@/lib/imageUtils";
import { saveAsset } from "@/lib/storageAdapter";

type BoardPanInteraction = {
  pointerX: number;
  pointerY: number;
  startPanX: number;
  startPanY: number;
};

type WorkspaceProps = {
  activeTool: CanvasTool;
  activeShapeType: CanvasShapeType;
  activePage?: Page;
  canRedoCanvas: boolean;
  canUndoCanvas: boolean;
  creationToolDefaults: CanvasCreationToolDefaults;
  data: WorkspaceData;
  imageImportRequestId: number;
  isDarkMode: boolean;
  isGridVisible: boolean;
  isFlowchartConnectorArrowEnabled: boolean;
  isSnapToGridEnabled: boolean;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  tagSuggestions: string[];
  onCreationToolDefaultsChange: (defaults: CanvasCreationToolDefaults) => void;
  onDeletePage: (pageId: string) => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onResetWorkspace: () => void;
  onPenSettingsChange: Dispatch<SetStateAction<CanvasPenSettings>>;
  onMultiSelectionChange: (objectIds: string[]) => void;
  onRedoCanvas: () => void;
  onResetView: () => void;
  onSearchByTag: (tag: string) => void;
  onSelectionChange: (objectId: string | null) => void;
  onShapeTypeChange: (shapeType: CanvasShapeType) => void;
  onToggleDarkMode: () => void;
  onToggleGrid: () => void;
  onToggleFlowchartConnectorArrow: () => void;
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
  activeShapeType,
  activePage,
  canRedoCanvas,
  canUndoCanvas,
  creationToolDefaults,
  data,
  imageImportRequestId,
  isDarkMode,
  isGridVisible,
  isFlowchartConnectorArrowEnabled,
  isSnapToGridEnabled,
  selectedObjectId,
  selectedObjectIds,
  tagSuggestions,
  onCreationToolDefaultsChange,
  onDeletePage,
  onExportBackup,
  onImportBackup,
  onResetWorkspace,
  onPenSettingsChange,
  onMultiSelectionChange,
  onRedoCanvas,
  onResetView,
  onSearchByTag,
  onSelectionChange,
  onShapeTypeChange,
  onToggleDarkMode,
  onToggleGrid,
  onToggleFlowchartConnectorArrow,
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
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isManualSaveVisible, setIsManualSaveVisible] = useState(false);
  const [isZoomIndicatorVisible, setIsZoomIndicatorVisible] = useState(false);
  const [pendingConnectorStart, setPendingConnectorStart] = useState<CanvasConnectorStart | null>(null);

  useEffect(() => {
    onSelectionChange(null);
    setPendingConnectorStart(null);
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
  const breadcrumbPath = getBreadcrumbPath(data, page);
  const selectedObject = page.canvasObjects.find((object) => object.id === selectedObjectId && object.type !== "group") ?? null;
  const selectedObjects = selectedObjectIds
    .map((objectId) => page.canvasObjects.find((object) => object.id === objectId))
    .filter((object): object is CanvasObject => Boolean(object && object.type !== "group"));
  const selectedGroupIds = Array.from(
    new Set(selectedObjects.map((object) => object.groupId).filter((groupId): groupId is string => Boolean(groupId))),
  );
  const selectedGroupId = selectedGroupIds.length === 1 ? selectedGroupIds[0] : null;
  const selectedGroupColor = selectedGroupId ? getCanvasGroupColor(page.canvasObjects, selectedGroupId) : undefined;
  const selectedGroupLabel = selectedGroupId ? getCanvasGroupLabel(page.canvasObjects, selectedGroupId) : undefined;
  const hasObjectsOutsideSelectedGroup = Boolean(
    selectedGroupId && selectedObjects.some((object) => object.groupId !== selectedGroupId),
  );
  const hasSelectedGroupedObjects = selectedObjects.some((object) => object.groupId);
  const selectedWhiteboardTextObject = selectedObject && isCanvasTextObject(selectedObject) ? selectedObject : null;
  const formattingTarget: FormattingTarget = selectedWhiteboardTextObject
    ? "whiteboardText"
    : selectedObject
    ? "none"
    : "document";
  const canvasViewState = page.canvasViewState ?? defaultCanvasViewState;
  const isPanning = boardPanInteraction !== null;
  const activeCreationDefaultType = getCreationDefaultType(activeTool, activeShapeType);
  const isSelectedPenStroke = selectedObject?.type === "penStroke";
  const shouldShowActivePenDefaults = activeTool === "Pen" && (!selectedObject || isSelectedPenStroke);
  const toolbarExtraContent = selectedObjects.length > 1 ? (
    <CanvasMultiSelectionToolbar
      count={selectedObjects.length}
      groupColor={selectedGroupColor}
      groupLabel={selectedGroupLabel}
      showAddToGroup={hasObjectsOutsideSelectedGroup}
      showGroup={!selectedGroupId}
      showRemoveFromGroup={hasSelectedGroupedObjects}
      onAddToGroup={addSelectedObjectsToGroup}
      onGroup={groupSelectedObjects}
      onGroupColorChange={selectedGroupId ? updateSelectedGroupColor : undefined}
      onGroupLabelChange={selectedGroupId ? updateSelectedGroupLabel : undefined}
      onRemoveFromGroup={removeSelectedObjectsFromGroups}
    />
  ) : shouldShowActivePenDefaults ? (
    <PenToolToolbar penSettings={penSettings} onChange={onPenSettingsChange} />
  ) : selectedObject ? (
    <CanvasObjectToolbar
      object={selectedObject}
      pendingConnectorStart={pendingConnectorStart}
      onCancelConnector={() => setPendingConnectorStart(null)}
      onDelete={deleteSelectedObject}
      onDuplicate={duplicateSelectedObject}
      onGroupColorChange={selectedObject.groupId ? updateSelectedGroupColor : undefined}
      onGroupLabelChange={selectedObject.groupId ? updateSelectedGroupLabel : undefined}
      onRemoveFromGroup={selectedObject.groupId ? removeSelectedObjectsFromGroups : undefined}
      onStartConnector={startConnectorFromSelectedShape}
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

  function manuallySavePage() {
    onUpdatePage(page.id, {});
    setIsManualSaveVisible(true);
    window.setTimeout(() => setIsManualSaveVisible(false), 1200);
  }

  function runExport(action: () => void) {
    setIsExportMenuOpen(false);
    action();
  }

  function updateSelectedObject(updates: Partial<NonNullable<typeof selectedObject>>) {
    if (!selectedObject) {
      return;
    }

    const shouldSyncConnectors =
      (selectedObject.type === "line" || selectedObject.type === "arrow") &&
      Boolean(selectedObject.sourceObjectId && selectedObject.targetObjectId) &&
      ("sourceAnchor" in updates || "targetAnchor" in updates);
    const nextUpdates = shouldSyncConnectors
      ? {
          ...updates,
          curveControlOffsetX: undefined,
          curveControlOffsetY: undefined,
          elbowBendOffsetX: undefined,
          elbowBendOffsetY: undefined,
        }
      : updates;
    const nextObjects = page.canvasObjects.map((object) =>
        object.id === selectedObject.id
          ? {
              ...object,
              ...nextUpdates,
            }
          : object,
      );

    onUpdateCanvasObjects(page.id, shouldSyncConnectors ? syncConnectedLines(nextObjects) : nextObjects);
  }

  function startConnectorFromSelectedShape(sourceAnchor: CanvasConnectorAnchor) {
    if (!selectedObject || !isFlowchartShape(selectedObject)) {
      return;
    }

    setPendingConnectorStart({
      sourceAnchor,
      sourceObjectId: selectedObject.id,
    });
    onToolChange("Select");
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
      groupId: undefined,
      groupColor: undefined,
      groupLabel: undefined,
      createdAt: now,
      updatedAt: now,
    };

    onUpdateCanvasObjects(page.id, [...page.canvasObjects, duplicatedObject]);
    onSelectionChange(duplicatedObject.id);
  }

  function groupSelectedObjects() {
    const groupableObjects = selectedObjects.filter((object) => object.type !== "group");
    if (groupableObjects.length < 2) {
      return;
    }

    const now = timestamp();
    const groupId = createId("group");
    const groupableIds = new Set(groupableObjects.map((object) => object.id));
    const nextObjects = page.canvasObjects.map((object) =>
      groupableIds.has(object.id)
        ? {
            ...object,
            groupColor: defaultCanvasGroupColor,
            groupId,
            groupLabel: "Group",
            updatedAt: now,
          }
        : object,
    );

    onUpdateCanvasObjects(page.id, normalizeCanvasGroupMemberships(nextObjects));
    onMultiSelectionChange(groupableObjects.map((object) => object.id));
  }

  function addSelectedObjectsToGroup() {
    if (!selectedGroupId) {
      return;
    }

    const selectedIds = new Set(selectedObjects.map((object) => object.id));
    const groupColor = getCanvasGroupColor(page.canvasObjects, selectedGroupId);
    const groupLabel = getCanvasGroupLabel(page.canvasObjects, selectedGroupId);
    const now = timestamp();

    const nextObjects = page.canvasObjects.map((object) =>
      selectedIds.has(object.id)
        ? {
            ...object,
            groupColor,
            groupId: selectedGroupId,
            groupLabel,
            updatedAt: now,
          }
        : object,
    );

    onUpdateCanvasObjects(page.id, normalizeCanvasGroupMemberships(nextObjects));
  }

  function removeSelectedObjectsFromGroups() {
    const selectedIds = new Set(selectedObjects.map((object) => object.id));
    if (!selectedIds.size) {
      return;
    }

    const now = timestamp();
    const nextObjects = page.canvasObjects.map((object) => {
      if (!selectedIds.has(object.id) || !object.groupId) {
        return object;
      }

      const { groupColor, groupId, groupLabel, ...ungroupedObject } = object;
      return {
        ...ungroupedObject,
        updatedAt: now,
      };
    });

    onUpdateCanvasObjects(page.id, normalizeCanvasGroupMemberships(nextObjects));
  }

  function updateSelectedGroupLabel(groupLabel: string) {
    if (!selectedGroupId) {
      return;
    }

    const now = timestamp();
    const nextObjects = page.canvasObjects.map((object) =>
      object.groupId === selectedGroupId
        ? {
            ...object,
            groupLabel,
            updatedAt: now,
          }
        : object,
    );

    onUpdateCanvasObjects(page.id, nextObjects);
  }

  function updateSelectedGroupColor(groupColor: SidebarItemColor) {
    if (!selectedGroupId) {
      return;
    }

    const now = timestamp();
    const nextObjects = page.canvasObjects.map((object) =>
      object.groupId === selectedGroupId
        ? {
            ...object,
            groupColor,
            updatedAt: now,
          }
        : object,
    );

    onUpdateCanvasObjects(page.id, nextObjects);
  }

  function deleteSelectedObject() {
    if (!selectedObject) {
      return;
    }

    onUpdateCanvasObjects(
      page.id,
      normalizeCanvasGroupMemberships(removeObjectsAndConnectedLines(page.canvasObjects, new Set([selectedObject.id]))),
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

  function getVisibleCanvasInsertPoint(width: number, height: number) {
    const bounds = workspaceRef.current?.getBoundingClientRect();
    const screenX = bounds ? bounds.width / 2 : 640;
    const screenY = bounds ? bounds.height / 2 : 360;
    const x = (screenX - canvasViewState.panX) / canvasViewState.zoom - objectCanvasOriginX - width / 2;
    const y = (screenY - canvasViewState.panY) / canvasViewState.zoom - objectCanvasOriginY - height / 2;

    return {
      x: alignCanvasX(x, isSnapToGridEnabled),
      y: alignCanvasY(y, isSnapToGridEnabled),
    };
  }

  function createCanvasImageObject(image: ProcessedImage, assetId: string): CanvasObject {
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
      width: alignCanvasSize(width, isSnapToGridEnabled),
      height: alignCanvasSize(height, isSnapToGridEnabled),
      imageDataUrl: image.dataUrl,
      assetId,
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
        const assetId = createId("asset");
        const now = timestamp();
        await saveAsset({ id: assetId, mimeType: "image/jpeg", data: image.dataUrl, version: 1, deletedAt: null, syncedAt: null, createdAt: now, updatedAt: now });
        importedObjects.push(createCanvasImageObject(image, assetId));
      }

      if (!importedObjects.length) {
        return;
      }

      onUpdateCanvasObjects(page.id, [...page.canvasObjects, ...importedObjects]);
      onSelectionChange(importedObjects[importedObjects.length - 1].id);
      onToolChange("Select");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not import that image.");
    }
  }

  function isActiveTextEditingTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const editable = target.closest("input, textarea, [contenteditable='true']");
    if (!(editable instanceof HTMLElement)) {
      return false;
    }

    const activeElement = document.activeElement;
    return activeElement === editable || Boolean(activeElement && editable.contains(activeElement));
  }

  function isPanBlockedTarget(target: EventTarget | null, options: { allowInactiveTextEditing?: boolean } = {}) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    if (target.closest("button, select, [data-pan-block='true']")) {
      return true;
    }

    if (target.closest("input, textarea, [contenteditable='true']")) {
      return !options.allowInactiveTextEditing || isActiveTextEditingTarget(target);
    }

    return false;
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

  function isMiddlePanBlockedTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest("button, input, textarea, select, summary, option, [role='menu'], [role='listbox'], [data-pan-block='true']"),
    );
  }

  function handleWorkspacePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const isBlockedTarget = isPanBlockedTarget(event.target);

    if (!isBlockedTarget) {
      event.currentTarget.focus();
    }

    if (event.button === 1 && !isMiddlePanBlockedTarget(event.target)) {
      startWorkspacePan(event);
      return;
    }

    if (activeTool === "Select" && event.button === 0 && !isBlockedTarget) {
      onSelectionChange(null);
      return;
    }

    if (
      activeTool !== "Pan" ||
      event.button !== 0 ||
      isPanBlockedTarget(event.target, { allowInactiveTextEditing: true })
    ) {
      return;
    }

    startWorkspacePan(event);
  }

  function startWorkspacePan(event: React.PointerEvent<HTMLDivElement>) {
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
        "relative min-h-0 flex-1 overflow-hidden bg-[var(--tl-canvas)]",
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
              backgroundSize: `${gridSize * canvasViewState.zoom}px ${gridSize * canvasViewState.zoom}px`,
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
          activeShapeType={activeShapeType}
          creationToolDefaults={creationToolDefaults}
          isFlowchartConnectorArrowEnabled={isFlowchartConnectorArrowEnabled}
          isSnapToGridEnabled={isSnapToGridEnabled}
          objects={page.canvasObjects}
          pendingConnectorStart={pendingConnectorStart}
          penSettings={penSettings}
          viewState={canvasViewState}
          selectedObjectId={selectedObjectId}
          selectedObjectIds={selectedObjectIds}
          onChange={(canvasObjects, options) => onUpdateCanvasObjects(page.id, canvasObjects, options)}
          onConnectorStartChange={setPendingConnectorStart}
          onMultiSelectionChange={onMultiSelectionChange}
          onViewStateChange={(viewState) => onUpdatePage(page.id, { canvasViewState: viewState })}
          onSelectionChange={onSelectionChange}
          onShapeTypeChange={onShapeTypeChange}
          onToolChange={onToolChange}
        />
        <article
          className={[
            "absolute z-10 min-h-[760px] w-[780px] rounded-md border border-slate-200 bg-white shadow-soft",
            activeTool === "Pan"
              ? isPanning
                ? "cursor-grabbing [&_*]:cursor-grabbing"
                : "cursor-grab [&_*]:cursor-grab"
              : "cursor-auto",
          ].join(" ")}
          onPointerDown={() => {
            if (selectedObjectId) {
              onSelectionChange(null);
            }
          }}
          style={{ left: documentBlockX, top: documentBlockY, width: documentBlockWidth }}
        >
          <div className="border-b border-slate-100 px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 text-sm text-slate-500">
                {breadcrumbPath.map((item, index) => (
                  <span key={`${item}-${index}`}>
                    {index > 0 ? <span className="mx-2 text-slate-300">/</span> : null}
                    <span className={index === 0 ? "font-medium text-slate-700" : undefined}>{item}</span>
                  </span>
                ))}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  aria-label="Save note now"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  title="Save note now"
                  type="button"
                  onClick={manuallySavePage}
                >
                  {isManualSaveVisible ? (
                    <Check aria-hidden="true" className="h-4 w-4 text-leaf-700" />
                  ) : (
                    <Save aria-hidden="true" className="h-4 w-4" />
                  )}
                </button>
                {isManualSaveVisible ? (
                  <span className="text-xs font-medium text-leaf-700">Saved</span>
                ) : null}
                <div className="relative">
                  <button
                    aria-expanded={isExportMenuOpen}
                    aria-label="Export"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    title="Export"
                    type="button"
                    onClick={() => setIsExportMenuOpen((current) => !current)}
                  >
                    <Download aria-hidden="true" className="h-4 w-4" />
                  </button>
                  {isExportMenuOpen ? (
                    <div className="absolute right-0 top-11 z-40 grid w-48 gap-1 rounded-md border border-slate-200 bg-white p-1 text-sm shadow-soft">
                      <button
                        className="flex h-9 items-center gap-2 rounded px-2 text-left font-medium text-slate-700 hover:bg-slate-50"
                        type="button"
                        onClick={() => runExport(() => exportPageAsPdf(page, breadcrumbPath))}
                      >
                        <FileDown aria-hidden="true" className="h-4 w-4" />
                        Export as PDF
                      </button>
                      <button
                        className="flex h-9 items-center gap-2 rounded px-2 text-left font-medium text-slate-700 hover:bg-slate-50"
                        type="button"
                        onClick={() => runExport(onExportBackup)}
                      >
                        <Download aria-hidden="true" className="h-4 w-4" />
                        Export backup file
                      </button>
                    </div>
                  ) : null}
                </div>
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
              className="mt-3 w-full border-none bg-transparent text-2xl font-semibold tracking-normal text-slate-950 outline-none placeholder:text-slate-300"
              placeholder="Untitled meeting note"
              value={page.title}
              onChange={(event) => onUpdatePage(page.id, { title: event.target.value })}
            />

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
              <label className="inline-flex items-center gap-1.5">
                <span>Note Date:</span>
                <input
                  className="w-[112px] border-none bg-transparent font-medium text-slate-700 outline-none"
                  inputMode="numeric"
                  placeholder="YYYY-MM-DD"
                  type="text"
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

            <div className="mt-3 rounded-md border border-slate-100 bg-white px-2.5 py-1.5">
              <TagEditor
                suggestions={tagSuggestions}
                tags={page.tags}
                onChange={(tags) => onUpdatePage(page.id, { tags })}
                onSearchByTag={onSearchByTag}
              />
            </div>
          </div>

          <div className="px-8 py-6">
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
        activeShapeType={activeShapeType}
        canRedoCanvas={canRedoCanvas}
        canUndoCanvas={canUndoCanvas}
        isGridVisible={isGridVisible}
        isFlowchartConnectorArrowEnabled={isFlowchartConnectorArrowEnabled}
        isSnapToGridEnabled={isSnapToGridEnabled}
        isDarkMode={isDarkMode}
        onImageUploadClick={() => canvasImageInputRef.current?.click()}
        onRedoCanvas={onRedoCanvas}
        onResetView={onResetView}
        onToggleFlowchartConnectorArrow={onToggleFlowchartConnectorArrow}
        onToggleGrid={onToggleGrid}
        onToggleSnapToGrid={onToggleSnapToGrid}
        onExportBackup={onExportBackup}
        onImportBackup={onImportBackup}
        onResetWorkspace={onResetWorkspace}
        onToolChange={onToolChange}
        onShapeTypeChange={onShapeTypeChange}
        onToggleDarkMode={onToggleDarkMode}
        onUndoCanvas={onUndoCanvas}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onHelpClick={() => setIsShortcutHelpOpen(true)}
      />
      {isShortcutHelpOpen ? <ShortcutHelpDialog onClose={() => setIsShortcutHelpOpen(false)} /> : null}
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

function ShortcutHelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/20 px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-help-title"
      onPointerDown={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-soft"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="shortcut-help-title" className="text-lg font-semibold text-slate-950">
              Shortcuts and Controls
            </h2>
            <p className="mt-1 text-sm text-slate-500">Keyboard, mouse, and trackpad commands for the workspace.</p>
          </div>
          <button
            aria-label="Close shortcuts help"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 grid gap-4 text-sm text-slate-600 md:grid-cols-2">
          <ShortcutSection
            title="Tools"
            items={[
              ["1", "Select and move objects"],
              ["2", "Pan / hand tool"],
              ["3", "Shape: Rectangle, Circle, or Diamond"],
              ["4-6", "Text, Line, Arrow"],
              ["8", "Import image"],
              ["9", "Pen, Ink, Highlighter, Laser Pointer"],
              ["0", "Eraser"],
            ]}
          />
          <ShortcutSection
            title="Canvas"
            items={[
              ["Space drag", "Temporary pan"],
              ["Middle drag", "Pan"],
              ["Trackpad scroll", "Pan the board"],
              ["Ctrl/Cmd + wheel", "Zoom"],
              ["+ / -", "Zoom in / out"],
              ["Reset", "Return page to the default view"],
            ]}
          />
          <ShortcutSection
            title="History"
            items={[
              ["Cmd/Ctrl + Z", "Undo canvas action outside the document"],
              ["Cmd/Ctrl + Shift + Z", "Redo canvas action"],
              ["Cmd/Ctrl + Y", "Redo canvas action"],
            ]}
          />
          <ShortcutSection
            title="Editing"
            items={[
              ["Drag with Pen", "Draw over pages and objects"],
              ["Laser Pointer", "Temporary non-persistent stroke"],
              ["Eraser hover", "Preview objects that will be removed"],
              ["Eraser drag", "Queue removals, commit on release"],
              ["Double-click text", "Edit whiteboard text"],
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function ShortcutSection({ items, title }: { items: Array<[string, string]>; title: string }) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</h3>
      <dl className="mt-2 space-y-2">
        {items.map(([shortcut, description]) => (
          <div key={`${title}-${shortcut}`} className="grid grid-cols-[112px_1fr] gap-3">
            <dt className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">{shortcut}</dt>
            <dd className="py-1 text-xs leading-5 text-slate-600">{description}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function isCanvasTextObject(object: CanvasObject) {
  return object.type === "textBox" || object.text !== undefined;
}

function isFlowchartShape(object: CanvasObject | null | undefined) {
  return object?.type === "rectangle" || object?.type === "circle" || object?.type === "diamond";
}

function getBreadcrumbPath(data: WorkspaceData, page: Page) {
  const profile = data.profiles.find((item) => item.id === page.profileId);
  const project = data.projects.find((item) => item.id === page.projectId);
  const foldersById = new Map(data.folders.map((item) => [item.id, item]));
  const folderNames: string[] = [];
  const visitedFolderIds = new Set<string>();
  let folder = page.folderId ? foldersById.get(page.folderId) : undefined;

  while (folder && !visitedFolderIds.has(folder.id)) {
    folderNames.unshift(folder.name);
    visitedFolderIds.add(folder.id);
    folder = folder.parentFolderId ? foldersById.get(folder.parentFolderId) : undefined;
  }

  return [profile?.name ?? "Profile", project?.name ?? "Project", ...folderNames, page.title || "Untitled"];
}

function getCreationDefaultType(
  tool: CanvasTool,
  activeShapeType: CanvasShapeType,
): keyof CanvasCreationToolDefaults | null {
  const creationDefaultTypeByTool: Partial<Record<CanvasTool, keyof CanvasCreationToolDefaults>> = {
    Arrow: "arrow",
    Line: "line",
    Shape: activeShapeType,
    "Text Box": "textBox",
  };

  return creationDefaultTypeByTool[tool] ?? null;
}
