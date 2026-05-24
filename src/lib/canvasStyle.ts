import type {
  CanvasCreationToolDefaults,
  CanvasObjectType,
  CanvasPenSettings,
  CanvasViewState,
} from "@/types/workspace";

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
  panY: 56,
  zoom: 1,
};

export function createDefaultCanvasViewState(): CanvasViewState {
  return { ...defaultCanvasViewState };
}

export const defaultCanvasStyle = {
  strokeColor: "#64748b",
  fillColor: "rgba(148, 163, 184, 0.16)",
  strokeWidth: 2,
  strokeStyle: "solid" as const,
  textColor: "#1f2937",
  textHighlightColor: "transparent",
  textBold: false,
  textItalic: false,
  textAlign: "left" as const,
  textVerticalAlign: "top" as const,
  fontSize: 14,
};

export const colorPresets = [
  { label: "Light gray", value: "#D9D9D9" },
  { label: "Gray", value: "#AFAFAF" },
  { label: "Dark gray", value: "#777777" },
  { label: "Charcoal", value: "#3F3F3F" },
  { label: "Black", value: "#000000" },
  { label: "Purple", value: "#7C4DFF" },
  { label: "Magenta", value: "#D946EF" },
  { label: "Red", value: "#FF2D55" },
  { label: "Orange", value: "#FF7043" },
  { label: "Yellow", value: "#FFD400" },
  { label: "Green", value: "#4ADE80" },
  { label: "Cyan", value: "#4DD0E1" },
  { label: "Blue", value: "#18A8E6" },
  { label: "Royal blue", value: "#3478F6" },
];

export const fillPresets = [
  ...colorPresets,
];

export const highlightPresets = [
  { label: "No highlight", value: "transparent" },
  { label: "Yellow", value: "rgba(250, 204, 21, 0.38)" },
  { label: "Green", value: "rgba(35, 129, 87, 0.2)" },
  { label: "Blue", value: "rgba(37, 99, 235, 0.18)" },
  { label: "Red", value: "rgba(220, 38, 38, 0.16)" },
  { label: "Gray", value: "rgba(148, 163, 184, 0.2)" },
];

export const strokeWidthPresets = [1, 2, 4, 6];
export const penStrokeWidthPresets = [1, 2, 4, 6, 10, 16, 24];
export const defaultHighlighterColor = "#facc15";
export const defaultHighlighterStrokeWidth = 16;
export const defaultLaserColor = "#ef4444";
export const defaultLaserStrokeWidth = 4;
export const strokeStylePresets = [
  { label: "Solid", value: "solid" as const },
  { label: "Dashed", value: "dashed" as const },
  { label: "Dotted", value: "dotted" as const },
];
export const penSmoothingPresets = [
  { label: "Off", value: "off" as const },
  { label: "Light", value: "light" as const },
  { label: "Medium", value: "medium" as const },
  { label: "High", value: "high" as const },
  { label: "Very High", value: "veryHigh" as const },
];
export const penModePresets = [
  { label: "Pen", value: "uniform" as const },
  { label: "Ink", value: "ink" as const },
  { label: "Highlighter", value: "highlighter" as const },
  { label: "Laser Pointer", value: "laser" as const },
];
export const penInkDensityPresets = [
  { label: "Low", value: "low" as const },
  { label: "Medium", value: "medium" as const },
  { label: "High", value: "high" as const },
  { label: "Very High", value: "veryHigh" as const },
];
export const laserFadeDurationPresets = [
  { label: "Fast", value: "fast" as const },
  { label: "Normal", value: "normal" as const },
  { label: "Long", value: "long" as const },
  { label: "Longer", value: "longer" as const },
  { label: "Longest", value: "longest" as const },
];
export const textSizePresets = [12, 14, 16, 20, 24, 32];

export const defaultPenSettings: CanvasPenSettings = {
  inkDensity: "medium",
  laserColor: defaultLaserColor,
  laserFadeDuration: "normal",
  mode: "uniform",
  smoothing: "medium",
  strokeColor: defaultCanvasStyle.strokeColor,
  strokeWidth: defaultCanvasStyle.strokeWidth,
};

export const defaultCanvasCreationToolDefaults: CanvasCreationToolDefaults = {
  arrow: {
    strokeColor: defaultCanvasStyle.strokeColor,
    strokeStyle: defaultCanvasStyle.strokeStyle,
    strokeWidth: defaultCanvasStyle.strokeWidth,
  },
  circle: {
    fillColor: defaultCanvasStyle.fillColor,
    strokeColor: defaultCanvasStyle.strokeColor,
    strokeStyle: defaultCanvasStyle.strokeStyle,
    strokeWidth: defaultCanvasStyle.strokeWidth,
  },
  line: {
    strokeColor: defaultCanvasStyle.strokeColor,
    strokeStyle: defaultCanvasStyle.strokeStyle,
    strokeWidth: defaultCanvasStyle.strokeWidth,
  },
  rectangle: {
    fillColor: defaultCanvasStyle.fillColor,
    strokeColor: defaultCanvasStyle.strokeColor,
    strokeStyle: defaultCanvasStyle.strokeStyle,
    strokeWidth: defaultCanvasStyle.strokeWidth,
  },
  textBox: {
    fillColor: "transparent",
    fontSize: defaultCanvasStyle.fontSize,
    strokeColor: "transparent",
    strokeStyle: defaultCanvasStyle.strokeStyle,
    strokeWidth: 1,
    textAlign: defaultCanvasStyle.textAlign,
    textBold: defaultCanvasStyle.textBold,
    textColor: defaultCanvasStyle.textColor,
    textHighlightColor: defaultCanvasStyle.textHighlightColor,
    textItalic: defaultCanvasStyle.textItalic,
    textVerticalAlign: defaultCanvasStyle.textVerticalAlign,
  },
};

export const defaultObjectSizes: Record<CanvasObjectType, { width: number; height: number; text?: string }> = {
  rectangle: { width: 168, height: 104 },
  circle: { width: 124, height: 124 },
  textBox: { width: 220, height: 92, text: "Text box" },
  line: { width: 184, height: 32 },
  arrow: { width: 192, height: 32 },
  image: { width: 320, height: 220 },
  penStroke: { width: 1, height: 1 },
};

export function snapToGrid(value: number) {
  return Math.round(value / gridSize) * gridSize;
}
