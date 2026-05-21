"use client";

import { Trash2 } from "lucide-react";
import { colorPresets, fillPresets, strokeWidthPresets } from "@/lib/canvasStyle";
import type { CanvasObject } from "@/types/workspace";

type ObjectPropertiesPanelProps = {
  object: CanvasObject;
  onDelete: () => void;
  onUpdate: (updates: Partial<CanvasObject>) => void;
};

export function ObjectPropertiesPanel({ object, onDelete, onUpdate }: ObjectPropertiesPanelProps) {
  const supportsFill = object.type === "rectangle" || object.type === "circle" || object.type === "textBox";
  const supportsText = object.type === "textBox";

  return (
    <aside className="w-[300px] shrink-0 pt-4">
      <div className="sticky top-4 rounded-md border border-slate-200 bg-white/95 p-4 shadow-soft backdrop-blur">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Object</div>
        <div className="mt-1 text-sm font-medium text-slate-900">{object.type}</div>

        <div className="mt-4 space-y-4">
          <StyleRow
            label="Stroke"
            selectedValue={object.strokeColor}
            onSelect={(strokeColor) => onUpdate({ strokeColor })}
            presets={colorPresets}
          />
          {supportsFill ? (
            <StyleRow
              label="Fill"
              selectedValue={object.fillColor}
              onSelect={(fillColor) => onUpdate({ fillColor })}
              presets={fillPresets}
            />
          ) : null}
          {supportsText ? (
            <StyleRow
              label="Text"
              selectedValue={object.textColor}
              onSelect={(textColor) => onUpdate({ textColor })}
              presets={colorPresets}
            />
          ) : null}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stroke width</div>
            <div className="mt-2 flex items-center gap-2">
              {strokeWidthPresets.map((strokeWidth) => (
                <button
                  key={strokeWidth}
                  aria-label={`Stroke width ${strokeWidth}`}
                  className={[
                    "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold transition",
                    object.strokeWidth === strokeWidth
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                  ].join(" ")}
                  title={`Stroke width ${strokeWidth}`}
                  type="button"
                  onClick={() => onUpdate({ strokeWidth })}
                >
                  {strokeWidth}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <div className="flex items-center justify-between gap-2">
              <span>Position</span>
              <span>
                {Math.round(object.x)}, {Math.round(object.y)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span>Size</span>
              <span>
                {Math.round(object.width)} x {Math.round(object.height)}
              </span>
            </div>
          </div>
          <button
            aria-label="Delete object"
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-rose-100 bg-white text-sm font-medium text-rose-600 hover:bg-rose-50"
            title="Delete object"
            type="button"
            onClick={onDelete}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </aside>
  );
}

function StyleRow({
  label,
  presets,
  selectedValue,
  onSelect,
}: {
  label: string;
  presets: Array<{ label: string; value: string }>;
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {presets.map((preset) => (
          <button
            key={`${label}-${preset.label}`}
            aria-label={`${label}: ${preset.label}`}
            className={[
              "h-5 w-5 rounded-full border transition",
              selectedValue === preset.value ? "border-slate-950 ring-2 ring-leaf-200" : "border-slate-300",
            ].join(" ")}
            style={{
              background:
                preset.value === "transparent"
                  ? "linear-gradient(135deg, transparent 0 45%, #cbd5e1 45% 55%, transparent 55% 100%)"
                  : preset.value,
            }}
            title={`${label}: ${preset.label}`}
            type="button"
            onClick={() => onSelect(preset.value)}
          />
        ))}
      </div>
    </div>
  );
}
