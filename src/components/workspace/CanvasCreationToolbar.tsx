"use client";

import {
  Circle,
  Grid3X3,
  Hand,
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
  centerOffsetPx: number;
  onToggleGrid: () => void;
  onToolChange: (tool: CanvasTool) => void;
};

export function CanvasCreationToolbar({
  activeTool,
  isGridVisible,
  centerOffsetPx,
  onToggleGrid,
  onToolChange,
}: CanvasCreationToolbarProps) {
  return (
    <div
      data-pan-block="true"
      className="pointer-events-auto fixed bottom-5 z-20 -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-2 py-2 shadow-soft backdrop-blur"
      style={{ left: `calc(50vw + ${centerOffsetPx}px)` }}
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
        <button
          aria-label={isGridVisible ? "Hide grid" : "Show grid"}
          className={[
            "inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
            isGridVisible
              ? "border-leaf-200 bg-leaf-50 text-leaf-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          ].join(" ")}
          title={isGridVisible ? "Hide grid" : "Show grid"}
          type="button"
          onClick={onToggleGrid}
        >
          <Grid3X3 aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
