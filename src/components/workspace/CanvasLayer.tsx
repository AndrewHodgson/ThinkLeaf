"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CanvasCreationToolDefaults,
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
  defaultLaserStrokeWidth,
  defaultObjectSizes,
  defaultPenSettings,
  maxZoom,
  minZoom,
  objectCanvasOriginX,
  objectCanvasOriginY,
  virtualBoardHeight,
  virtualBoardWidth,
  zoomStep,
} from "@/lib/canvasStyle";
import { createId } from "@/lib/workspaceUtils";
import {
  CanvasObjectView,
  EndpointHandle,
  EraserCursorRing,
  ResizeHandleButton,
} from "@/components/workspace/canvas/canvasObjectViews";
import {
  alignCanvasSize,
  alignCanvasX,
  alignCanvasY,
  getCreationDefaultsForType,
  getLinePoints,
  getLineSelectionBox,
  getMinimumCanvasSize,
  getResizeUpdates,
  getStrokeDashArray,
  normalizeLineBounds,
  screenToWorldPoint,
} from "@/components/workspace/canvas/canvasGeometry";
import { eraserCursorSize, getEraserTargetObject } from "@/components/workspace/canvas/eraserHitTesting";
import {
  getLaserColor,
  getLaserPath,
  laserFadeDurations,
  laserGlowLayers,
} from "@/components/workspace/canvas/laserRendering";
import {
  getPenAbsolutePoints,
  getPenInkSegments,
  getPenPath,
  normalizePenBounds,
} from "@/components/workspace/canvas/penRendering";
import type {
  EraserCursorPoint,
  Interaction,
  LaserStroke,
  ResizeHandle,
} from "@/components/workspace/canvas/canvasLayerTypes";

type CanvasLayerProps = {
  activeTool: CanvasTool;
  creationToolDefaults: CanvasCreationToolDefaults;
  isSnapToGridEnabled: boolean;
  objects: CanvasObject[];
  penSettings: CanvasPenSettings;
  selectedObjectId: string | null;
  viewState: CanvasViewState;
  onChange: (objects: CanvasObject[], options?: CanvasHistoryOptions) => void;
  onSelectionChange: (objectId: string | null) => void;
  onToolChange: (tool: CanvasTool) => void;
  onViewStateChange: (viewState: CanvasViewState) => void;
};

const toolToObjectType: Partial<Record<CanvasTool, CanvasObjectType>> = {
  Rectangle: "rectangle",
  Circle: "circle",
  "Text Box": "textBox",
  Line: "line",
  Arrow: "arrow",
  Pen: "penStroke",
};

