"use client";

import { RotateCcw, Sparkles, ZoomIn, ZoomOut } from "lucide-react";

type TopToolbarProps = {
  activeTool: string;
  zoomPercent: number;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function TopToolbar({ activeTool, zoomPercent, onResetView, onZoomIn, onZoomOut }: TopToolbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Canvas
      </div>
      <div className="flex items-center gap-2">
        <div className="text-xs font-medium text-slate-400">{activeTool}</div>
        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 shadow-sm">
          <button
            aria-label="Zoom out"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-50"
            title="Zoom out"
            type="button"
            onClick={onZoomOut}
          >
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            aria-label="Reset view"
            className="inline-flex h-7 min-w-14 items-center justify-center rounded px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            title="Reset view"
            type="button"
            onClick={onResetView}
          >
            {zoomPercent}%
          </button>
          <button
            aria-label="Zoom in"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-50"
            title="Zoom in"
            type="button"
            onClick={onZoomIn}
          >
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="mx-1 h-5 w-px bg-slate-200" />
          <button
            aria-label="Reset view"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-50"
            title="Reset view"
            type="button"
            onClick={onResetView}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
