"use client";

import {
  Circle,
  Eraser,
  Grid3X3,
  Hand,
  HelpCircle,
  Image as ImageIcon,
  Magnet,
  Redo2,
  RotateCcw,
  Settings2,
  MousePointer2,
  ArrowRight,
  Square,
  Type,
  Minus,
  Pencil,
  ZoomIn,
  ZoomOut,
  Undo2,
} from "lucide-react";
import type { CanvasTool } from "@/types/workspace";

const tools: Array<{ icon: typeof MousePointer2; label: CanvasTool; shortcut: string }> = [
  { icon: MousePointer2, label: "Select", shortcut: "1" },
  { icon: Hand, label: "Pan", shortcut: "2" },
  { icon: Square, label: "Rectangle", shortcut: "3" },
  { icon: Circle, label: "Circle", shortcut: "4" },
  { icon: Type, label: "Text Box", shortcut: "5" },
  { icon: Minus, label: "Line", shortcut: "6" },
  { icon: ArrowRight, label: "Arrow", shortcut: "7" },
];

const activeControlClass = "border-leaf-200 bg-leaf-50 text-leaf-700";

type CanvasCreationToolbarProps = {
  activeTool: CanvasTool;
  canRedoCanvas: boolean;
  canUndoCanvas: boolean;
  isGridVisible: boolean;
  isSnapToGridEnabled: boolean;
  onHelpClick: () => void;
  onImageUploadClick: () => void;
  onRedoCanvas: () => void;
  onResetView: () => void;
  onToggleGrid: () => void;
  onToggleSnapToGrid: () => void;
  onToolChange: (tool: CanvasTool) => void;
  onUndoCanvas: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function CanvasCreationToolbar({
  activeTool,
  canRedoCanvas,
  canUndoCanvas,
  isGridVisible,
  isSnapToGridEnabled,
  onHelpClick,
  onImageUploadClick,
  onRedoCanvas,
  onResetView,
  onToggleGrid,
  onToggleSnapToGrid,
  onToolChange,
  onUndoCanvas,
  onZoomIn,
  onZoomOut,
}: CanvasCreationToolbarProps) {
  return (
    <div
      data-pan-block="true"
      data-wheel-block="true"
      className="pointer-events-auto absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-2 py-2 shadow-soft backdrop-blur"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-1.5">
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <button
              key={tool.label}
              aria-label={`${tool.label} tool, shortcut ${tool.shortcut}`}
              className={[
                "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
                activeTool === tool.label
                  ? activeControlClass
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
              title={`${tool.label} (${tool.shortcut})`}
              type="button"
              onClick={() => onToolChange(tool.label)}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              <ShortcutBadge isActive={activeTool === tool.label}>{tool.shortcut}</ShortcutBadge>
            </button>
          );
        })}
        <button
          aria-label="Import image, shortcut 8"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          title="Import image (8)"
          type="button"
          onClick={onImageUploadClick}
        >
          <ImageIcon aria-hidden="true" className="h-4 w-4" />
          <ShortcutBadge>8</ShortcutBadge>
        </button>
        <button
          aria-label="Pen tool, shortcut 9"
          className={[
            "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
            activeTool === "Pen"
              ? activeControlClass
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
          ].join(" ")}
          title="Pen (9)"
          type="button"
          onClick={() => onToolChange("Pen")}
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
          <ShortcutBadge isActive={activeTool === "Pen"}>9</ShortcutBadge>
        </button>
        <button
          aria-label="Eraser tool, shortcut 0"
          className={[
            "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
            activeTool === "Eraser"
              ? activeControlClass
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
          ].join(" ")}
          title="Eraser (0)"
          type="button"
          onClick={() => onToolChange("Eraser")}
        >
          <Eraser aria-hidden="true" className="h-4 w-4" />
          <ShortcutBadge isActive={activeTool === "Eraser"}>0</ShortcutBadge>
        </button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button
          aria-label="Zoom in, shortcut plus"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          title="Zoom in (+)"
          type="button"
          onClick={onZoomIn}
        >
          <ZoomIn aria-hidden="true" className="h-4 w-4" />
          <ShortcutBadge>+</ShortcutBadge>
        </button>
        <button
          aria-label="Zoom out, shortcut minus"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          title="Zoom out (-)"
          type="button"
          onClick={onZoomOut}
        >
          <ZoomOut aria-hidden="true" className="h-4 w-4" />
          <ShortcutBadge>-</ShortcutBadge>
        </button>
        <button
          aria-label="Reset view"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          title="Reset view"
          type="button"
          onClick={onResetView}
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
        </button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button
          aria-label="Undo canvas action, shortcut Command or Control Z"
          className={toolbarButtonClass(false, !canUndoCanvas)}
          title="Undo canvas action (Cmd/Ctrl+Z)"
          type="button"
          onClick={() => {
            if (canUndoCanvas) {
              onUndoCanvas();
            }
          }}
        >
          <Undo2 aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          aria-label="Redo canvas action, shortcut Command or Control Shift Z or Command or Control Y"
          className={toolbarButtonClass(false, !canRedoCanvas)}
          title="Redo canvas action (Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y)"
          type="button"
          onClick={() => {
            if (canRedoCanvas) {
              onRedoCanvas();
            }
          }}
        >
          <Redo2 aria-hidden="true" className="h-4 w-4" />
        </button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button
          aria-label="Open shortcuts help"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          title="Shortcuts and controls"
          type="button"
          onClick={onHelpClick}
        >
          <HelpCircle aria-hidden="true" className="h-4 w-4" />
        </button>
        <details className="relative">
          <summary
            aria-label="Canvas settings"
            className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            title="Canvas settings"
          >
            <Settings2 aria-hidden="true" className="h-4 w-4" />
          </summary>
          <div className="absolute bottom-12 right-0 z-30 w-44 rounded-md border border-slate-200 bg-white p-2 text-sm shadow-soft">
            <button
              aria-label={isSnapToGridEnabled ? "Disable snap to grid" : "Enable snap to grid"}
              className={[
                "flex h-9 w-full items-center justify-between gap-2 rounded px-2 text-left transition",
                isSnapToGridEnabled ? "bg-leaf-50 text-leaf-700" : "text-slate-600 hover:bg-slate-50",
              ].join(" ")}
              type="button"
              onClick={onToggleSnapToGrid}
            >
              <span className="inline-flex items-center gap-2">
                <Magnet aria-hidden="true" className="h-4 w-4" />
                Snap
              </span>
              <span className="text-xs font-semibold">{isSnapToGridEnabled ? "On" : "Off"}</span>
            </button>
            <button
              aria-label={isGridVisible ? "Hide grid" : "Show grid"}
              className={[
                "mt-1 flex h-9 w-full items-center justify-between gap-2 rounded px-2 text-left transition",
                isGridVisible ? "bg-leaf-50 text-leaf-700" : "text-slate-600 hover:bg-slate-50",
              ].join(" ")}
              type="button"
              onClick={onToggleGrid}
            >
              <span className="inline-flex items-center gap-2">
                <Grid3X3 aria-hidden="true" className="h-4 w-4" />
                Grid
              </span>
              <span className="text-xs font-semibold">{isGridVisible ? "On" : "Off"}</span>
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}

function ShortcutBadge({ children, isActive = false }: { children: string; isActive?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "pointer-events-none absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border px-1 text-[10px] font-bold leading-none shadow-sm",
        isActive ? "border-leaf-200 bg-white text-leaf-700" : "border-slate-200 bg-slate-50 text-slate-500",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function toolbarButtonClass(isActive = false, isDisabled = false) {
  return [
    "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
    isDisabled
      ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
      : isActive
        ? activeControlClass
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
  ].join(" ");
}
