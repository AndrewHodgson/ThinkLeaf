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

export function getLineRenderSegments(
  object: CanvasObject,
  objects: CanvasObject[],
  overridePoints?: { x1: number; x2: number; y1: number; y2: number },
) {
  const points = overridePoints ?? getLineRenderPoints(object, objects);
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
    const pathData = getCurveConnectorPath(points, object);

    return {
      pathData,
      points,
      polylinePoints: `${points.x1},${points.y1} ${points.x2},${points.y2}`,
      style: "curve" as const,
    };
  }

  if (connectorStyle === "elbow") {
    const routePoints = getElbowConnectorPoints(points, object);
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
    const routePoints = getElbowConnectorPoints(points, object);
    const middleIndex = Math.floor(routePoints.length / 2);
    const previousPoint = routePoints[Math.max(0, middleIndex - 1)];
    const nextPoint = routePoints[middleIndex] ?? previousPoint;

    return {
      x: previousPoint.x + (nextPoint.x - previousPoint.x) / 2,
      y: previousPoint.y + (nextPoint.y - previousPoint.y) / 2,
    };
  }

  if (isConnectedLine(object) && getConnectorStyle(object) === "curve") {
    const controlPoint = getCurveConnectorControlPoint(points, object);

    return {
      x: (points.x1 + 2 * controlPoint.x + points.x2) / 4,
      y: (points.y1 + 2 * controlPoint.y + points.y2) / 4,
    };
  }

  return {
    x: points.x1 + (points.x2 - points.x1) / 2,
    y: points.y1 + (points.y2 - points.y1) / 2,
  };
}

export function getElbowConnectorPoints(
  points: { x1: number; x2: number; y1: number; y2: number },
  object: CanvasObject & {
    sourceAnchor: CanvasConnectorAnchor;
    targetAnchor: CanvasConnectorAnchor;
  },
) {
  const exitDistance = 36;
  const sourceNormal = getAnchorNormal(object.sourceAnchor);
  const targetNormal = getAnchorNormal(object.targetAnchor);
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
    const midX = sourceExit.x + (targetEntry.x - sourceExit.x) / 2 + (object.elbowBendOffsetX ?? 0);
    return [start, sourceExit, { x: midX, y: sourceExit.y }, { x: midX, y: targetEntry.y }, targetEntry, end];
  }

  if (!isSourceHorizontal && !isTargetHorizontal) {
    const midY = sourceExit.y + (targetEntry.y - sourceExit.y) / 2 + (object.elbowBendOffsetY ?? 0);
    return [start, sourceExit, { x: sourceExit.x, y: midY }, { x: targetEntry.x, y: midY }, targetEntry, end];
  }

  const corner = isSourceHorizontal
    ? { x: targetEntry.x + (object.elbowBendOffsetX ?? 0), y: sourceExit.y }
    : { x: sourceExit.x, y: targetEntry.y + (object.elbowBendOffsetY ?? 0) };

  return [start, sourceExit, corner, targetEntry, end];
}

export function getElbowConnectorControlPoints(
  points: { x1: number; x2: number; y1: number; y2: number },
  object: CanvasObject & {
    sourceAnchor: CanvasConnectorAnchor;
    targetAnchor: CanvasConnectorAnchor;
  },
) {
  const sourceNormal = getAnchorNormal(object.sourceAnchor);
  const targetNormal = getAnchorNormal(object.targetAnchor);
  const isSourceHorizontal = sourceNormal.x !== 0;
  const isTargetHorizontal = targetNormal.x !== 0;
  const routePoints = getElbowConnectorPoints(points, object);

  if (isSourceHorizontal === isTargetHorizontal) {
    return routePoints.slice(2, 4);
  }

  return [routePoints[2]];
}

export function getCurveConnectorControlPoint(
  points: { x1: number; x2: number; y1: number; y2: number },
  object: CanvasObject & {
    sourceAnchor: CanvasConnectorAnchor;
    targetAnchor: CanvasConnectorAnchor;
  },
) {
  const sourceNormal = getAnchorNormal(object.sourceAnchor);
  const targetNormal = getAnchorNormal(object.targetAnchor);
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
  const defaultControl = {
    x: (points.x1 + 3 * c1.x + 3 * c2.x + points.x2) / 8,
    y: (points.y1 + 3 * c1.y + 3 * c2.y + points.y2) / 8,
  };

  return {
    x: defaultControl.x + (object.curveControlOffsetX ?? 0),
    y: defaultControl.y + (object.curveControlOffsetY ?? 0),
  };
}

