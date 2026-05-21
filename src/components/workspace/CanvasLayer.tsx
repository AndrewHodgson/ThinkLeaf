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

type PanInteraction = {
  kind: "pan";
  pointerX: number;
  pointerY: number;
  startPanX: number;
  startPanY: number;
};

type Interaction = MoveInteraction | ResizeInteraction | LineMoveInteraction | EndpointInteraction | CreateInteraction | PanInteraction;
type ResizeHandle = "nw" | "ne" | "sw" | "se";

const toolToObjectType: Partial<Record<CanvasTool, CanvasObjectType>> = {
  Rectangle: "rectangle",
  Circle: "circle",
  "Text Box": "textBox",
  Line: "line",
  Arrow: "arrow",
};

export function CanvasLayer({
  activeTool,
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
      type: "textBox",
      text: selectedObject.text ?? "",
    });
    setEditingTextId(selectedObject.id);
  }, [activeTool, selectedObject?.id, selectedObject?.type]);

  useEffect(() => {
    setInteraction(null);
    setEditingTextId(null);
  }, [selectedObjectId]);

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
      object.x2 = snapToGrid(startX + size.width);
      object.y2 = startY;
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

    const startX = snapToGrid(point.x);
    const startY = snapToGrid(point.y);
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

  function shouldPan(event: React.PointerEvent<HTMLElement>) {
    return isSpacePressed || event.button === 1;
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    canvasRef.current?.focus();

    setEditingTextId(null);

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

    const pointerX = snapToGrid(point.x);
    const pointerY = snapToGrid(point.y);

    if (interaction.kind === "move") {
      updateObject(object.id, {
        x: snapToGrid(pointerX - interaction.offsetX),
        y: snapToGrid(pointerY - interaction.offsetY),
      });
      return;
    }

    if (interaction.kind === "resize") {
      updateObject(object.id, getResizeUpdates(interaction, pointerX, pointerY));
      return;
    }

    if (interaction.kind === "lineMove") {
      const dx = snapToGrid(pointerX - interaction.pointerX);
      const dy = snapToGrid(pointerY - interaction.pointerY);
      updateObject(
        object.id,
        normalizeLineBounds({
          ...object,
          x1: interaction.startX1 + dx,
          y1: interaction.startY1 + dy,
          x2: interaction.startX2 + dx,
          y2: interaction.startY2 + dy,
        }),
      );
      return;
    }

    if (interaction.kind === "endpoint") {
      const nextLine =
        interaction.endpoint === "start"
          ? { ...object, x1: pointerX, y1: pointerY }
          : { ...object, x2: pointerX, y2: pointerY };
      updateObject(object.id, normalizeLineBounds(nextLine));
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
        normalizeLineBounds({
          ...object,
          x1: interaction.startX,
          y1: interaction.startY,
          x2: pointerX,
          y2: pointerY,
        }),
      );
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
      x: snapToGrid(x),
      y: snapToGrid(y),
      width: snapToGrid(width),
      height: snapToGrid(height),
    });

    setInteraction((current) => (current?.kind === "create" ? { ...current, moved: true } : current));
  }

  function handleCanvasPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (interaction?.kind === "create") {
      const object = objects.find((item) => item.id === interaction.id);
      if (object && (object.type === "line" || object.type === "arrow")) {
        const points = getLinePoints(object);
        if (points.x1 === points.x2 && points.y1 === points.y2) {
          updateObject(
            object.id,
            normalizeLineBounds({
              ...object,
              x1: interaction.startX,
              y1: interaction.startY,
              x2: snapToGrid(interaction.startX + defaultObjectSizes[object.type].width),
              y2: interaction.startY,
            }),
          );
        }
      }

      if (object?.type === "textBox") {
        setEditingTextId(object.id);
      }
    }

    if (interaction?.kind === "pan") {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setInteraction(null);
  }

  function handleCanvasPointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (interaction?.kind === "pan") {
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

  return (
    <div
      ref={canvasRef}
      className={[
        "absolute inset-0 z-0 touch-none overflow-visible outline-none",
        activeTool === "Pan" ? "cursor-grab" : "",
        interaction?.kind === "pan" ? "cursor-grabbing" : "",
      ].join(" ")}
      style={{ height: virtualBoardHeight, width: virtualBoardWidth }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerCancel}
      onWheel={handleWheel}
    >
      <div
        className="absolute origin-top-left"
        style={{
          height: virtualBoardHeight - objectCanvasOriginY,
          left: objectCanvasOriginX,
          top: objectCanvasOriginY,
          width: virtualBoardWidth - objectCanvasOriginX,
        }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
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
                "absolute touch-none",
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
                if (object.type === "textBox") {
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
                  {object.type === "rectangle" || object.type === "circle" || object.type === "textBox" ? (
                    <>
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
    borderWidth: object.strokeWidth,
    color: object.textColor,
  };

  if (object.type === "rectangle") {
    return <div className="h-full w-full rounded" style={sharedStyle} />;
  }

  if (object.type === "circle") {
    return <div className="h-full w-full rounded-full" style={sharedStyle} />;
  }

  return (
    <div className="h-full w-full rounded-md border bg-white/85 p-1" style={sharedStyle}>
      {isEditing ? (
        <textarea
          autoFocus
          className="h-full w-full resize-none border-none bg-transparent px-2 py-1 text-sm leading-5 outline-none"
          style={{ color: object.textColor }}
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
      ) : (
        <div className="h-full w-full overflow-hidden whitespace-pre-wrap px-2 py-1 text-sm leading-5">
          {object.text || "Text box"}
        </div>
      )}
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
    ne: "-right-1.5 -top-1.5 cursor-nesw-resize",
    nw: "-left-1.5 -top-1.5 cursor-nwse-resize",
    se: "-bottom-1.5 -right-1.5 cursor-nwse-resize",
    sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
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

function getResizeUpdates(interaction: ResizeInteraction, pointerX: number, pointerY: number): Partial<CanvasObject> {
  const dx = pointerX - interaction.pointerX;
  const dy = pointerY - interaction.pointerY;
  let x = interaction.startX;
  let y = interaction.startY;
  let width = interaction.startWidth;
  let height = interaction.startHeight;

  if (interaction.handle.includes("e")) {
    width = Math.max(minObjectSize, snapToGrid(interaction.startWidth + dx));
  }

  if (interaction.handle.includes("s")) {
    height = Math.max(minObjectSize, snapToGrid(interaction.startHeight + dy));
  }

  if (interaction.handle.includes("w")) {
    width = Math.max(minObjectSize, snapToGrid(interaction.startWidth - dx));
    x = snapToGrid(interaction.startX + interaction.startWidth - width);
  }

  if (interaction.handle.includes("n")) {
    height = Math.max(minObjectSize, snapToGrid(interaction.startHeight - dy));
    y = snapToGrid(interaction.startY + interaction.startHeight - height);
  }

  return { height, width, x: snapToGrid(x), y: snapToGrid(y) };
}

function getLinePoints(object: CanvasObject) {
  return {
    x1: object.x1 ?? object.x,
    y1: object.y1 ?? object.y + object.height / 2,
    x2: object.x2 ?? object.x + object.width,
    y2: object.y2 ?? object.y + object.height / 2,
  };
}

function normalizeLineBounds(object: CanvasObject): Partial<CanvasObject> {
  const points = getLinePoints(object);
  const minX = Math.min(points.x1, points.x2);
  const minY = Math.min(points.y1, points.y2);
  const width = Math.max(1, Math.abs(points.x2 - points.x1));
  const height = Math.max(1, Math.abs(points.y2 - points.y1));

  return {
    x: snapToGrid(minX),
    y: snapToGrid(minY),
    width: snapToGrid(width),
    height: snapToGrid(height),
    x1: snapToGrid(points.x1),
    y1: snapToGrid(points.y1),
    x2: snapToGrid(points.x2),
    y2: snapToGrid(points.y2),
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

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
