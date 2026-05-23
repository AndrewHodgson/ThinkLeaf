import { defaultPenSettings } from "@/lib/canvasStyle";
import type { CanvasObject } from "@/types/workspace";
import type { EraserCursorPoint } from "@/components/workspace/canvas/canvasLayerTypes";
import { getLinePoints } from "@/components/workspace/canvas/canvasGeometry";
import { getPenInkRenderPoints, getPenRenderPoints } from "@/components/workspace/canvas/penRendering";

export const eraserCursorSize = 15;

export function getEraserTargetObject(
  point: Pick<EraserCursorPoint, "x" | "y">,
  objects: CanvasObject[],
  zoom: number,
) {
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

    return (
      getPointToSegmentDistance(point, { x: points.x1, y: points.y1 }, { x: points.x2, y: points.y2 }) <=
      radius + hitPadding
    );
  }

  if (object.type === "penStroke") {
    const points =
      (object.penMode ?? defaultPenSettings.mode) === "ink" ? getPenInkRenderPoints(object) : getPenRenderPoints(object);
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
