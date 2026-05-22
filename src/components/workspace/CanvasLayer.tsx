"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CanvasObject,
  CanvasObjectType,
  CanvasTool,
  CanvasViewState,
} from "@/types/workspace";
import {
  defaultCanvasStyle,
  defaultObjectSizes,
  maxZoom,
  minObjectSize,
  minZoom,
  objectCanvasOriginX,
  objectCanvasOriginY,
  snapToGrid,
  virtualBoardHeight,
  virtualBoardWidth,
  zoomStep,
} from "@/lib/canvasStyle";
import { createId } from "@/lib/workspaceUtils";

type CanvasLayerProps = {
  activeTool: CanvasTool;
  isSnapToGridEnabled: boolean;
  objects: CanvasObject[];
  selectedObjectId: string | null;
  viewState: CanvasViewState;
  onChange: (objects: CanvasObject[]) => void;
  onSelectionChange: (objectId: string | null) => void;
  onViewStateChange: (viewState: CanvasViewState) => void;
};

type MoveInteraction = {
  kind: "move";
  id: string;
  offsetX: number;
  offsetY: number;
};

type ResizeInteraction = {
  kind: "resize";
  handle: ResizeHandle;
  id: string;
  pointerX: number;
  pointerY: number;
  startHeight: number;
  startWidth: number;
  startX: number;
  startY: number;
};

type LineMoveInteraction = {
  kind: "lineMove";
  id: string;
  pointerX: number;
  pointerY: number;
  startX1: number;
  startX2: number;
  startY1: number;
  startY2: number;
};

type EndpointInteraction = {
  endpoint: "start" | "end";
  id: string;
  kind: "endpoint";
};

type CreateInteraction = {
  kind: "create";
  id: string;
  tool: CanvasTool;
  startX: number;
  startY: number;
  moved: boolean;
};

type PendingLineInteraction = {
  id: string;
  kind: "pendingLine";
  startX: number;
  startY: number;
  tool: "Line" | "Arrow";
};

type PanInteraction = {
  kind: "pan";
  pointerX: number;
  pointerY: number;
  startPanX: number;
  startPanY: number;
};

type Interaction =
  | MoveInteraction
  | ResizeInteraction
  | LineMoveInteraction
  | EndpointInteraction
  | CreateInteraction
  | PendingLineInteraction
  | PanInteraction;
type ResizeHandle = "n" | "e" | "s" | "w" | "nw" | "ne" | "sw" | "se";

const toolToObjectType: Partial<Record<CanvasTool, CanvasObjectType>> = {
  Rectangle: "rectangle",
  Circle: "circle",
  "Text Box": "textBox",
  Line: "line",
  Arrow: "arrow",
};

