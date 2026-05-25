import {
  defaultCanvasStyle,
  gridSize,
  minObjectSize,
  objectCanvasOriginX,
  objectCanvasOriginY,
  snapToGrid,
} from "@/lib/canvasStyle";
import type {
  CanvasConnectorArrowDirection,
  CanvasConnectorAnchor,
  CanvasConnectorStyle,
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

export function getLineRenderPoints(object: CanvasObject, objects: CanvasObject[]) {
  const connectedPoints = getConnectedLinePoints(object, objects);
  return connectedPoints ?? getLinePoints(object);
}

export function getConnectorStyle(object: CanvasObject): CanvasConnectorStyle {
  if (object.connectorStyle === "elbow" || object.connectorStyle === "curve") {
    return object.connectorStyle;
  }

  return "straight";
}

export function getArrowDirection(object: CanvasObject): CanvasConnectorArrowDirection {
  if (
    object.arrowDirection === "none" ||
    object.arrowDirection === "forward" ||
    object.arrowDirection === "backward" ||
    object.arrowDirection === "both"
  ) {
    return object.arrowDirection;
  }

  return object.type === "arrow" ? "forward" : "none";
}

export function getLineRenderSegments(object: CanvasObject, objects: CanvasObject[]) {
  const points = getLineRenderPoints(object, objects);
  const connectorStyle = getConnectorStyle(object);

  if (!isConnectedLine(object)) {
    return {
      pathData: `M ${points.x1} ${points.y1} L ${points.x2} ${points.y2}`,
      points,
      polylinePoints: `${points.x1},${points.y1} ${points.x2},${points.y2}`,
      style: "straight" as const,
    };
  }

  if (connectorStyle === "curve") {
    const pathData = getCurveConnectorPath(points, object.sourceAnchor, object.targetAnchor);

    return {
      pathData,
      points,
      polylinePoints: `${points.x1},${points.y1} ${points.x2},${points.y2}`,
      style: "curve" as const,
    };
  }

  if (connectorStyle === "elbow") {
    const routePoints = getElbowConnectorPoints(points, object.sourceAnchor, object.targetAnchor);
    const pathData = routePoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    return {
      pathData,
      points,
      polylinePoints: routePoints.map((point) => `${point.x},${point.y}`).join(" "),
      style: "elbow" as const,
    };
  }

  return {
    pathData: `M ${points.x1} ${points.y1} L ${points.x2} ${points.y2}`,
    points,
    polylinePoints: `${points.x1},${points.y1} ${points.x2},${points.y2}`,
    style: "straight" as const,
  };
}

export function getLineLabelPoint(object: CanvasObject, objects: CanvasObject[]) {
  const points = getLineRenderPoints(object, objects);

  if (isConnectedLine(object) && getConnectorStyle(object) === "elbow") {
    const routePoints = getElbowConnectorPoints(points, object.sourceAnchor, object.targetAnchor);
    const middleIndex = Math.floor(routePoints.length / 2);
    const previousPoint = routePoints[Math.max(0, middleIndex - 1)];
    const nextPoint = routePoints[middleIndex] ?? previousPoint;

    return {
      x: previousPoint.x + (nextPoint.x - previousPoint.x) / 2,
      y: previousPoint.y + (nextPoint.y - previousPoint.y) / 2,
    };
  }

  return {
    x: points.x1 + (points.x2 - points.x1) / 2,
    y: points.y1 + (points.y2 - points.y1) / 2,
  };
}

function getElbowConnectorPoints(
  points: { x1: number; x2: number; y1: number; y2: number },
  sourceAnchor: CanvasConnectorAnchor,
  targetAnchor: CanvasConnectorAnchor,
) {
  const exitDistance = 36;
  const sourceNormal = getAnchorNormal(sourceAnchor);
  const targetNormal = getAnchorNormal(targetAnchor);
  const start = { x: points.x1, y: points.y1 };
  const end = { x: points.x2, y: points.y2 };
  const sourceExit = {
    x: start.x + sourceNormal.x * exitDistance,
    y: start.y + sourceNormal.y * exitDistance,
  };
  const targetEntry = {
    x: end.x + targetNormal.x * exitDistance,
    y: end.y + targetNormal.y * exitDistance,
  };
  const isSourceHorizontal = sourceNormal.x !== 0;
  const isTargetHorizontal = targetNormal.x !== 0;

  if (isSourceHorizontal && isTargetHorizontal) {
    const midX = sourceExit.x + (targetEntry.x - sourceExit.x) / 2;
    return [start, sourceExit, { x: midX, y: sourceExit.y }, { x: midX, y: targetEntry.y }, targetEntry, end];
  }

  if (!isSourceHorizontal && !isTargetHorizontal) {
    const midY = sourceExit.y + (targetEntry.y - sourceExit.y) / 2;
    return [start, sourceExit, { x: sourceExit.x, y: midY }, { x: targetEntry.x, y: midY }, targetEntry, end];
  }

  const corner = isSourceHorizontal
    ? { x: targetEntry.x, y: sourceExit.y }
    : { x: sourceExit.x, y: targetEntry.y };

  return [start, sourceExit, corner, targetEntry, end];
}

function getCurveConnectorPath(
  points: { x1: number; x2: number; y1: number; y2: number },
  sourceAnchor: CanvasConnectorAnchor,
  targetAnchor: CanvasConnectorAnchor,
) {
  const sourceNormal = getAnchorNormal(sourceAnchor);
  const targetNormal = getAnchorNormal(targetAnchor);
  const dx = points.x2 - points.x1;
  const dy = points.y2 - points.y1;
  const controlDistance = Math.min(240, Math.max(72, Math.hypot(dx, dy) * 0.45));
  const c1 = {
    x: points.x1 + sourceNormal.x * controlDistance,
    y: points.y1 + sourceNormal.y * controlDistance,
  };
  const c2 = {
    x: points.x2 + targetNormal.x * controlDistance,
    y: points.y2 + targetNormal.y * controlDistance,
  };

  return `M ${points.x1} ${points.y1} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${points.x2} ${points.y2}`;
}

function getAnchorNormal(anchor: CanvasConnectorAnchor) {
  if (anchor === "top") {
    return { x: 0, y: -1 };
  }

  if (anchor === "right") {
    return { x: 1, y: 0 };
  }

  if (anchor === "bottom") {
    return { x: 0, y: 1 };
  }

  return { x: -1, y: 0 };
}

export function getConnectorAnchorPoint(object: CanvasObject, anchor: CanvasConnectorAnchor) {
  if (anchor === "top") {
    return { x: object.x + object.width / 2, y: object.y };
  }

  if (anchor === "right") {
    return { x: object.x + object.width, y: object.y + object.height / 2 };
  }

  if (anchor === "bottom") {
    return { x: object.x + object.width / 2, y: object.y + object.height };
  }

  return { x: object.x, y: object.y + object.height / 2 };
}

export function getOppositeConnectorAnchor(anchor: CanvasConnectorAnchor): CanvasConnectorAnchor {
  if (anchor === "top") {
    return "bottom";
  }

  if (anchor === "right") {
    return "left";
  }

  if (anchor === "bottom") {
    return "top";
  }

  return "right";
}

export function syncConnectedLines(objects: CanvasObject[], changedObjectIds?: Set<string>) {
  const objectsById = new Map(objects.map((object) => [object.id, object]));

  return objects.map((object) => {
    if (!isConnectedLine(object)) {
      return object;
    }

    if (
      changedObjectIds &&
      !changedObjectIds.has(object.sourceObjectId) &&
      !changedObjectIds.has(object.targetObjectId)
    ) {
      return object;
    }

    const connectedPoints = getConnectedLinePoints(object, objectsById);
    if (!connectedPoints) {
      return object;
    }

    return {
      ...object,
      ...normalizeLineBounds(
        {
          ...object,
          ...connectedPoints,
        },
        false,
      ),
    };
  });
}

export function removeObjectsAndConnectedLines(objects: CanvasObject[], objectIds: Set<string>) {
  return objects.filter((object) => {
    if (objectIds.has(object.id)) {
      return false;
    }

    if (!isConnectedLine(object)) {
      return true;
    }

    return !objectIds.has(object.sourceObjectId) && !objectIds.has(object.targetObjectId);
  });
}

function isConnectedLine(object: CanvasObject): object is CanvasObject & {
  sourceAnchor: CanvasConnectorAnchor;
  sourceObjectId: string;
  targetAnchor: CanvasConnectorAnchor;
  targetObjectId: string;
} {
  return (
    (object.type === "line" || object.type === "arrow") &&
    typeof object.sourceObjectId === "string" &&
    typeof object.targetObjectId === "string" &&
    isConnectorAnchor(object.sourceAnchor) &&
    isConnectorAnchor(object.targetAnchor)
  );
}

function isConnectorAnchor(value: unknown): value is CanvasConnectorAnchor {
  return value === "top" || value === "right" || value === "bottom" || value === "left";
}

function getConnectedLinePoints(object: CanvasObject, objects: CanvasObject[] | Map<string, CanvasObject>) {
  if (!isConnectedLine(object)) {
    return null;
  }

  const sourceObject = Array.isArray(objects) ? objects.find((item) => item.id === object.sourceObjectId) : objects.get(object.sourceObjectId);
  const targetObject = Array.isArray(objects) ? objects.find((item) => item.id === object.targetObjectId) : objects.get(object.targetObjectId);

  if (!sourceObject || !targetObject) {
    return null;
  }

  const sourcePoint = getConnectorAnchorPoint(sourceObject, object.sourceAnchor);
  const targetPoint = getConnectorAnchorPoint(targetObject, object.targetAnchor);

  return {
    x1: sourcePoint.x,
    y1: sourcePoint.y,
    x2: targetPoint.x,
    y2: targetPoint.y,
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

  if (type === "diamond") {
    return defaults.diamond;
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
