import { defaultLaserColor } from "@/lib/canvasStyle";
import type { CanvasPoint } from "@/types/workspace";

export const laserGlowLayers = [
  { name: "outer", opacity: 0.08, widthMultiplier: 5.2 },
  { name: "middle", opacity: 0.14, widthMultiplier: 3.4 },
  { name: "inner", opacity: 0.28, widthMultiplier: 1.8 },
];

export const laserFadeDurations = {
  fast: {
    intervalMs: 28,
    startDelayMs: 140,
    trimRatio: 0.12,
  },
  long: {
    intervalMs: 28,
    startDelayMs: 450,
    trimRatio: 0.12,
  },
  longer: {
    intervalMs: 28,
    startDelayMs: 650,
    trimRatio: 0.12,
  },
  longest: {
    intervalMs: 28,
    startDelayMs: 900,
    trimRatio: 0.12,
  },
  normal: {
    intervalMs: 28,
    startDelayMs: 280,
    trimRatio: 0.12,
  },
};

export function getLaserPath(points: CanvasPoint[]) {
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

export function getLaserColor(value: string | undefined) {
  return typeof value === "string" && value.trim() ? value : defaultLaserColor;
}
