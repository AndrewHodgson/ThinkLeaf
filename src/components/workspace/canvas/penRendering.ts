import { defaultPenSettings } from "@/lib/canvasStyle";
import type { CanvasObject, CanvasPenSettings, CanvasPoint } from "@/types/workspace";

type InkRenderPoint = CanvasPoint & {
  width: number;
};

export function getPenAbsolutePoints(object: CanvasObject): CanvasPoint[] {
  const points = object.penPoints?.length ? object.penPoints : [{ x: 0, y: 0 }];

  return points.map((point) => ({
    ...(Number.isFinite(point.t) ? { t: point.t } : {}),
    x: object.x + point.x,
    y: object.y + point.y,
  }));
}

export function normalizePenBounds(points: CanvasPoint[]): Partial<CanvasObject> {
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

export function getPenPath(object: CanvasObject) {
  const points = getPenRenderPoints(object);

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} L ${point.x + 0.1} ${point.y + 0.1}`;
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export function getPenInkOutlinePath(object: CanvasObject) {
  const points = getPenInkRenderPoints(object);

  if (points.length === 1) {
    return getCirclePath(points[0], Math.max(1, object.strokeWidth) / 2);
  }

  if (points.length < 2) {
    return getPenPath(object);
  }

  const pointWidths = getInkPointWidths(points, object);
  const renderPoints = getInkRenderPoints(points, pointWidths);

  return getInkOutlinePath(renderPoints);
}

function getInkPointWidths(points: CanvasPoint[], object: CanvasObject) {
  const segmentMetrics = points.slice(0, -1).map((point, index) => {
    const nextPoint = points[index + 1];
    const distance = Math.max(0.1, Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y));
    const deltaTime =
      Number.isFinite(point.t) && Number.isFinite(nextPoint.t) ? Math.max(1, nextPoint.t! - point.t!) : null;

    return deltaTime ? distance / deltaTime : distance;
  });
  const averageMetric =
    segmentMetrics.reduce((metricTotal, metric) => metricTotal + metric, 0) / Math.max(1, segmentMetrics.length);
  const segmentWidths = segmentMetrics.map((metric, index) => {
    const normalizedSpeed = metric / Math.max(0.01, averageMetric);
    const densityFactor = getInkDensityFactor(object.penInkDensity ?? defaultPenSettings.inkDensity);
    const baseWidthFactor = clamp(1.34 - normalizedSpeed * 0.34, 0.72, 1.3);
    const targetWidthFactor = clamp(
      1 + (baseWidthFactor - 1) * densityFactor,
      1 - 0.3 * densityFactor,
      1 + 0.32 * densityFactor,
    );
    const startTaper = clamp((index + 1) / 3, 0.82, 1);
    const endTaper = clamp((segmentMetrics.length - index) / 3, 0.82, 1);

    return Math.max(1, object.strokeWidth * targetWidthFactor * Math.min(startTaper, endTaper));
  });

  return points.map((_, index) => {
    if (index === 0) {
      return segmentWidths[0] ?? Math.max(1, object.strokeWidth);
    }

    if (index === points.length - 1) {
      return segmentWidths[segmentWidths.length - 1] ?? Math.max(1, object.strokeWidth);
    }

    const previousWidth = segmentWidths[index - 1] ?? object.strokeWidth;
    const nextWidth = segmentWidths[index] ?? previousWidth;
    const currentWidth = (previousWidth + nextWidth) / 2;
    const beforePreviousWidth = segmentWidths[index - 2] ?? previousWidth;
    const afterNextWidth = segmentWidths[index + 1] ?? nextWidth;

    return (beforePreviousWidth + previousWidth + currentWidth * 2 + nextWidth + afterNextWidth) / 6;
  });
}

function getInkRenderPoints(points: CanvasPoint[], pointWidths: number[]): InkRenderPoint[] {
  if (points.length < 2) {
    return points.map((point, index) => ({ ...point, width: pointWidths[index] ?? 1 }));
  }

  const renderPoints: InkRenderPoint[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const startPoint = points[index];
    const endPoint = points[index + 1];
    const distance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
    const stepCount = Math.max(2, Math.min(12, Math.ceil(distance / 6)));

    for (let step = 0; step <= stepCount; step += 1) {
      if (index > 0 && step === 0) {
        continue;
      }

      const amount = step / stepCount;
      const point = interpolateCatmullRom(
        points[index - 1] ?? startPoint,
        startPoint,
        endPoint,
        points[index + 2] ?? endPoint,
        amount,
      );
      const width = interpolateNumber(
        pointWidths[index] ?? 1,
        pointWidths[index + 1] ?? pointWidths[index] ?? 1,
        smoothStep(amount),
      );

      renderPoints.push({ ...point, width });
    }
  }

  return renderPoints;
}

function interpolateCatmullRom(
  previousPoint: CanvasPoint,
  startPoint: CanvasPoint,
  endPoint: CanvasPoint,
  nextPoint: CanvasPoint,
  amount: number,
): CanvasPoint {
  const amountSquared = amount * amount;
  const amountCubed = amountSquared * amount;

  return {
    x:
      0.5 *
      (2 * startPoint.x +
        (-previousPoint.x + endPoint.x) * amount +
        (2 * previousPoint.x - 5 * startPoint.x + 4 * endPoint.x - nextPoint.x) * amountSquared +
        (-previousPoint.x + 3 * startPoint.x - 3 * endPoint.x + nextPoint.x) * amountCubed),
    y:
      0.5 *
      (2 * startPoint.y +
        (-previousPoint.y + endPoint.y) * amount +
        (2 * previousPoint.y - 5 * startPoint.y + 4 * endPoint.y - nextPoint.y) * amountSquared +
        (-previousPoint.y + 3 * startPoint.y - 3 * endPoint.y + nextPoint.y) * amountCubed),
  };
}

function getInkOutlinePath(points: InkRenderPoint[]) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return getCirclePath(points[0], points[0].width / 2);
  }

  const leftEdge: CanvasPoint[] = [];
  const rightEdge: CanvasPoint[] = [];

  points.forEach((point, index) => {
    const normal = getRenderPointNormal(points, index);
    const radius = Math.max(0.5, point.width / 2);

    leftEdge.push({ x: point.x + normal.x * radius, y: point.y + normal.y * radius });
    rightEdge.push({ x: point.x - normal.x * radius, y: point.y - normal.y * radius });
  });

  const firstTangent = getRenderPointTangent(points, 0);
  const lastTangent = getRenderPointTangent(points, points.length - 1);
  const firstRadius = Math.max(0.5, points[0].width / 2);
  const lastRadius = Math.max(0.5, points[points.length - 1].width / 2);
  const startCapControl = {
    x: points[0].x - firstTangent.x * firstRadius,
    y: points[0].y - firstTangent.y * firstRadius,
  };
  const endCapControl = {
    x: points[points.length - 1].x + lastTangent.x * lastRadius,
    y: points[points.length - 1].y + lastTangent.y * lastRadius,
  };
  const reversedRightEdge = [...rightEdge].reverse();

  return [
    `M ${leftEdge[0].x} ${leftEdge[0].y}`,
    getSmoothEdgeCommands(leftEdge),
    `Q ${endCapControl.x} ${endCapControl.y} ${rightEdge[rightEdge.length - 1].x} ${
      rightEdge[rightEdge.length - 1].y
    }`,
    getSmoothEdgeCommands(reversedRightEdge),
    `Q ${startCapControl.x} ${startCapControl.y} ${leftEdge[0].x} ${leftEdge[0].y}`,
    "Z",
  ].join(" ");
}

function getSmoothEdgeCommands(points: CanvasPoint[]) {
  if (points.length < 2) {
    return "";
  }

  if (points.length === 2) {
    return `L ${points[1].x} ${points[1].y}`;
  }

  const commands: string[] = [];

  for (let index = 1; index < points.length - 1; index += 1) {
    const midpoint = getMidpoint(points[index], points[index + 1]);
    commands.push(`Q ${points[index].x} ${points[index].y} ${midpoint.x} ${midpoint.y}`);
  }

  const lastPoint = points[points.length - 1];
  commands.push(`L ${lastPoint.x} ${lastPoint.y}`);

  return commands.join(" ");
}

function getRenderPointNormal(points: InkRenderPoint[], index: number) {
  const tangent = getRenderPointTangent(points, index);

  return { x: -tangent.y, y: tangent.x };
}

function getRenderPointTangent(points: InkRenderPoint[], index: number) {
  const previousPoint = points[Math.max(0, index - 1)];
  const nextPoint = points[Math.min(points.length - 1, index + 1)];
  const dx = nextPoint.x - previousPoint.x;
  const dy = nextPoint.y - previousPoint.y;
  const length = Math.hypot(dx, dy);

  if (length <= 0.001) {
    return { x: 1, y: 0 };
  }

  return { x: dx / length, y: dy / length };
}

function getMidpoint(point: CanvasPoint, otherPoint: CanvasPoint): CanvasPoint {
  return {
    x: (point.x + otherPoint.x) / 2,
    y: (point.y + otherPoint.y) / 2,
  };
}

function getCirclePath(point: CanvasPoint, radius: number) {
  const safeRadius = Math.max(0.5, radius);

  return [
    `M ${point.x - safeRadius} ${point.y}`,
    `a ${safeRadius} ${safeRadius} 0 1 0 ${safeRadius * 2} 0`,
    `a ${safeRadius} ${safeRadius} 0 1 0 ${-safeRadius * 2} 0`,
  ].join(" ");
}

export function getPenRenderPoints(object: CanvasObject) {
  return getPenAbsolutePoints(object);
}

export function getPenInkRenderPoints(object: CanvasObject) {
  return getPenAbsolutePoints(object);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function interpolateNumber(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function smoothStep(value: number) {
  return value * value * (3 - 2 * value);
}

function getInkDensityFactor(density: CanvasPenSettings["inkDensity"]) {
  return {
    high: 1.35,
    low: 0.65,
    medium: 1,
    veryHigh: 1.7,
  }[density];
}
