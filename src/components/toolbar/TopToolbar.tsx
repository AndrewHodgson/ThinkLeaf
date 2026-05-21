"use client";

import { Sparkles } from "lucide-react";

type TopToolbarProps = {
  activeTool: string;
};

export function TopToolbar({ activeTool }: TopToolbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Canvas
      </div>
      <div className="text-xs font-medium text-slate-400">{activeTool}</div>
    </header>
  );
}
