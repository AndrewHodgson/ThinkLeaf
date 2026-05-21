import type { CanvasObjectType, CanvasViewState } from "@/types/workspace";

export const gridSize = 8;
export const minObjectSize = 48;
export const minZoom = 0.5;
export const maxZoom = 2;
export const zoomStep = 0.1;
export const virtualBoardWidth = 5000;
export const virtualBoardHeight = 3000;
export const documentBlockX = 48;
export const documentBlockY = 40;
export const documentBlockWidth = 780;
export const documentCanvasGap = 40;
export const objectCanvasOriginX = documentBlockX + documentBlockWidth + documentCanvasGap;
export const objectCanvasOriginY = 0;

export const defaultCanvasViewState: CanvasViewState = {
  panX: 0,
  panY: 0,
  zoom: 1,
};

export function createDefaultCanvasViewState(): CanvasViewState {
  return { ...defaultCanvasViewState };
}

export const defaultCanvasStyle = {
  strokeColor: "#64748b",
  fillColor: "rgba(148, 163, 184, 0.16)",
  strokeWidth: 2,
  textColor: "#1f2937",
};

export const colorPresets = [
  { label: "Gray", value: "#64748b" },
  { label: "Black", value: "#111827" },
  { label: "Blue", value: "#2563eb" },
  { label: "Green", value: "#238157" },
  { label: "Red", value: "#dc2626" },
  { label: "Yellow", value: "#facc15" },
];

export const fillPresets = [
  { label: "Transparent fill", value: "transparent" },
  { label: "Gray", value: "rgba(148, 163, 184, 0.16)" },
  { label: "Blue", value: "rgba(37, 99, 235, 0.14)" },
  { label: "Green", value: "rgba(35, 129, 87, 0.14)" },
  { label: "Red", value: "rgba(220, 38, 38, 0.12)" },
  { label: "Yellow", value: "rgba(250, 204, 21, 0.22)" },
];

export const strokeWidthPresets = [1, 2, 4, 6];

export const defaultObjectSizes: Record<CanvasObjectType, { width: number; height: number; text?: string }> = {
  rectangle: { width: 168, height: 104 },
  circle: { width: 124, height: 124 },
  textBox: { width: 220, height: 92, text: "Text box" },
  line: { width: 184, height: 32 },
  arrow: { width: 192, height: 32 },
};

export function snapToGrid(value: number) {
  return Math.round(value / gridSize) * gridSize;
}
