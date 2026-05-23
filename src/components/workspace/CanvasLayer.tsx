"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CanvasHistoryOptions,
  CanvasObject,
  CanvasObjectType,
  CanvasPenSettings,
  CanvasPoint,
  CanvasTool,
  CanvasViewState,
} from "@/types/workspace";
import {
  defaultCanvasStyle,
  defaultLaserColor,
  defaultLaserStrokeWidth,
  defaultObjectSizes,
  defaultPenSettings,
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
  penSettings: CanvasPenSettings;
  selectedObjectId: string | null;
  viewState: CanvasViewState;
  onChange: (objects: CanvasObject[], options?: CanvasHistoryOptions) => void;
  onSelectionChange: (objectId: string | null) => void;
  onViewStateChange: (viewState: CanvasViewState) => void;
};

type MoveInteraction = {
  historyKey: string;
  kind: "move";
  id: string;
  offsetX: number;
  offsetY: number;
};

type ResizeInteraction = {
  historyKey: string;
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
  historyKey: string;
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
  historyKey: string;
  id: string;
  kind: "endpoint";
};

type CreateInteraction = {
  historyKey: string;
  kind: "create";
  id: string;
  tool: CanvasTool;
  startX: number;
  startY: number;
  moved: boolean;
};

type PendingLineInteraction = {
  historyKey: string;
  id: string;
  kind: "pendingLine";
  startX: number;
  startY: number;
  tool: "Line" | "Arrow";
};

type PenDrawInteraction = {
  historyKey: string;
  id: string;
  kind: "penDraw";
  moved: boolean;
};

type LaserDrawInteraction = {
  id: string;
  kind: "laserDraw";
};

type EraserInteraction = {
  erasedIds: string[];
  historyKey: string;
  kind: "eraser";
};

