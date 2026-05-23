import {
  defaultCanvasStyle,
  minObjectSize,
  objectCanvasOriginX,
  objectCanvasOriginY,
  snapToGrid,
} from "@/lib/canvasStyle";
import type {
  CanvasCreationToolDefaults,
  CanvasObject,
  CanvasObjectType,
  CanvasViewState,
} from "@/types/workspace";
import type { ResizeInteraction } from "@/components/workspace/canvas/canvasLayerTypes";

export function screenToWorldPoint(
  bounds: DOMRect | undefined,
  viewState: CanvasViewState,
  clientX: number,
  clientY: number,
) {
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

export function getResizeUpdates(
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

export function getLinePoints(object: CanvasObject) {
  return {
    x1: object.x1 ?? object.x,
    y1: object.y1 ?? object.y + object.height / 2,
    x2: object.x2 ?? object.x + object.width,
    y2: object.y2 ?? object.y + object.height / 2,
  };
}

export function normalizeLineBounds(object: CanvasObject, shouldSnap = true): Partial<CanvasObject> {
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

export function getLineSelectionBox(points: { x1: number; x2: number; y1: number; y2: number }) {
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

export function getStrokeDashArray(object: CanvasObject) {
  const strokeStyle = object.strokeStyle ?? defaultCanvasStyle.strokeStyle;

  if (strokeStyle === "dashed") {
    return `${Math.max(8, object.strokeWidth * 4)} ${Math.max(6, object.strokeWidth * 3)}`;
  }

  if (strokeStyle === "dotted") {
    return `0 ${Math.max(4, object.strokeWidth * 3)}`;
  }

  return undefined;
}

export function getCreationDefaultsForType(type: CanvasObjectType, defaults: CanvasCreationToolDefaults) {
  if (type === "arrow") {
    return defaults.arrow;
  }

  if (type === "circle") {
    return defaults.circle;
  }

  if (type === "line") {
    return defaults.line;
  }

  if (type === "rectangle") {
    return defaults.rectangle;
  }

  if (type === "textBox") {
    return defaults.textBox;
  }

  return {};
}
