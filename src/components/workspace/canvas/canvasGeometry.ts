import {
  defaultCanvasStyle,
  gridSize,
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

const gridDotOffset = gridSize / 2;

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

export function alignCanvasX(value: number, shouldSnap: boolean) {
  return shouldSnap ? alignToVisibleGridDot(objectCanvasOriginX + value) - objectCanvasOriginX : value;
}

export function alignCanvasY(value: number, shouldSnap: boolean) {
  return shouldSnap ? alignToVisibleGridDot(objectCanvasOriginY + value) - objectCanvasOriginY : value;
}

export function alignCanvasSize(value: number, shouldSnap: boolean) {
  return shouldSnap ? snapToGrid(value) : value;
}

export function getMinimumCanvasSize(shouldSnap: boolean) {
  return shouldSnap ? Math.ceil(minObjectSize / gridSize) * gridSize : minObjectSize;
}

function alignToVisibleGridDot(value: number) {
  return snapToGrid(value - gridDotOffset) + gridDotOffset;
}

export function getResizeUpdates(
  interaction: ResizeInteraction,
  pointerX: number,
  pointerY: number,
  shouldSnap: boolean,
): Partial<CanvasObject> {
  const dx = pointerX - interaction.pointerX;
  const dy = pointerY - interaction.pointerY;
  const minimumSize = getMinimumCanvasSize(shouldSnap);
  let x = interaction.startX;
  let y = interaction.startY;
  let width = interaction.startWidth;
  let height = interaction.startHeight;

  if (interaction.handle.includes("e")) {
    width = Math.max(minimumSize, alignCanvasSize(interaction.startWidth + dx, shouldSnap));
  }

  if (interaction.handle.includes("s")) {
    height = Math.max(minimumSize, alignCanvasSize(interaction.startHeight + dy, shouldSnap));
  }

  if (interaction.handle.includes("w")) {
    width = Math.max(minimumSize, alignCanvasSize(interaction.startWidth - dx, shouldSnap));
    x = alignCanvasX(interaction.startX + interaction.startWidth - width, shouldSnap);
  }

  if (interaction.handle.includes("n")) {
    height = Math.max(minimumSize, alignCanvasSize(interaction.startHeight - dy, shouldSnap));
    y = alignCanvasY(interaction.startY + interaction.startHeight - height, shouldSnap);
  }

  return {
    height: alignCanvasSize(height, shouldSnap),
    width: alignCanvasSize(width, shouldSnap),
    x: alignCanvasX(x, shouldSnap),
    y: alignCanvasY(y, shouldSnap),
  };
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
  const points = getLinePoints(object);
  const x1 = alignCanvasX(points.x1, shouldSnap);
  const y1 = alignCanvasY(points.y1, shouldSnap);
  const x2 = alignCanvasX(points.x2, shouldSnap);
  const y2 = alignCanvasY(points.y2, shouldSnap);
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const width = Math.max(1, Math.abs(x2 - x1));
  const height = Math.max(1, Math.abs(y2 - y1));

  return {
    x: minX,
    y: minY,
    width,
    height,
    x1,
    y1,
    x2,
    y2,
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