type EraserCursorPoint = {
  id: string;
  x: number;
  y: number;
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
  | PenDrawInteraction
  | LaserDrawInteraction
  | EraserInteraction
  | PanInteraction;
type ResizeHandle = "n" | "e" | "s" | "w" | "nw" | "ne" | "sw" | "se";
type LaserStroke = {
  color: string;
  id: string;
  points: CanvasPoint[];
};

const toolToObjectType: Partial<Record<CanvasTool, CanvasObjectType>> = {
  Rectangle: "rectangle",
  Circle: "circle",
  "Text Box": "textBox",
  Line: "line",
  Arrow: "arrow",
  Pen: "penStroke",
};
const eraserCursorSize = 15;
const laserGlowLayers = [
  { name: "outer", opacity: 0.08, widthMultiplier: 5.2 },
  { name: "middle", opacity: 0.14, widthMultiplier: 3.4 },
  { name: "inner", opacity: 0.28, widthMultiplier: 1.8 },
];
const laserFadeDurations = {
  long: {
    intervalMs: 36,
    startDelayMs: 450,
    trimRatio: 0.085,
  },
  longer: {
    intervalMs: 44,
    startDelayMs: 650,
    trimRatio: 0.06,
  },
  longest: {
    intervalMs: 54,
    startDelayMs: 900,
    trimRatio: 0.04,
  },
  normal: {
    intervalMs: 28,
    startDelayMs: 280,
    trimRatio: 0.12,
  },
};

export function CanvasLayer({
  activeTool,
  isSnapToGridEnabled,
  objects,
  penSettings,
  selectedObjectId,
  viewState,
  onChange,
  onSelectionChange,
  onViewStateChange,
}: CanvasLayerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textEditHistoryKey, setTextEditHistoryKey] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [eraserCursorPoint, setEraserCursorPoint] = useState<EraserCursorPoint | null>(null);
  const [eraserPreviewObjectIds, setEraserPreviewObjectIds] = useState<string[]>([]);
  const [eraserTrailPoints, setEraserTrailPoints] = useState<EraserCursorPoint[]>([]);
  const [laserStrokes, setLaserStrokes] = useState<LaserStroke[]>([]);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const eraserSessionRef = useRef<{ historyKey: string; pendingIds: Set<string> } | null>(null);
  const laserFadeIntervalsRef = useRef<Map<string, number>>(new Map());
  const laserFadeTimeoutsRef = useRef<number[]>([]);
  const objectsRef = useRef(objects);
  const selectedObject = objects.find((object) => object.id === selectedObjectId) ?? null;

  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

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
    return () => {
      for (const timeoutId of laserFadeTimeoutsRef.current) {
        window.clearTimeout(timeoutId);
      }
      for (const intervalId of laserFadeIntervalsRef.current.values()) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  useEffect(() => {
    if (activeTool !== "Text Box" || !selectedObject) {
      return;
    }

    if (selectedObject.type !== "rectangle" && selectedObject.type !== "circle") {
      return;
    }

    const historyKey = createId("history");
    updateObject(
      selectedObject.id,
      {
        text: selectedObject.text ?? "Text box",
      },
      { historyKey },
    );
    startTextEditing(selectedObject.id);
  }, [activeTool, selectedObject?.id, selectedObject?.type]);

  useEffect(() => {
    function commitEraserSession() {
      commitPendingErase();
    }

    function clearEraserSession() {
      clearPendingErase();
    }

    window.addEventListener("pointerup", commitEraserSession);
    window.addEventListener("pointercancel", clearEraserSession);

    return () => {
      window.removeEventListener("pointerup", commitEraserSession);
      window.removeEventListener("pointercancel", clearEraserSession);
    };
  }, []);

  useEffect(() => {
    clearTextEditing();
  }, [selectedObjectId]);

  useEffect(() => {
    setInteraction(null);
    setEraserCursorPoint(null);
    setEraserTrailPoints([]);
    setEraserPreviewObjectIds([]);
    eraserSessionRef.current = null;
    clearTextEditing();
  }, [activeTool]);

  function updateObject(objectId: string, updates: Partial<CanvasObject>, options?: CanvasHistoryOptions) {
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
      options,
    );
  }

  function startTextEditing(objectId: string) {
    setEditingTextId(objectId);
    setTextEditHistoryKey(createId("history"));
  }

  function clearTextEditing() {
    setEditingTextId(null);
    setTextEditHistoryKey(null);
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

  function deleteObject(objectId: string, options?: CanvasHistoryOptions) {
    onChange(objects.filter((object) => object.id !== objectId), options);
    onSelectionChange(null);
    clearTextEditing();
    setInteraction(null);
  }

  function commitPendingErase() {
    const eraserSession = eraserSessionRef.current;
    if (!eraserSession) {
      return;
    }

    const pendingIds = new Set(eraserSession.pendingIds);
    eraserSessionRef.current = null;
    setEraserPreviewObjectIds([]);
    setInteraction((current) => (current?.kind === "eraser" ? null : current));

    if (pendingIds.size === 0) {
      return;
    }

    const currentObjects = objectsRef.current;
    const nextObjects = currentObjects.filter((item) => !pendingIds.has(item.id));

    if (nextObjects.length === currentObjects.length) {
      return;
    }

    objectsRef.current = nextObjects;
    onChange(nextObjects, { historyKey: eraserSession.historyKey });
    onSelectionChange(null);
    clearTextEditing();
  }

  function clearPendingErase() {
    eraserSessionRef.current = null;
    setEraserPreviewObjectIds([]);
    setInteraction((current) => (current?.kind === "eraser" ? null : current));
  }

  function queueEraseObject(object: CanvasObject, historyKey: string) {
    const eraserSession = eraserSessionRef.current;
    if (!eraserSession || eraserSession.historyKey !== historyKey) {
      return;
    }

    eraserSession.pendingIds.add(object.id);
    setEraserPreviewObjectIds(Array.from(eraserSession.pendingIds));
  }

  function startObjectErase(event: React.PointerEvent<Element>, object: CanvasObject) {
    event.stopPropagation();
    canvasRef.current?.focus();

    if (event.button !== 0) {
      return;
    }

    startEraser(event.clientX, event.clientY, object);
  }

  function continueObjectErase(event: React.PointerEvent<Element>, object: CanvasObject) {
    if (activeTool !== "Eraser") {
      return;
    }

    const targetObject = updateEraserCursor(event.clientX, event.clientY) ?? object;

    if (event.buttons !== 1 || !eraserSessionRef.current) {
      return;
    }

    event.stopPropagation();
    queueEraseObject(targetObject, eraserSessionRef.current.historyKey);
  }

  function startEraser(clientX: number, clientY: number, fallbackObject?: CanvasObject) {
    const targetObject = updateEraserCursor(clientX, clientY) ?? fallbackObject ?? null;
    const historyKey = createId("history");
    eraserSessionRef.current = {
      historyKey,
      pendingIds: new Set(),
    };
    onSelectionChange(null);
    clearTextEditing();
    setInteraction({
      erasedIds: [],
      historyKey,
      kind: "eraser",
    });

    if (targetObject) {
      queueEraseObject(targetObject, historyKey);
    }
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

    if (type === "penStroke") {
      object.fillColor = "transparent";
      object.penPoints = [{ x: 0, y: 0 }];
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

  function updateEraserCursor(clientX: number, clientY: number) {
    if (activeTool !== "Eraser") {
      return null;
    }

    const point = screenToWorld(clientX, clientY);
    if (!point) {
      return null;
    }

    const cursorPoint: EraserCursorPoint = {
      id: createId("eraser"),
      x: point.x,
      y: point.y,
    };
    const targetObject = getEraserTargetObject(cursorPoint, objects, viewState.zoom);
    const pendingIds = eraserSessionRef.current ? Array.from(eraserSessionRef.current.pendingIds) : [];
    const previewIds = targetObject ? Array.from(new Set([...pendingIds, targetObject.id])) : pendingIds;

    setEraserCursorPoint(cursorPoint);
    setEraserPreviewObjectIds(previewIds);
    setEraserTrailPoints((current) => [cursorPoint, ...current].slice(0, 4));

    return targetObject;
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

    const historyKey = createId("history");
    onChange([...objects, object], { historyKey });
    onSelectionChange(object.id);
    clearTextEditing();
    setInteraction({
      historyKey,
      kind: "create",
      id: object.id,
      tool: activeTool,
      startX,
      startY,
      moved: false,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function startPenDrawing(event: React.PointerEvent<HTMLDivElement>) {
    if (penSettings.mode === "laser") {
      startLaserDrawing(event);
      return;
    }

    const point = screenToWorld(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    const now = new Date().toISOString();
    const object: CanvasObject = {
      id: createId("object"),
      type: "penStroke",
      x: point.x,
      y: point.y,
      width: 1,
      height: 1,
      penPoints: [{ t: event.timeStamp, x: 0, y: 0 }],
      ...defaultCanvasStyle,
      fillColor: "transparent",
      createdAt: now,
      penInkDensity: penSettings.inkDensity,
      penMode: penSettings.mode,
      penSmoothing: penSettings.smoothing,
      strokeColor: penSettings.strokeColor,
      strokeWidth: penSettings.strokeWidth,
      updatedAt: now,
    };
    const historyKey = createId("history");

    onChange([...objects, object], { historyKey });
    onSelectionChange(object.id);
    clearTextEditing();
    setInteraction({
      historyKey,
      id: object.id,
      kind: "penDraw",
      moved: false,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function startLaserDrawing(event: React.PointerEvent<HTMLDivElement>) {
    const point = screenToWorld(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    const laserStroke: LaserStroke = {
      color: getLaserColor(penSettings.laserColor),
      id: createId("laser"),
      points: [{ t: event.timeStamp, x: point.x, y: point.y }],
    };

    setLaserStrokes((current) => [...current, laserStroke]);
    onSelectionChange(null);
    clearTextEditing();
    setInteraction({
      id: laserStroke.id,
      kind: "laserDraw",
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateLaserStroke(strokeId: string, point: CanvasPoint) {
    setLaserStrokes((current) =>
      current.map((stroke) =>
        stroke.id === strokeId
          ? {
              ...stroke,
              points: [...stroke.points, point],
            }
          : stroke,
      ),
    );
  }

  function scheduleLaserFade(strokeId: string) {
    const fadeDuration = laserFadeDurations[penSettings.laserFadeDuration ?? defaultPenSettings.laserFadeDuration];
    const timeoutId = window.setTimeout(() => {
      const intervalId = window.setInterval(() => {
        let shouldClearInterval = false;

        setLaserStrokes((current) =>
          current.flatMap((stroke) => {
            if (stroke.id !== strokeId) {
              return [stroke];
            }

            if (stroke.points.length <= 2) {
              shouldClearInterval = true;
              return [];
            }

            const trimCount = Math.max(1, Math.ceil(stroke.points.length * fadeDuration.trimRatio));
            return [{ ...stroke, points: stroke.points.slice(trimCount) }];
          }),
        );

        if (shouldClearInterval) {
          window.clearInterval(intervalId);
          laserFadeIntervalsRef.current.delete(strokeId);
        }
      }, fadeDuration.intervalMs);

      laserFadeIntervalsRef.current.set(strokeId, intervalId);
    }, fadeDuration.startDelayMs);

    laserFadeTimeoutsRef.current.push(timeoutId);
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
      { historyKey: interaction.historyKey },
    );
    setInteraction(null);
  }

  function shouldPan(event: React.PointerEvent<HTMLElement>) {
    return isSpacePressed || event.button === 1;
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    canvasRef.current?.focus();

    clearTextEditing();

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

    if (activeTool === "Pen") {
      startPenDrawing(event);
      return;
    }

    if (activeTool === "Eraser") {
      startEraser(event.clientX, event.clientY);
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
    const eraserTargetObject = updateEraserCursor(event.clientX, event.clientY);

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

    if (interaction.kind === "eraser") {
      if (eraserTargetObject) {
        queueEraseObject(eraserTargetObject, interaction.historyKey);
      }
      return;
    }

    if (interaction.kind === "laserDraw") {
      if (!point) {
        return;
      }

      updateLaserStroke(interaction.id, { t: event.timeStamp, x: point.x, y: point.y });
      return;
    }

    const object = objects.find((item) => item.id === interaction.id);
    if (!point || !object) {
      return;
    }

    const pointerX = alignToGrid(point.x);
    const pointerY = alignToGrid(point.y);

    if (interaction.kind === "penDraw") {
      const points = [...getPenAbsolutePoints(object), { t: event.timeStamp, x: point.x, y: point.y }];
      updateObject(object.id, normalizePenBounds(points), { historyKey: interaction.historyKey });
      setInteraction((current) => (current?.kind === "penDraw" ? { ...current, moved: true } : current));
      return;
    }

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
        { historyKey: interaction.historyKey },
      );
      return;
    }

    if (interaction.kind === "move") {
      if (object.type === "penStroke") {
        updateObject(
          object.id,
          {
            x: point.x - interaction.offsetX,
            y: point.y - interaction.offsetY,
          },
          { historyKey: interaction.historyKey },
        );
        return;
      }

      updateObject(
        object.id,
        {
          x: alignToGrid(pointerX - interaction.offsetX),
          y: alignToGrid(pointerY - interaction.offsetY),
        },
        { historyKey: interaction.historyKey },
      );
      return;
    }

    if (interaction.kind === "resize") {
      updateObject(
        object.id,
        getResizeUpdates(interaction, pointerX, pointerY, isSnapToGridEnabled),
        { historyKey: interaction.historyKey },
      );
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
        { historyKey: interaction.historyKey },
      );
      return;
    }

    if (interaction.kind === "endpoint") {
      const nextLine =
        interaction.endpoint === "start"
          ? { ...object, x1: pointerX, y1: pointerY }
          : { ...object, x2: pointerX, y2: pointerY };
      updateObject(object.id, normalizeLineBounds(nextLine, isSnapToGridEnabled), {
        historyKey: interaction.historyKey,
      });
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
        { historyKey: interaction.historyKey },
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

    updateObject(
      object.id,
      {
        x: alignToGrid(x),
        y: alignToGrid(y),
        width: alignToGrid(width),
        height: alignToGrid(height),
      },
      { historyKey: interaction.historyKey },
    );

    setInteraction((current) => (current?.kind === "create" ? { ...current, moved: true } : current));
  }

  function handleCanvasPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (interaction?.kind === "laserDraw") {
      scheduleLaserFade(interaction.id);
    }

    if (interaction?.kind === "penDraw") {
      const object = objects.find((item) => item.id === interaction.id);
      if (object && !interaction.moved) {
        const size = Math.max(1, object.strokeWidth);
        updateObject(
          object.id,
          normalizePenBounds([
            { t: event.timeStamp, x: object.x, y: object.y },
            { t: event.timeStamp + 16, x: object.x + size, y: object.y + size },
          ]),
          { historyKey: interaction.historyKey },
        );
      }
    }

    if (interaction?.kind === "create") {
      const object = objects.find((item) => item.id === interaction.id);
      if (object && (object.type === "line" || object.type === "arrow")) {
        if (!interaction.moved) {
          setInteraction({
            historyKey: interaction.historyKey,
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
        startTextEditing(object.id);
      }
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (interaction?.kind === "eraser") {
      commitPendingErase();
    } else {
      setInteraction(null);
    }
  }

  function handleCanvasPointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (interaction?.kind === "laserDraw") {
      scheduleLaserFade(interaction.id);
      setInteraction(null);
      return;
    }

    if (interaction?.kind === "eraser") {
      clearPendingErase();
    } else {
      setInteraction(null);
    }
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

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
      clearTextEditing();
      return;
    }

    if (activeTool === "Eraser") {
      startObjectErase(event, object);
      return;
    }

    if (shouldPan(event)) {
      clearTextEditing();
      startPan(event.clientX, event.clientY);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    onSelectionChange(object.id);

    if (activeTool === "Text Box" && (object.type === "rectangle" || object.type === "circle")) {
      clearTextEditing();
      return;
    }

    if (object.type === "textBox" && editingTextId === object.id) {
      return;
    }

    const point = screenToWorld(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    clearTextEditing();
    setInteraction({
      historyKey: createId("history"),
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
    clearTextEditing();
    const point = screenToWorld(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    setInteraction({
      historyKey: createId("history"),
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
    clearTextEditing();
    const point = screenToWorld(event.clientX, event.clientY);
    const points = getLinePoints(object);

    if (!point) {
      return;
    }

    setInteraction({
      historyKey: createId("history"),
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

  function startPenMove(event: React.PointerEvent<SVGPathElement>, object: CanvasObject) {
    event.stopPropagation();
    canvasRef.current?.focus();
    onSelectionChange(object.id);
    clearTextEditing();
    const point = screenToWorld(event.clientX, event.clientY);

    if (!point) {
      return;
    }

    setInteraction({
      historyKey: createId("history"),
      kind: "move",
      id: object.id,
      offsetX: point.x - object.x,
      offsetY: point.y - object.y,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function startEndpointDrag(
    event: React.PointerEvent<HTMLButtonElement>,
    object: CanvasObject,
    endpoint: "start" | "end",
  ) {
    event.stopPropagation();
    onSelectionChange(object.id);
    clearTextEditing();
    setInteraction({ endpoint, historyKey: createId("history"), id: object.id, kind: "endpoint" });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      if (interaction?.kind === "pendingLine") {
        deleteObject(interaction.id, { recordHistory: false });
      }
      clearTextEditing();
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
  const penObjects = objects.filter((object) => object.type === "penStroke");
  const boxObjects = objects.filter(
    (object) => object.type !== "line" && object.type !== "arrow" && object.type !== "penStroke",
  );
  const shouldUseCanvasHitLayer =
    activeTool !== "Pan" &&
    (activeTool === "Pen" ||
      activeTool === "Eraser" ||
      Boolean(toolToObjectType[activeTool]) ||
      isSpacePressed ||
      interaction?.kind === "pendingLine");

  return (
    <div
      ref={canvasRef}
      className={[
        "pointer-events-none absolute inset-0 z-20 touch-none overflow-visible outline-none",
        activeTool === "Pan" ? "cursor-grab" : "",
        interaction?.kind === "pan" ? "cursor-grabbing" : "",
      ].join(" ")}
      style={{
        cursor: activeTool === "Eraser" ? "none" : undefined,
        height: virtualBoardHeight,
        width: virtualBoardWidth,
      }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerLeave={() => {
        if (!eraserSessionRef.current) {
          setEraserCursorPoint(null);
          setEraserTrailPoints([]);
          setEraserPreviewObjectIds([]);
        }
      }}
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
            const isSelected = selectedObjectId === object.id && activeTool !== "Eraser";
            const isEraserPreviewed = activeTool === "Eraser" && eraserPreviewObjectIds.includes(object.id);

            return (
              <g key={object.id} opacity={isEraserPreviewed ? 0.35 : 1}>
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
                  className="pointer-events-auto"
                  markerEnd={object.type === "arrow" ? `url(#arrow-${object.id})` : undefined}
                  stroke={isSelected ? "#238157" : object.strokeColor}
                  strokeLinecap="round"
                  strokeWidth={Math.max(8, object.strokeWidth + 6)}
                  style={{ cursor: activeTool === "Eraser" ? "none" : "move" }}
                  x1={points.x1}
                  x2={points.x2}
                  y1={points.y1}
                  y2={points.y2}
                  opacity="0"
                  onPointerDown={(event) => {
                    if (activeTool === "Eraser") {
                      startObjectErase(event, object);
                      return;
                    }

                    startLineMove(event, object);
                  }}
                  onPointerEnter={(event) => continueObjectErase(event, object)}
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
          const isSelected = selectedObjectId === object.id && activeTool !== "Eraser";
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
          const isEraserPreviewed = activeTool === "Eraser" && eraserPreviewObjectIds.includes(object.id);

          return (
            <div
              key={object.id}
              className={[
                "pointer-events-auto absolute touch-none",
                activeTool === "Eraser" ? "" : isEditing ? "cursor-text" : "cursor-move",
                isSelected && activeTool !== "Eraser" ? "outline outline-2 outline-leaf-500 outline-offset-2" : "",
              ].join(" ")}
              style={{
                cursor: activeTool === "Eraser" ? "none" : undefined,
                height: object.height,
                left: object.x,
                opacity: isEraserPreviewed ? 0.35 : 1,
                top: object.y,
                transition: activeTool === "Eraser" ? "opacity 120ms ease" : undefined,
                width: object.width,
              }}
              onDoubleClick={() => {
                if (object.type === "textBox" || object.text !== undefined) {
                  onSelectionChange(object.id);
                  startTextEditing(object.id);
                }
              }}
              onPointerEnter={(event) => continueObjectErase(event, object)}
              onPointerDown={(event) => handleObjectPointerDown(event, object)}
            >
              <CanvasObjectView
                isEditing={isEditing}
                object={object}
                onFinishEditing={clearTextEditing}
                onTextChange={(text) =>
                  updateObject(
                    object.id,
                    { text },
                    textEditHistoryKey ? { historyKey: textEditHistoryKey } : undefined,
                  )
                }
              />
              {isSelected && activeTool !== "Eraser" ? (
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
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          {penObjects.map((object) => {
            const isSelected = selectedObjectId === object.id;
            const isActivelyDrawing = interaction?.kind === "penDraw" && interaction.id === object.id;
            const isEraserPreviewed = activeTool === "Eraser" && eraserPreviewObjectIds.includes(object.id);
            const path = getPenPath(object);
            const penMode = object.penMode ?? defaultPenSettings.mode;
            const shouldRenderInk = penMode === "ink";
            const shouldRenderHighlighter = penMode === "highlighter";

            return (
              <g key={object.id} opacity={isEraserPreviewed ? 0.35 : 1}>
                <path
                  className="pointer-events-auto"
                  d={path}
                  fill="none"
                  opacity="0"
                  stroke={object.strokeColor}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={Math.max(16, object.strokeWidth + 10)}
                  style={{ cursor: activeTool === "Eraser" ? "none" : "move" }}
                  onPointerDown={(event) => {
                    if (activeTool === "Eraser") {
                      startObjectErase(event, object);
                      return;
                    }

                    startPenMove(event, object);
                  }}
                  onPointerEnter={(event) => continueObjectErase(event, object)}
                />
                {shouldRenderInk ? (
                  getPenInkSegments(object).map((segment, index) => (
                    <path
                      key={`${object.id}-ink-${index}`}
                      d={segment.path}
                      fill="none"
                      stroke={object.strokeColor}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={segment.width}
                    />
                  ))
                ) : (
                  <path
                    d={path}
                    fill="none"
                    stroke={object.strokeColor}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={shouldRenderHighlighter ? 0.38 : 1}
                    strokeWidth={object.strokeWidth}
                    style={shouldRenderHighlighter ? { mixBlendMode: "multiply" } : undefined}
                  />
                )}
                {isSelected && activeTool !== "Eraser" && !isActivelyDrawing ? (
                  <rect
                    fill="none"
                    height={Math.max(1, object.height)}
                    pointerEvents="none"
                    stroke="#238157"
                    strokeDasharray="4 4"
                    width={Math.max(1, object.width)}
                    x={object.x}
                    y={object.y}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
        {laserStrokes.length ? (
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {laserStrokes.map((stroke) => {
              const path = getLaserPath(stroke.points);

              if (!path) {
                return null;
              }

              return (
                <g key={stroke.id}>
                  {laserGlowLayers.map((layer) => (
                    <path
                      key={`${stroke.id}-${layer.name}`}
                      d={path}
                      fill="none"
                      opacity={layer.opacity}
                      stroke={stroke.color}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={defaultLaserStrokeWidth * layer.widthMultiplier}
                    />
                  ))}
                  <path
                    d={path}
                    fill="none"
                    opacity="0.95"
                    stroke={stroke.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={defaultLaserStrokeWidth}
                  />
                </g>
              );
            })}
          </svg>
        ) : null}
      </div>
      {activeTool === "Eraser" && eraserCursorPoint ? (
        <div className="pointer-events-none absolute inset-0 z-30 overflow-visible">
          {eraserTrailPoints.slice(1).map((point, index) => (
            <EraserCursorRing key={point.id} point={point} size={eraserCursorSize - index * 3} opacity={0.16 - index * 0.035} zoom={viewState.zoom} />
          ))}
          <EraserCursorRing point={eraserCursorPoint} size={eraserCursorSize} opacity={0.92} zoom={viewState.zoom} />
        </div>
      ) : null}
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
          data-canvas-text-editor="true"
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

function getLaserPath(points: CanvasPoint[]) {
  if (points.length === 0) {
    return null;
  }

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} L ${point.x + 0.1} ${point.y + 0.1}`;
  }

  const [firstPoint, ...restPoints] = points;
  return [`M ${firstPoint.x} ${firstPoint.y}`, ...restPoints.map((point) => `L ${point.x} ${point.y}`)].join(" ");
}

function getLaserColor(value: string | undefined) {
  return typeof value === "string" && value.trim() ? value : defaultLaserColor;
}

function EraserCursorRing({
  opacity,
  point,
  size,
  zoom,
}: {
  opacity: number;
  point: EraserCursorPoint;
  size: number;
  zoom: number;
}) {
  const scaledSize = size / zoom;
  const borderWidth = Math.max(1.5 / zoom, 1);

  return (
    <div
      className="absolute rounded-full bg-white/20"
      style={{
        border: `${borderWidth}px solid rgba(15, 23, 42, 0.88)`,
        boxShadow: `0 0 0 ${Math.max(2 / zoom, 1)}px rgba(255, 255, 255, 0.86), 0 4px ${Math.max(
          12 / zoom,
          4,
        )}px rgba(15, 23, 42, 0.18)`,
        height: scaledSize,
        left: objectCanvasOriginX + point.x,
        opacity,
        top: objectCanvasOriginY + point.y,
        transform: "translate(-50%, -50%)",
        width: scaledSize,
      }}
    />
  );
}

function getEraserTargetObject(point: Pick<EraserCursorPoint, "x" | "y">, objects: CanvasObject[], zoom: number) {
  const radius = eraserCursorSize / (2 * zoom);

  return [...objects]
    .reverse()
    .find((object) => doesEraserOverlapObject(point, radius, object, zoom));
}

function doesEraserOverlapObject(
  point: Pick<EraserCursorPoint, "x" | "y">,
  radius: number,
  object: CanvasObject,
  zoom: number,
) {
  if (object.type === "line" || object.type === "arrow") {
    const points = getLinePoints(object);
    const hitPadding = Math.max(5 / zoom, object.strokeWidth / 2);

    return getPointToSegmentDistance(point, { x: points.x1, y: points.y1 }, { x: points.x2, y: points.y2 }) <= radius + hitPadding;
  }

  if (object.type === "penStroke") {
    const points = (object.penMode ?? defaultPenSettings.mode) === "ink" ? getPenInkRenderPoints(object) : getPenRenderPoints(object);
    const hitPadding = Math.max(4 / zoom, object.strokeWidth / 2);

    if (points.length < 2) {
      const firstPoint = points[0] ?? { x: object.x, y: object.y };
      return Math.hypot(point.x - firstPoint.x, point.y - firstPoint.y) <= radius + hitPadding;
    }

    return points.some((currentPoint, index) => {
      const nextPoint = points[index + 1];
      if (!nextPoint) {
        return false;
      }

      return getPointToSegmentDistance(point, currentPoint, nextPoint) <= radius + hitPadding;
    });
  }

  return doesCircleIntersectRect(point, radius, {
    height: object.height,
    width: object.width,
    x: object.x,
    y: object.y,
  });
}

function doesCircleIntersectRect(
  point: Pick<EraserCursorPoint, "x" | "y">,
  radius: number,
  rect: { height: number; width: number; x: number; y: number },
) {
  const closestX = clamp(point.x, rect.x, rect.x + rect.width);
  const closestY = clamp(point.y, rect.y, rect.y + rect.height);

  return Math.hypot(point.x - closestX, point.y - closestY) <= radius;
}

function getPointToSegmentDistance(
  point: Pick<EraserCursorPoint, "x" | "y">,
  startPoint: Pick<EraserCursorPoint, "x" | "y">,
  endPoint: Pick<EraserCursorPoint, "x" | "y">,
) {
  const segmentX = endPoint.x - startPoint.x;
  const segmentY = endPoint.y - startPoint.y;

  if (segmentX === 0 && segmentY === 0) {
    return Math.hypot(point.x - startPoint.x, point.y - startPoint.y);
  }

  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  const projection = clamp(
    ((point.x - startPoint.x) * segmentX + (point.y - startPoint.y) * segmentY) / segmentLengthSquared,
    0,
    1,
  );
  const projectedX = startPoint.x + segmentX * projection;
  const projectedY = startPoint.y + segmentY * projection;

  return Math.hypot(point.x - projectedX, point.y - projectedY);
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

function getPenAbsolutePoints(object: CanvasObject): CanvasPoint[] {
  const points = object.penPoints?.length ? object.penPoints : [{ x: 0, y: 0 }];

  return points.map((point) => ({
    ...(Number.isFinite(point.t) ? { t: point.t } : {}),
    x: object.x + point.x,
    y: object.y + point.y,
  }));
}

function normalizePenBounds(points: CanvasPoint[]): Partial<CanvasObject> {
  const nextPoints = points.length ? points : [{ x: 0, y: 0 }];
  const minX = Math.min(...nextPoints.map((point) => point.x));
  const minY = Math.min(...nextPoints.map((point) => point.y));
  const maxX = Math.max(...nextPoints.map((point) => point.x));
  const maxY = Math.max(...nextPoints.map((point) => point.y));

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    penPoints: nextPoints.map((point) => ({
      ...(Number.isFinite(point.t) ? { t: point.t } : {}),
      x: point.x - minX,
      y: point.y - minY,
    })),
  };
}

function getPenPath(object: CanvasObject) {
  const smoothing = object.penSmoothing ?? defaultPenSettings.smoothing;
  const points = getPenRenderPoints(object);

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} L ${point.x + 0.1} ${point.y + 0.1}`;
  }

  if (smoothing === "off" || points.length < 3) {
    return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  }

  const [firstPoint, ...remainingPoints] = points;
  const lastPoint = points[points.length - 1];
  let path = `M ${firstPoint.x} ${firstPoint.y}`;

  for (let index = 0; index < remainingPoints.length - 1; index += 1) {
    const currentPoint = remainingPoints[index];
    const nextPoint = remainingPoints[index + 1];
    const midPoint = {
      x: (currentPoint.x + nextPoint.x) / 2,
      y: (currentPoint.y + nextPoint.y) / 2,
    };

    path += ` Q ${currentPoint.x} ${currentPoint.y} ${midPoint.x} ${midPoint.y}`;
  }

  return `${path} L ${lastPoint.x} ${lastPoint.y}`;
}

function getPenInkSegments(object: CanvasObject) {
  const points = getPenInkRenderPoints(object);

  if (points.length < 2) {
    return [{ path: getPenPath(object), width: Math.max(1, object.strokeWidth) }];
  }

  const segmentMetrics = points.slice(0, -1).map((point, index) => {
    const nextPoint = points[index + 1];
    const distance = Math.max(0.1, Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y));
    const deltaTime = Number.isFinite(point.t) && Number.isFinite(nextPoint.t) ? Math.max(1, nextPoint.t! - point.t!) : null;

    return deltaTime ? distance / deltaTime : distance;
  });
  const averageMetric =
    segmentMetrics.reduce((metricTotal, metric) => metricTotal + metric, 0) / Math.max(1, segmentMetrics.length);
  let previousWidthFactor = 1;

  return points.slice(0, -1).map((point, index) => {
    const nextPoint = points[index + 1];
    const previousPoint = points[index - 1];
    const afterNextPoint = points[index + 2];
    const startPoint = previousPoint ? getMidpoint(previousPoint, point) : point;
    const endPoint = afterNextPoint ? getMidpoint(point, nextPoint) : nextPoint;
    const normalizedSpeed = segmentMetrics[index] / Math.max(0.01, averageMetric);
    const densityFactor = getInkDensityFactor(object.penInkDensity ?? defaultPenSettings.inkDensity);
    const baseWidthFactor = clamp(1.34 - normalizedSpeed * 0.34, 0.72, 1.3);
    const targetWidthFactor = clamp(
      1 + (baseWidthFactor - 1) * densityFactor,
      1 - 0.3 * densityFactor,
      1 + 0.32 * densityFactor,
    );
    const smoothedWidthFactor =
      index === 0 ? targetWidthFactor : previousWidthFactor * 0.72 + targetWidthFactor * 0.28;
    const startTaper = clamp((index + 1) / 3, 0.82, 1);
    const endTaper = clamp((segmentMetrics.length - index) / 3, 0.82, 1);

    previousWidthFactor = smoothedWidthFactor;

    return {
      path: `M ${startPoint.x} ${startPoint.y} Q ${point.x} ${point.y} ${endPoint.x} ${endPoint.y}`,
      width: Math.max(1, object.strokeWidth * smoothedWidthFactor * Math.min(startTaper, endTaper)),
    };
  });
}

function getMidpoint(point: CanvasPoint, otherPoint: CanvasPoint): CanvasPoint {
  const midpoint: CanvasPoint = {
    x: (point.x + otherPoint.x) / 2,
    y: (point.y + otherPoint.y) / 2,
  };

  if (Number.isFinite(point.t) && Number.isFinite(otherPoint.t)) {
    midpoint.t = (point.t! + otherPoint.t!) / 2;
  }

  return midpoint;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getInkDensityFactor(density: CanvasPenSettings["inkDensity"]) {
  return {
    high: 1.35,
    low: 0.65,
    medium: 1,
    veryHigh: 1.7,
  }[density];
}

function getPenRenderPoints(object: CanvasObject) {
  const smoothing = object.penSmoothing ?? defaultPenSettings.smoothing;
  const simplifiedPoints = getSimplifiedPenPoints(getPenAbsolutePoints(object), smoothing);

  return getSmoothedPenPoints(simplifiedPoints, smoothing);
}

function getPenInkRenderPoints(object: CanvasObject) {
  const smoothing = object.penSmoothing ?? defaultPenSettings.smoothing;
  const simplifiedPoints = getSimplifiedPenPoints(getPenAbsolutePoints(object), smoothing, { preserveDetail: true });

  return getSmoothedPenPoints(simplifiedPoints, smoothing, { preserveDetail: true });
}

function getSimplifiedPenPoints(
  points: CanvasPoint[],
  smoothing: CanvasObject["penSmoothing"],
  options: { preserveDetail?: boolean } = {},
) {
  const config = getPenSmoothingConfig(smoothing);
  const detailFactor = options.preserveDetail ? 0.45 : 1;
  const minimumDistance = config.minimumDistance * detailFactor;
  const pathTolerance = config.pathTolerance * detailFactor;

  if ((minimumDistance <= 0 && pathTolerance <= 0) || points.length < 3) {
    return points;
  }

  const distanceSimplifiedPoints = simplifyPenPointsByDistance(points, minimumDistance);

  return simplifyPenPointsByPath(distanceSimplifiedPoints, pathTolerance);
}

function simplifyPenPointsByDistance(points: CanvasPoint[], minimumDistance: number) {
  if (minimumDistance <= 0 || points.length < 3) {
    return points;
  }

  const simplifiedPoints: CanvasPoint[] = [points[0]];

  for (const point of points.slice(1, -1)) {
    const previousPoint = simplifiedPoints[simplifiedPoints.length - 1];
    const distance = Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);

    if (distance >= minimumDistance) {
      simplifiedPoints.push(point);
    }
  }

  simplifiedPoints.push(points[points.length - 1]);
  return simplifiedPoints;
}

function simplifyPenPointsByPath(points: CanvasPoint[], tolerance: number): CanvasPoint[] {
  if (tolerance <= 0 || points.length < 3) {
    return points;
  }

  const toleranceSquared = tolerance * tolerance;
  let farthestPointIndex = 0;
  let farthestDistanceSquared = 0;
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  for (let index = 1; index < points.length - 1; index += 1) {
    const distanceSquared = getSquaredSegmentDistance(points[index], firstPoint, lastPoint);

    if (distanceSquared > farthestDistanceSquared) {
      farthestDistanceSquared = distanceSquared;
      farthestPointIndex = index;
    }
  }

  if (farthestDistanceSquared <= toleranceSquared) {
    return [firstPoint, lastPoint];
  }

  const firstSegment = simplifyPenPointsByPath(points.slice(0, farthestPointIndex + 1), tolerance);
  const secondSegment = simplifyPenPointsByPath(points.slice(farthestPointIndex), tolerance);

  return [...firstSegment.slice(0, -1), ...secondSegment];
}

function getSquaredSegmentDistance(point: CanvasPoint, startPoint: CanvasPoint, endPoint: CanvasPoint) {
  const segmentX = endPoint.x - startPoint.x;
  const segmentY = endPoint.y - startPoint.y;

  if (segmentX === 0 && segmentY === 0) {
    return getSquaredDistance(point, startPoint);
  }

  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  const projection = clamp(
    ((point.x - startPoint.x) * segmentX + (point.y - startPoint.y) * segmentY) / segmentLengthSquared,
    0,
    1,
  );
  const projectedPoint = {
    x: startPoint.x + segmentX * projection,
    y: startPoint.y + segmentY * projection,
  };

  return getSquaredDistance(point, projectedPoint);
}

function getSquaredDistance(point: CanvasPoint, otherPoint: Pick<CanvasPoint, "x" | "y">) {
  const dx = point.x - otherPoint.x;
  const dy = point.y - otherPoint.y;

  return dx * dx + dy * dy;
}

function getSmoothedPenPoints(
  points: CanvasPoint[],
  smoothing: CanvasObject["penSmoothing"],
  options: { preserveDetail?: boolean } = {},
) {
  const baseIterations = getPenSmoothingConfig(smoothing).curveIterations;
  const iterations = options.preserveDetail ? Math.min(2, baseIterations) : baseIterations;

  if (iterations <= 0 || points.length < 3) {
    return points;
  }

  let smoothedPoints = points;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const nextPoints: CanvasPoint[] = [smoothedPoints[0]];

    for (let index = 0; index < smoothedPoints.length - 1; index += 1) {
      const currentPoint = smoothedPoints[index];
      const nextPoint = smoothedPoints[index + 1];

      nextPoints.push(interpolatePenPoint(currentPoint, nextPoint, 0.25));
      nextPoints.push(interpolatePenPoint(currentPoint, nextPoint, 0.75));
    }

    nextPoints.push(smoothedPoints[smoothedPoints.length - 1]);
    smoothedPoints = nextPoints;
  }

  return smoothedPoints;
}

function getPenSmoothingConfig(smoothing: CanvasObject["penSmoothing"]) {
  return {
    high: {
      curveIterations: 3,
      minimumDistance: 8,
      pathTolerance: 18,
    },
    light: {
      curveIterations: 0,
      minimumDistance: 2,
      pathTolerance: 2.5,
    },
    medium: {
      curveIterations: 1,
      minimumDistance: 4,
      pathTolerance: 8,
    },
    off: {
      curveIterations: 0,
      minimumDistance: 0,
      pathTolerance: 0,
    },
    veryHigh: {
      curveIterations: 4,
      minimumDistance: 10,
      pathTolerance: 32,
    },
  }[smoothing ?? defaultPenSettings.smoothing];
}

function interpolatePenPoint(startPoint: CanvasPoint, endPoint: CanvasPoint, amount: number): CanvasPoint {
  const interpolatedPoint: CanvasPoint = {
    x: startPoint.x + (endPoint.x - startPoint.x) * amount,
    y: startPoint.y + (endPoint.y - startPoint.y) * amount,
  };

  if (Number.isFinite(startPoint.t) && Number.isFinite(endPoint.t)) {
    interpolatedPoint.t = startPoint.t! + (endPoint.t! - startPoint.t!) * amount;
  }

  return interpolatedPoint;
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
