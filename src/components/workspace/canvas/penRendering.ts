import { defaultPenSettings } from "@/lib/canvasStyle";
import type { CanvasObject, CanvasPenSettings, CanvasPoint } from "@/types/workspace";

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

export function getPenInkSegments(object: CanvasObject) {
  const points = getPenInkRenderPoints(object);

  if (points.length < 2) {
    return [{ path: getPenPath(object), width: Math.max(1, object.strokeWidth) }];
  }

  const segmentMetrics = points.slice(0, -1).map((point, index) => {
    const nextPoint = points[index + 1];
    const distance = Math.max(0.1, Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y));
    const deltaTime =
      Number.isFinite(point.t) && Number.isFinite(nextPoint.t) ? Math.max(1, nextPoint.t! - point.t!) : null;

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

export function getPenRenderPoints(object: CanvasObject) {
  const smoothing = object.penSmoothing ?? defaultPenSettings.smoothing;
  const simplifiedPoints = getSimplifiedPenPoints(getPenAbsolutePoints(object), smoothing);

  return getSmoothedPenPoints(simplifiedPoints, smoothing);
}

export function getPenInkRenderPoints(object: CanvasObject) {
  const smoothing = object.penSmoothing ?? defaultPenSettings.smoothing;
  const simplifiedPoints = getSimplifiedPenPoints(getPenAbsolutePoints(object), smoothing, { preserveDetail: true });

  return getSmoothedPenPoints(simplifiedPoints, smoothing, { preserveDetail: true });
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