export function CanvasLayer({
  activeTool,
  isSnapToGridEnabled,
  objects,
  selectedObjectId,
  viewState,
  onChange,
  onSelectionChange,
  onViewStateChange,
}: CanvasLayerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const selectedObject = objects.find((object) => object.id === selectedObjectId) ?? null;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        setIsSpacePressed(true);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (activeTool !== "Text Box" || !selectedObject) {
      return;
    }

    if (selectedObject.type !== "rectangle" && selectedObject.type !== "circle") {
      return;
    }

    updateObject(selectedObject.id, {
      text: selectedObject.text ?? "Text box",
    });
    setEditingTextId(selectedObject.id);
  }, [activeTool, selectedObject?.id, selectedObject?.type]);

  useEffect(() => {
    setEditingTextId(null);
  }, [selectedObjectId]);

  useEffect(() => {
    setInteraction(null);
    setEditingTextId(null);
  }, [activeTool]);

  function updateObject(objectId: string, updates: Partial<CanvasObject>) {
    const now = new Date().toISOString();
    onChange(
      objects.map((object) =>
        object.id === objectId
          ? {
              ...object,
              ...updates,
              updatedAt: now,
            }
          : object,
      ),
    );
  }

  function updateViewState(nextViewState: CanvasViewState) {
    onViewStateChange({
      panX: nextViewState.panX,
      panY: nextViewState.panY,
      zoom: Math.min(maxZoom, Math.max(minZoom, nextViewState.zoom)),
    });
  }

  function alignToGrid(value: number) {
    return isSnapToGridEnabled ? snapToGrid(value) : value;
  }

  function deleteObject(objectId: string) {
    onChange(objects.filter((object) => object.id !== objectId));
    onSelectionChange(null);
    setEditingTextId(null);
    setInteraction(null);
  }

  function createObject(tool: CanvasTool, startX: number, startY: number): CanvasObject | null {
    const type = toolToObjectType[tool];
    if (!type) {
      return null;
    }

    const size = defaultObjectSizes[type];
    const now = new Date().toISOString();
    const object: CanvasObject = {
      id: createId("object"),
      type,
      x: startX,
      y: startY,
      width: size.width,
      height: size.height,
      text: size.text,
      ...defaultCanvasStyle,
      createdAt: now,
      updatedAt: now,
    };

    if (type === "line" || type === "arrow") {
      object.x1 = startX;
      object.y1 = startY;
      object.x2 = startX;
      object.y2 = startY;
    }

    if (type === "textBox") {
      object.fillColor = "transparent";
      object.strokeColor = "transparent";
      object.strokeWidth = 1;
    }

    return object;
  }

  function screenToWorld(clientX: number, clientY: number) {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) {
      return null;
    }

    const screenX = clientX - bounds.left;
    const screenY = clientY - bounds.top;
    return {
      x: screenX / viewState.zoom - objectCanvasOriginX,
      y: screenY / viewState.zoom - objectCanvasOriginY,
      screenX,
      screenY,
    };
  }

  function startPan(clientX: number, clientY: number) {
    const point = screenToWorld(clientX, clientY);
    if (!point) {
      return;
    }

    setInteraction({
      kind: "pan",
      pointerX: point.screenX,
      pointerY: point.screenY,
      startPanX: viewState.panX,
      startPanY: viewState.panY,
    });
  }

  function startCreation(event: React.PointerEvent<HTMLDivElement>) {
    const point = screenToWorld(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    const startX = alignToGrid(point.x);
    const startY = alignToGrid(point.y);
    const object = createObject(activeTool, startX, startY);
    if (!object) {
      return;
    }

    onChange([...objects, object]);
    onSelectionChange(object.id);
    setEditingTextId(null);
    setInteraction({
      kind: "create",
      id: object.id,
      tool: activeTool,
      startX,
      startY,
      moved: false,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finishPendingLine(clientX: number, clientY: number) {
    if (interaction?.kind !== "pendingLine") {
      return;
    }

    const point = screenToWorld(clientX, clientY);
    const object = objects.find((item) => item.id === interaction.id);
    if (!point || !object) {
      setInteraction(null);
      return;
    }

    updateObject(
      object.id,
      normalizeLineBounds(
        {
          ...object,
          x1: interaction.startX,
          y1: interaction.startY,
          x2: alignToGrid(point.x),
          y2: alignToGrid(point.y),
        },
        isSnapToGridEnabled,
      ),
    );
    setInteraction(null);
  }

  function shouldPan(event: React.PointerEvent<HTMLElement>) {
    return isSpacePressed || event.button === 1;
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    canvasRef.current?.focus();

    setEditingTextId(null);

    if (interaction?.kind === "pendingLine") {
      finishPendingLine(event.clientX, event.clientY);
      return;
    }

    if (shouldPan(event)) {
      startPan(event.clientX, event.clientY);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (event.button !== 0) {
      return;
    }

    if (toolToObjectType[activeTool]) {
      startCreation(event);
      return;
    }

    if (activeTool === "Select") {
      onSelectionChange(null);
      setInteraction(null);
    }
  }

  function handleCanvasPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!interaction) {
      return;
    }

    const point = screenToWorld(event.clientX, event.clientY);

    if (interaction.kind === "pan") {
      if (!point) {
        return;
      }

      updateViewState({
        panX: interaction.startPanX + (point.screenX - interaction.pointerX),
        panY: interaction.startPanY + (point.screenY - interaction.pointerY),
        zoom: viewState.zoom,
      });
      return;
    }

    const object = objects.find((item) => item.id === interaction.id);
    if (!point || !object) {
      return;
    }

    const pointerX = alignToGrid(point.x);
    const pointerY = alignToGrid(point.y);

    if (interaction.kind === "pendingLine") {
      updateObject(
        object.id,
        normalizeLineBounds(
          {
            ...object,
            x1: interaction.startX,
            y1: interaction.startY,
            x2: pointerX,
            y2: pointerY,
          },
          isSnapToGridEnabled,
        ),
      );
      return;
    }

    if (interaction.kind === "move") {
      updateObject(object.id, {
        x: alignToGrid(pointerX - interaction.offsetX),
        y: alignToGrid(pointerY - interaction.offsetY),
      });
      return;
    }

    if (interaction.kind === "resize") {
      updateObject(object.id, getResizeUpdates(interaction, pointerX, pointerY, isSnapToGridEnabled));
      return;
    }

    if (interaction.kind === "lineMove") {
      const dx = alignToGrid(pointerX - interaction.pointerX);
      const dy = alignToGrid(pointerY - interaction.pointerY);
      updateObject(
        object.id,
        normalizeLineBounds(
          {
            ...object,
            x1: interaction.startX1 + dx,
            y1: interaction.startY1 + dy,
            x2: interaction.startX2 + dx,
            y2: interaction.startY2 + dy,
          },
          isSnapToGridEnabled,
        ),
      );
      return;
    }

    if (interaction.kind === "endpoint") {
      const nextLine =
        interaction.endpoint === "start"
          ? { ...object, x1: pointerX, y1: pointerY }
          : { ...object, x2: pointerX, y2: pointerY };
      updateObject(object.id, normalizeLineBounds(nextLine, isSnapToGridEnabled));
      return;
    }

    const dx = pointerX - interaction.startX;
    const dy = pointerY - interaction.startY;
    const hasMoved = Math.abs(dx) + Math.abs(dy) > 0;

    if (object.type === "line" || object.type === "arrow") {
      if (!hasMoved) {
        return;
      }

      updateObject(
        object.id,
        normalizeLineBounds(
          {
            ...object,
            x1: interaction.startX,
            y1: interaction.startY,
            x2: pointerX,
            y2: pointerY,
          },
          isSnapToGridEnabled,
        ),
      );
      setInteraction((current) => (current?.kind === "create" ? { ...current, moved: true } : current));
      return;
    }

    if (!hasMoved) {
      return;
    }

    const x = Math.min(interaction.startX, pointerX);
    const y = Math.min(interaction.startY, pointerY);
    const width = Math.max(minObjectSize, Math.abs(pointerX - interaction.startX));
    const height = Math.max(minObjectSize, Math.abs(pointerY - interaction.startY));

    updateObject(object.id, {
      x: alignToGrid(x),
      y: alignToGrid(y),
      width: alignToGrid(width),
      height: alignToGrid(height),
    });

    setInteraction((current) => (current?.kind === "create" ? { ...current, moved: true } : current));
  }

  function handleCanvasPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (interaction?.kind === "create") {
      const object = objects.find((item) => item.id === interaction.id);
      if (object && (object.type === "line" || object.type === "arrow")) {
        if (!interaction.moved) {
          setInteraction({
            id: object.id,
            kind: "pendingLine",
            startX: interaction.startX,
            startY: interaction.startY,
            tool: interaction.tool === "Arrow" ? "Arrow" : "Line",
          });
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          return;
        }
      }

      if (object?.type === "textBox") {
        setEditingTextId(object.id);
      }
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setInteraction(null);
  }

  function handleCanvasPointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setInteraction(null);
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();

    const point = screenToWorld(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    const direction = event.deltaY > 0 ? -1 : 1;
    const nextZoom = Math.min(maxZoom, Math.max(minZoom, viewState.zoom + direction * zoomStep));
    updateViewState({
      panX: viewState.panX,
      panY: viewState.panY,
      zoom: nextZoom,
    });
  }

  function handleObjectPointerDown(event: React.PointerEvent<HTMLDivElement>, object: CanvasObject) {
    event.stopPropagation();
    canvasRef.current?.focus();

    if (event.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (activeTool === "Pan") {
      setEditingTextId(null);
      return;
    }

    if (shouldPan(event)) {
      setEditingTextId(null);
      startPan(event.clientX, event.clientY);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    onSelectionChange(object.id);

    if (activeTool === "Text Box" && (object.type === "rectangle" || object.type === "circle")) {
      setEditingTextId(null);
      return;
    }

    if (object.type === "textBox" && editingTextId === object.id) {
      return;
    }

    const point = screenToWorld(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    setEditingTextId(null);
    setInteraction({
      kind: "move",
      id: object.id,
      offsetX: point.x - object.x,
      offsetY: point.y - object.y,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function startResize(event: React.PointerEvent<HTMLButtonElement>, object: CanvasObject, handle: ResizeHandle) {
    event.stopPropagation();
    onSelectionChange(object.id);
    setEditingTextId(null);
    const point = screenToWorld(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    setInteraction({
      kind: "resize",
      handle,
      id: object.id,
      pointerX: point.x,
      pointerY: point.y,
      startHeight: object.height,
      startWidth: object.width,
      startX: object.x,
      startY: object.y,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function startLineMove(event: React.PointerEvent<SVGLineElement>, object: CanvasObject) {
    event.stopPropagation();
    canvasRef.current?.focus();
    onSelectionChange(object.id);
    setEditingTextId(null);
    const point = screenToWorld(event.clientX, event.clientY);
    const points = getLinePoints(object);

    if (!point) {
      return;
    }

    setInteraction({
      kind: "lineMove",
      id: object.id,
      pointerX: point.x,
      pointerY: point.y,
      startX1: points.x1,
      startX2: points.x2,
      startY1: points.y1,
      startY2: points.y2,
    });
  }

  function startEndpointDrag(
    event: React.PointerEvent<HTMLButtonElement>,
    object: CanvasObject,
    endpoint: "start" | "end",
  ) {
    event.stopPropagation();
    onSelectionChange(object.id);
    setEditingTextId(null);
    setInteraction({ endpoint, id: object.id, kind: "endpoint" });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      if (interaction?.kind === "pendingLine") {
        deleteObject(interaction.id);
      }
      setEditingTextId(null);
      return;
    }

    if (!selectedObjectId || (event.key !== "Delete" && event.key !== "Backspace")) {
      return;
    }

    if (event.target instanceof HTMLTextAreaElement) {
      return;
    }

    event.preventDefault();
    deleteObject(selectedObjectId);
  }

  const lineObjects = objects.filter((object) => object.type === "line" || object.type === "arrow");
  const boxObjects = objects.filter((object) => object.type !== "line" && object.type !== "arrow");
  const shouldUseCanvasHitLayer =
    activeTool !== "Pan" && (Boolean(toolToObjectType[activeTool]) || isSpacePressed || interaction?.kind === "pendingLine");

  return (
    <div
      ref={canvasRef}
      className={[
        "pointer-events-none absolute inset-0 z-20 touch-none overflow-visible outline-none",
        activeTool === "Pan" ? "cursor-grab" : "",
        interaction?.kind === "pan" ? "cursor-grabbing" : "",
      ].join(" ")}
      style={{ height: virtualBoardHeight, width: virtualBoardWidth }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerCancel}
      onWheel={handleWheel}
    >
      <div
        className={["absolute inset-0", shouldUseCanvasHitLayer ? "pointer-events-auto" : "pointer-events-none"].join(
          " ",
        )}
        onPointerDown={handleCanvasPointerDown}
      />
      <div
        className="pointer-events-none absolute origin-top-left"
        style={{
          height: virtualBoardHeight - objectCanvasOriginY,
          left: objectCanvasOriginX,
          top: objectCanvasOriginY,
          width: virtualBoardWidth - objectCanvasOriginX,
        }}
      >
        <svg className="absolute inset-0 h-full w-full overflow-visible">
          {lineObjects.map((object) => {
            const points = getLinePoints(object);
            const isSelected = selectedObjectId === object.id;

            return (
              <g key={object.id}>
                <defs>
                  {object.type === "arrow" ? (
                    <marker
                      id={`arrow-${object.id}`}
                      markerHeight="8"
                      markerWidth="8"
                      orient="auto"
                      refX="7"
                      refY="4"
                    >
                      <path d="M0,0 L8,4 L0,8 Z" fill={object.strokeColor} />
                    </marker>
                  ) : null}
                </defs>
                <line
                  className="pointer-events-auto cursor-move"
                  markerEnd={object.type === "arrow" ? `url(#arrow-${object.id})` : undefined}
                  stroke={isSelected ? "#238157" : object.strokeColor}
                  strokeLinecap="round"
                  strokeWidth={Math.max(8, object.strokeWidth + 6)}
                  x1={points.x1}
                  x2={points.x2}
                  y1={points.y1}
                  y2={points.y2}
                  opacity="0"
                  onPointerDown={(event) => startLineMove(event, object)}
                />
                <line
                  markerEnd={object.type === "arrow" ? `url(#arrow-${object.id})` : undefined}
                  stroke={isSelected ? "#238157" : object.strokeColor}
                  strokeDasharray={getStrokeDashArray(object)}
                  strokeLinecap="round"
                  strokeWidth={object.strokeWidth}
                  x1={points.x1}
                  x2={points.x2}
                  y1={points.y1}
                  y2={points.y2}
                />
              </g>
            );
          })}
        </svg>

        {lineObjects.map((object) => {
          const isSelected = selectedObjectId === object.id;
          const points = getLinePoints(object);
          const box = getLineSelectionBox(points);

          if (!isSelected) {
            return null;
          }

          return (
            <div key={`${object.id}-selection`}>
              <div
                className="pointer-events-none absolute border border-dashed border-leaf-500"
                style={{ height: box.height, left: box.x, top: box.y, width: box.width }}
              />
              <EndpointHandle
                object={object}
                point={{ x: points.x1, y: points.y1 }}
                onStart={startEndpointDrag}
                endpoint="start"
              />
              <EndpointHandle
                object={object}
                point={{ x: points.x2, y: points.y2 }}
                onStart={startEndpointDrag}
                endpoint="end"
              />
            </div>
          );
        })}

        {boxObjects.map((object) => {
          const isSelected = selectedObjectId === object.id;
          const isEditing = editingTextId === object.id;

          return (
            <div
              key={object.id}
              className={[
                "pointer-events-auto absolute touch-none",
                isEditing ? "cursor-text" : "cursor-move",
                isSelected ? "outline outline-2 outline-leaf-500 outline-offset-2" : "",
              ].join(" ")}
              style={{
                height: object.height,
                left: object.x,
                top: object.y,
                width: object.width,
              }}
              onDoubleClick={() => {
                if (object.type === "textBox" || object.text !== undefined) {
                  onSelectionChange(object.id);
                  setEditingTextId(object.id);
                }
              }}
              onPointerDown={(event) => handleObjectPointerDown(event, object)}
            >
              <CanvasObjectView
                isEditing={isEditing}
                object={object}
                onFinishEditing={() => setEditingTextId(null)}
                onTextChange={(text) => updateObject(object.id, { text })}
              />
              {isSelected ? (
                <>
                  {object.type === "rectangle" ||
                  object.type === "circle" ||
                  object.type === "textBox" ||
                  object.type === "image" ? (
                    <>
                      <ResizeHandleButton handle="n" onPointerDown={(event) => startResize(event, object, "n")} />
                      <ResizeHandleButton handle="e" onPointerDown={(event) => startResize(event, object, "e")} />
                      <ResizeHandleButton handle="s" onPointerDown={(event) => startResize(event, object, "s")} />
                      <ResizeHandleButton handle="w" onPointerDown={(event) => startResize(event, object, "w")} />
                      <ResizeHandleButton handle="nw" onPointerDown={(event) => startResize(event, object, "nw")} />
                      <ResizeHandleButton handle="ne" onPointerDown={(event) => startResize(event, object, "ne")} />
                      <ResizeHandleButton handle="sw" onPointerDown={(event) => startResize(event, object, "sw")} />
                      <ResizeHandleButton handle="se" onPointerDown={(event) => startResize(event, object, "se")} />
                    </>
                  ) : null}
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CanvasObjectView({
  isEditing,
  object,
  onFinishEditing,
  onTextChange,
}: {
  isEditing: boolean;
  object: CanvasObject;
  onFinishEditing: () => void;
  onTextChange: (text: string) => void;
}) {
  const sharedStyle = {
    backgroundColor: object.fillColor,
    borderColor: object.strokeColor,
    borderStyle: object.strokeStyle ?? defaultCanvasStyle.strokeStyle,
    borderWidth: object.strokeWidth,
    color: object.textColor,
  };
  const textStyle = {
    color: object.textColor,
    fontSize: object.fontSize ?? defaultCanvasStyle.fontSize,
    fontStyle: object.textItalic ? "italic" : "normal",
    fontWeight: object.textBold ? 700 : 400,
    textAlign: object.textAlign ?? defaultCanvasStyle.textAlign,
  };
  const textHighlightStyle = {
    backgroundColor: object.textHighlightColor ?? defaultCanvasStyle.textHighlightColor,
  };
  const verticalClass = {
    bottom: "justify-end",
    middle: "justify-center",
    top: "justify-start",
  }[object.textVerticalAlign ?? defaultCanvasStyle.textVerticalAlign];
  const hasText = object.type === "textBox" || object.text !== undefined;

  function renderTextContent() {
    if (!hasText) {
      return null;
    }

    if (isEditing) {
      return (
        <textarea
          autoFocus
          className="h-full w-full resize-none border-none bg-transparent px-2 py-1 leading-5 outline-none"
          style={textStyle}
          value={object.text ?? ""}
          onBlur={onFinishEditing}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.blur();
              onFinishEditing();
            }
          }}
        />
      );
    }

    return (
      <div className={`flex h-full w-full flex-col overflow-hidden whitespace-pre-wrap px-2 py-1 leading-5 ${verticalClass}`}>
        <div style={textStyle}>
          <span style={textHighlightStyle}>{object.text || "Text box"}</span>
        </div>
      </div>
    );
  }

  if (object.type === "rectangle") {
    return (
      <div className="h-full w-full rounded" style={sharedStyle}>
        {renderTextContent()}
      </div>
    );
  }

  if (object.type === "circle") {
    return (
      <div className="h-full w-full overflow-hidden rounded-full" style={sharedStyle}>
        {renderTextContent()}
      </div>
    );
  }

  if (object.type === "image") {
    return (
      <div className="h-full w-full overflow-hidden rounded-md border border-slate-200 bg-white" style={sharedStyle}>
        {object.imageDataUrl ? (
          <img alt="" className="h-full w-full object-contain" draggable={false} src={object.imageDataUrl} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">Missing image</div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-md border bg-white/85 p-1" style={sharedStyle}>
      {renderTextContent()}
    </div>
  );
}

function ResizeHandleButton({
  handle,
  onPointerDown,
}: {
  handle: ResizeHandle;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  const position = {
    e: "-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
    n: "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
    ne: "-right-1.5 -top-1.5 cursor-nesw-resize",
    nw: "-left-1.5 -top-1.5 cursor-nwse-resize",
    s: "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
    se: "-bottom-1.5 -right-1.5 cursor-nwse-resize",
    sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
    w: "-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
  }[handle];

  return (
    <button
      aria-label={`Resize ${handle}`}
      className={`absolute h-3.5 w-3.5 rounded-full border border-leaf-600 bg-white shadow-sm ${position}`}
      title="Resize"
      type="button"
      onPointerDown={onPointerDown}
    />
  );
}

function EndpointHandle({
  endpoint,
  object,
  onStart,
  point,
}: {
  endpoint: "start" | "end";
  object: CanvasObject;
  onStart: (event: React.PointerEvent<HTMLButtonElement>, object: CanvasObject, endpoint: "start" | "end") => void;
  point: { x: number; y: number };
}) {
  return (
    <button
      aria-label={`Move ${endpoint} endpoint`}
      className="absolute h-5 w-5 rounded-full border border-leaf-600 bg-white shadow-sm"
      style={{ left: point.x - 10, top: point.y - 10 }}
      title="Move endpoint"
      type="button"
      onPointerDown={(event) => onStart(event, object, endpoint)}
    />
  );
}

function getResizeUpdates(
  interaction: ResizeInteraction,
  pointerX: number,
  pointerY: number,
  shouldSnap: boolean,
): Partial<CanvasObject> {
  const alignValue = (value: number) => (shouldSnap ? snapToGrid(value) : value);
  const dx = pointerX - interaction.pointerX;
  const dy = pointerY - interaction.pointerY;
  let x = interaction.startX;
  let y = interaction.startY;
  let width = interaction.startWidth;
  let height = interaction.startHeight;

  if (interaction.handle.includes("e")) {
    width = Math.max(minObjectSize, alignValue(interaction.startWidth + dx));
  }

  if (interaction.handle.includes("s")) {
    height = Math.max(minObjectSize, alignValue(interaction.startHeight + dy));
  }

  if (interaction.handle.includes("w")) {
    width = Math.max(minObjectSize, alignValue(interaction.startWidth - dx));
    x = alignValue(interaction.startX + interaction.startWidth - width);
  }

  if (interaction.handle.includes("n")) {
    height = Math.max(minObjectSize, alignValue(interaction.startHeight - dy));
    y = alignValue(interaction.startY + interaction.startHeight - height);
  }

  return { height, width, x: alignValue(x), y: alignValue(y) };
}

function getLinePoints(object: CanvasObject) {
  return {
    x1: object.x1 ?? object.x,
    y1: object.y1 ?? object.y + object.height / 2,
    x2: object.x2 ?? object.x + object.width,
    y2: object.y2 ?? object.y + object.height / 2,
  };
}

function normalizeLineBounds(object: CanvasObject, shouldSnap = true): Partial<CanvasObject> {
  const alignValue = (value: number) => (shouldSnap ? snapToGrid(value) : value);
  const points = getLinePoints(object);
  const minX = Math.min(points.x1, points.x2);
  const minY = Math.min(points.y1, points.y2);
  const width = Math.max(1, Math.abs(points.x2 - points.x1));
  const height = Math.max(1, Math.abs(points.y2 - points.y1));

  return {
    x: alignValue(minX),
    y: alignValue(minY),
    width: alignValue(width),
    height: alignValue(height),
    x1: alignValue(points.x1),
    y1: alignValue(points.y1),
    x2: alignValue(points.x2),
    y2: alignValue(points.y2),
  };
}

function getLineSelectionBox(points: { x1: number; x2: number; y1: number; y2: number }) {
  const padding = 12;
  const x = Math.min(points.x1, points.x2) - padding;
  const y = Math.min(points.y1, points.y2) - padding;
  return {
    height: Math.max(24, Math.abs(points.y2 - points.y1) + padding * 2),
    width: Math.max(24, Math.abs(points.x2 - points.x1) + padding * 2),
    x,
    y,
  };
}

function getStrokeDashArray(object: CanvasObject) {
  const strokeStyle = object.strokeStyle ?? defaultCanvasStyle.strokeStyle;

  if (strokeStyle === "dashed") {
    return `${Math.max(8, object.strokeWidth * 4)} ${Math.max(6, object.strokeWidth * 3)}`;
  }

  if (strokeStyle === "dotted") {
    return `0 ${Math.max(4, object.strokeWidth * 3)}`;
  }

  return undefined;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