export function CanvasLayer({
  activeTool,
  creationToolDefaults,
  isSnapToGridEnabled,
  objects,
  penSettings,
  selectedObjectId,
  viewState,
  onChange,
  onSelectionChange,
  onToolChange,
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

  function alignXToGrid(value: number) {
    return alignCanvasX(value, isSnapToGridEnabled);
  }

  function alignYToGrid(value: number) {
    return alignCanvasY(value, isSnapToGridEnabled);
  }

  function alignSizeToGrid(value: number) {
    return alignCanvasSize(value, isSnapToGridEnabled);
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
    const creationDefaults = getCreationDefaultsForType(type, creationToolDefaults);
    const object: CanvasObject = {
      id: createId("object"),
      type,
      x: startX,
      y: startY,
      width: alignSizeToGrid(size.width),
      height: alignSizeToGrid(size.height),
      text: size.text,
      ...defaultCanvasStyle,
      ...creationDefaults,
      createdAt: now,
      updatedAt: now,
    };

    if (type === "line" || type === "arrow") {
      object.x1 = startX;
      object.y1 = startY;
      object.x2 = startX;
      object.y2 = startY;
      object.width = 1;
      object.height = 1;
    }

    if (type === "penStroke") {
      object.fillColor = "transparent";
      object.penPoints = [{ x: 0, y: 0 }];
    }

    return object;
  }

  function screenToWorld(clientX: number, clientY: number) {
    return screenToWorldPoint(canvasRef.current?.getBoundingClientRect(), viewState, clientX, clientY);
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
    setInteraction({
      kind: "pan",
      pointerX: clientX,
      pointerY: clientY,
      startPanX: viewState.panX,
      startPanY: viewState.panY,
    });
  }

  function startCreation(event: React.PointerEvent<HTMLDivElement>) {
    const point = screenToWorld(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    const startX = alignXToGrid(point.x);
    const startY = alignYToGrid(point.y);
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

  function startPenDrawing(event: React.PointerEvent<Element>) {
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

  function startLaserDrawing(event: React.PointerEvent<Element>) {
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
          x2: alignXToGrid(point.x),
          y2: alignYToGrid(point.y),
        },
        isSnapToGridEnabled,
      ),
      { historyKey: interaction.historyKey },
    );
    onSelectionChange(object.id);
    onToolChange("Select");
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
      updateViewState({
        panX: interaction.startPanX + event.clientX - interaction.pointerX,
        panY: interaction.startPanY + event.clientY - interaction.pointerY,
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

    const pointerX = alignXToGrid(point.x);
    const pointerY = alignYToGrid(point.y);

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
          x: alignXToGrid(pointerX - interaction.offsetX),
          y: alignYToGrid(pointerY - interaction.offsetY),
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
      const dx = alignSizeToGrid(pointerX - interaction.pointerX);
      const dy = alignSizeToGrid(pointerY - interaction.pointerY);
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
    const minimumSize = getMinimumCanvasSize(isSnapToGridEnabled);
    const width = Math.max(minimumSize, Math.abs(pointerX - interaction.startX));
    const height = Math.max(minimumSize, Math.abs(pointerY - interaction.startY));

    updateObject(
      object.id,
      {
        x: alignXToGrid(x),
        y: alignYToGrid(y),
        width: alignSizeToGrid(width),
        height: alignSizeToGrid(height),
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
      } else if (
        object?.type === "rectangle" ||
        object?.type === "circle" ||
        object?.type === "line" ||
        object?.type === "arrow"
      ) {
        onToolChange("Select");
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

    if (activeTool === "Pan") {
      clearTextEditing();
      startPan(event.clientX, event.clientY);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === "Pen") {
      startPenDrawing(event);
      return;
    }

    if (event.target instanceof HTMLTextAreaElement) {
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
      pointerX: alignXToGrid(point.x),
      pointerY: alignYToGrid(point.y),
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

    if (activeTool === "Pan") {
      clearTextEditing();
      startPan(event.clientX, event.clientY);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === "Pen") {
      startPenDrawing(event);
      return;
    }

    if (activeTool !== "Select") {
      return;
    }

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
      pointerX: alignXToGrid(point.x),
      pointerY: alignYToGrid(point.y),
      startX1: points.x1,
      startX2: points.x2,
      startY1: points.y1,
      startY2: points.y2,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function startPenMove(event: React.PointerEvent<SVGPathElement>, object: CanvasObject) {
    event.stopPropagation();
    canvasRef.current?.focus();

    if (activeTool === "Pan") {
      clearTextEditing();
      startPan(event.clientX, event.clientY);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === "Pen") {
      startPenDrawing(event);
      return;
    }

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

    if (activeTool !== "Select") {
      return;
    }

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
  const activeToolCursor = getActiveToolCursor(activeTool, interaction?.kind === "pan");

  return (
    <div
      ref={canvasRef}
      className={[
        "pointer-events-none absolute inset-0 z-20 touch-none overflow-visible outline-none",
        activeTool === "Pan" ? (interaction?.kind === "pan" ? "cursor-grabbing" : "cursor-grab") : "",
        activeTool === "Pen" ? "cursor-crosshair" : "",
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
                  style={{ cursor: activeTool === "Eraser" ? "none" : activeToolCursor }}
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
                activeTool === "Eraser" ? "" : getObjectCursorClass(activeTool, isEditing, interaction?.kind === "pan"),
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
                  style={{ cursor: activeTool === "Eraser" ? "none" : activeToolCursor }}
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
            <EraserCursorRing
              key={point.id}
              opacity={0.16 - index * 0.035}
              point={point}
              size={eraserCursorSize - index * 3}
              zoom={viewState.zoom}
            />
          ))}
          <EraserCursorRing
            opacity={0.92}
            point={eraserCursorPoint}
            size={eraserCursorSize}
            zoom={viewState.zoom}
          />
        </div>
      ) : null}
    </div>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function getActiveToolCursor(activeTool: CanvasTool, isPanning: boolean) {
  if (activeTool === "Pan") {
    return isPanning ? "grabbing" : "grab";
  }

  if (activeTool === "Pen") {
    return "crosshair";
  }

  if (activeTool === "Select") {
    return "move";
  }

  return undefined;
}

function getObjectCursorClass(activeTool: CanvasTool, isEditing: boolean, isPanning: boolean) {
  if (isEditing) {
    return "cursor-text";
  }

  if (activeTool === "Pan") {
    return isPanning ? "cursor-grabbing" : "cursor-grab";
  }

  if (activeTool === "Pen") {
    return "cursor-crosshair";
  }

  return activeTool === "Select" ? "cursor-move" : "";
}
