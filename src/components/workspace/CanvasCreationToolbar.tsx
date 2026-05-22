"use client";

import {
  Circle,
  Grid3X3,
  Hand,
  Magnet,
  Settings2,
  MousePointer2,
  ArrowRight,
  Square,
  Type,
  Minus,
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

type CanvasCreationToolbarProps = {
  activeTool: CanvasTool;
  isGridVisible: boolean;
  isSnapToGridEnabled: boolean;
  onToggleGrid: () => void;
  onToggleSnapToGrid: () => void;
  onToolChange: (tool: CanvasTool) => void;
};

export function CanvasCreationToolbar({
  activeTool,
  isGridVisible,
  isSnapToGridEnabled,
  onToggleGrid,
  onToggleSnapToGrid,
  onToolChange,
}: CanvasCreationToolbarProps) {
  return (
    <div
      data-pan-block="true"
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
                "inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
                activeTool === tool.label
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
              title={`${tool.label} (${tool.shortcut})`}
              type="button"
              onClick={() => onToolChange(tool.label)}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
            </button>
          );
        })}
        <span className="mx-1 h-6 w-px bg-slate-200" />
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