function getCurveConnectorPath(
  points: { x1: number; x2: number; y1: number; y2: number },
  object: CanvasObject & {
    sourceAnchor: CanvasConnectorAnchor;
    targetAnchor: CanvasConnectorAnchor;
  },
) {
  const controlPoint = getCurveConnectorControlPoint(points, object);

  return `M ${points.x1} ${points.y1} Q ${controlPoint.x} ${controlPoint.y} ${points.x2} ${points.y2}`;
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

export function isConnectedLine(object: CanvasObject): object is CanvasObject & {
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

export function getConnectorLineMode(object: CanvasObject) {
  return isConnectedLine(object) && object.connectorLineMode === "double" ? "double" : "single";
}

export function getSecondLineStrokeColor(object: CanvasObject) {
  return object.secondLineStrokeColor ?? object.strokeColor;
}

export function getSecondLineStrokeWidth(object: CanvasObject) {
  return object.secondLineStrokeWidth ?? object.strokeWidth;
}

export function getSecondLineStrokeStyle(object: CanvasObject) {
  return object.secondLineStrokeStyle ?? object.strokeStyle ?? defaultCanvasStyle.strokeStyle;
}

export function getSecondLineArrowDirection(object: CanvasObject) {
  if (
    object.secondLineArrowDirection === "none" ||
    object.secondLineArrowDirection === "forward" ||
    object.secondLineArrowDirection === "backward" ||
    object.secondLineArrowDirection === "both"
  ) {
    return object.secondLineArrowDirection;
  }

  return "backward";
}

export function getSecondLineStrokeDashArray(object: CanvasObject) {
  return getStrokeDashArray({
    ...object,
    strokeStyle: getSecondLineStrokeStyle(object),
    strokeWidth: getSecondLineStrokeWidth(object),
  });
}

export function getLineMarkerUrl(
  arrowDirection: CanvasConnectorArrowDirection,
  markerId: string,
  endpoint: "start" | "end",
) {
  if (endpoint === "start") {
    return arrowDirection === "backward" || arrowDirection === "both" ? `url(#${markerId})` : undefined;
  }

  return arrowDirection === "forward" || arrowDirection === "both" ? `url(#${markerId})` : undefined;
}

export function getDoubleLinePathData(
  object: CanvasObject & {
    sourceAnchor: CanvasConnectorAnchor;
    targetAnchor: CanvasConnectorAnchor;
  },
  points: { x1: number; x2: number; y1: number; y2: number },
  side: 1 | -1,
  firstLineStrokeWidth: number,
  secondLineStrokeWidth: number,
) {
  const offsetDistance = getDoubleLineOffsetDistance(firstLineStrokeWidth, secondLineStrokeWidth);
  const connectorStyle = getConnectorStyle(object);

  if (connectorStyle === "curve") {
    return getDoubleCurvePathData(object, points, side, offsetDistance);
  }

  if (connectorStyle === "elbow") {
    return getDoubleElbowPathData(object, points, side, offsetDistance);
  }

  const offset = getStraightDoubleLineNormal(points, offsetDistance * side);
  const sourcePoint = getEndpointSeparatedPoint(
    { x: points.x1, y: points.y1 },
    object.sourceAnchor,
    offset,
    offsetDistance,
    side,
  );
  const targetPoint = getEndpointSeparatedPoint(
    { x: points.x2, y: points.y2 },
    object.targetAnchor,
    offset,
    offsetDistance,
    side,
  );

  return `M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`;
}

function getDoubleCurvePathData(
  object: CanvasObject & {
    sourceAnchor: CanvasConnectorAnchor;
    targetAnchor: CanvasConnectorAnchor;
  },
  points: { x1: number; x2: number; y1: number; y2: number },
  side: 1 | -1,
  offsetDistance: number,
) {
  const centerControlPoint = getCurveConnectorControlPoint(points, object);
  const controlPoint = {
    x: centerControlPoint.x,
    y: centerControlPoint.y,
  };
  const samplePoints = getOffsetQuadraticCurvePoints(
    { x: points.x1, y: points.y1 },
    controlPoint,
    { x: points.x2, y: points.y2 },
    offsetDistance * side,
  );

  return getPointPathData(samplePoints);
}

function getDoubleElbowPathData(
  object: CanvasObject & {
    sourceAnchor: CanvasConnectorAnchor;
    targetAnchor: CanvasConnectorAnchor;
  },
  points: { x1: number; x2: number; y1: number; y2: number },
  side: 1 | -1,
  offsetDistance: number,
) {
  const routePoints = getElbowConnectorPoints(points, object);
  const offsetPoints = getOffsetPolylinePoints(routePoints, offsetDistance * side);

  if (offsetPoints.length < 2) {
    return `M ${points.x1} ${points.y1} L ${points.x2} ${points.y2}`;
  }

  return offsetPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function getDoubleLineOffsetDistance(firstLineStrokeWidth: number, secondLineStrokeWidth: number) {
  return Math.max(8, (firstLineStrokeWidth + secondLineStrokeWidth) / 2 + 5);
}

function getStraightDoubleLineNormal(
  points: { x1: number; x2: number; y1: number; y2: number },
  distance: number,
) {
  const dx = points.x2 - points.x1;
  const dy = points.y2 - points.y1;
  const length = Math.hypot(dx, dy);

  if (length < 0.001) {
    return { x: 0, y: 0 };
  }

  return {
    x: (-dy / length) * distance,
    y: (dx / length) * distance,
  };
}

function getEndpointSeparatedPoint(
  point: { x: number; y: number },
  anchor: CanvasConnectorAnchor,
  preferredOffset: { x: number; y: number },
  distance: number,
  side: 1 | -1,
) {
  const tangent = getAnchorTangent(anchor);
  const projectedDistance = preferredOffset.x * tangent.x + preferredOffset.y * tangent.y;
  const direction = Math.abs(projectedDistance) > 0.5 ? Math.sign(projectedDistance) : side;

  return {
    x: point.x + tangent.x * distance * direction,
    y: point.y + tangent.y * distance * direction,
  };
}

function getAnchorTangent(anchor: CanvasConnectorAnchor) {
  if (anchor === "top" || anchor === "bottom") {
    return { x: 1, y: 0 };
  }

  return { x: 0, y: 1 };
}

function getOffsetQuadraticCurvePoints(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  distance: number,
) {
  const sampleCount = 28;
  const fallbackTangent = {
    x: end.x - start.x,
    y: end.y - start.y,
  };

  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    const t = index / sampleCount;
    const point = getQuadraticCurvePoint(start, control, end, t);
    const tangent = getQuadraticCurveTangent(start, control, end, t, fallbackTangent);
    const tangentLength = Math.hypot(tangent.x, tangent.y);

    if (tangentLength < 0.001) {
      return point;
    }

    return {
      x: point.x + (-tangent.y / tangentLength) * distance,
      y: point.y + (tangent.x / tangentLength) * distance,
    };
  });
}

function getQuadraticCurvePoint(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  t: number,
) {
  const oneMinusT = 1 - t;

  return {
    x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x,
    y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y,
  };
}

function getQuadraticCurveTangent(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  t: number,
  fallbackTangent: { x: number; y: number },
) {
  const oneMinusT = 1 - t;
  const tangent = {
    x: 2 * oneMinusT * (control.x - start.x) + 2 * t * (end.x - control.x),
    y: 2 * oneMinusT * (control.y - start.y) + 2 * t * (end.y - control.y),
  };

  return Math.hypot(tangent.x, tangent.y) < 0.001 ? fallbackTangent : tangent;
}

function getPointPathData(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function getOffsetPolylinePoints(points: Array<{ x: number; y: number }>, distance: number) {
  const offsetSegments = points
    .slice(0, -1)
    .map((point, index) => getOffsetSegment(point, points[index + 1], distance))
    .filter((segment): segment is NonNullable<typeof segment> => Boolean(segment));

  if (!offsetSegments.length) {
    return [];
  }

  return offsetSegments
    .map((segment, index) => {
      if (index === 0) {
        return segment.start;
      }

      const previousSegment = offsetSegments[index - 1];
      return (
        getLineIntersection(previousSegment.start, previousSegment.end, segment.start, segment.end) ?? {
          x: (previousSegment.end.x + segment.start.x) / 2,
          y: (previousSegment.end.y + segment.start.y) / 2,
        }
      );
    })
    .concat(offsetSegments[offsetSegments.length - 1].end);
}

function getOffsetSegment(
  start: { x: number; y: number },
  end: { x: number; y: number },
  distance: number,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);

  if (length < 0.001) {
    return null;
  }

  const offset = {
    x: (-dy / length) * distance,
    y: (dx / length) * distance,
  };

  return {
    end: { x: end.x + offset.x, y: end.y + offset.y },
    start: { x: start.x + offset.x, y: start.y + offset.y },
  };
}

function getLineIntersection(
  lineAStart: { x: number; y: number },
  lineAEnd: { x: number; y: number },
  lineBStart: { x: number; y: number },
  lineBEnd: { x: number; y: number },
) {
  const aDx = lineAEnd.x - lineAStart.x;
  const aDy = lineAEnd.y - lineAStart.y;
  const bDx = lineBEnd.x - lineBStart.x;
  const bDy = lineBEnd.y - lineBStart.y;
  const denominator = aDx * bDy - aDy * bDx;

  if (Math.abs(denominator) < 0.001) {
    return null;
  }

  const t = ((lineBStart.x - lineAStart.x) * bDy - (lineBStart.y - lineAStart.y) * bDx) / denominator;

  return {
    x: lineAStart.x + t * aDx,
    y: lineAStart.y + t * aDy,
  };
}
