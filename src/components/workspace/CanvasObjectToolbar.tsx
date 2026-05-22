"use client";

import {
  Copy,
  Trash2,
} from "lucide-react";
import {
  colorPresets,
  fillPresets,
  strokeStylePresets,
  strokeWidthPresets,
} from "@/lib/canvasStyle";
import { ColorPicker } from "@/components/workspace/ColorPicker";
import type { CanvasObject } from "@/types/workspace";

type CanvasObjectToolbarProps = {
  object: CanvasObject;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdate: (updates: Partial<CanvasObject>) => void;
};

export function CanvasObjectToolbar({ object, onDelete, onDuplicate, onUpdate }: CanvasObjectToolbarProps) {
  const supportsFill = object.type === "rectangle" || object.type === "circle" || object.type === "textBox";
  const supportsStroke = object.type !== "image";
  const supportsStrokeStyle = object.type === "rectangle" || object.type === "line" || object.type === "arrow";

  return (
    <>
      <div className="mr-2 min-w-24">
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Selection</div>
        <div className="text-xs font-semibold capitalize text-slate-700">{getObjectLabel(object)}</div>
      </div>

      {supportsFill ? (
        <ColorPicker
          currentValue={object.fillColor}
          label="Fill"
          onSelect={(fillColor) => onUpdate({ fillColor })}
          presets={fillPresets}
        />
      ) : null}

      {supportsStroke ? (
        <ColorPicker
          currentValue={object.strokeColor}
          label="Stroke"
          onSelect={(strokeColor) => onUpdate({ strokeColor })}
          presets={colorPresets}
        />
      ) : null}

      {supportsStroke ? (
        <>
          <SegmentLabel>Width</SegmentLabel>
          {strokeWidthPresets.map((strokeWidth) => (
            <button
              key={strokeWidth}
              aria-label={`Stroke width ${strokeWidth}`}
              className={compactButtonClass(object.strokeWidth === strokeWidth)}
              title={`Stroke width ${strokeWidth}`}
              type="button"
              onClick={() => onUpdate({ strokeWidth })}
            >
              {strokeWidth}
            </button>
          ))}
        </>
      ) : null}
      {supportsStrokeStyle ? (
        <>
          <SegmentLabel>Style</SegmentLabel>
          {strokeStylePresets.map((style) => (
            <button
              key={style.value}
              aria-label={`Stroke style ${style.label}`}
              className={compactButtonClass((object.strokeStyle ?? "solid") === style.value, "min-w-14")}
              type="button"
              onClick={() => onUpdate({ strokeStyle: style.value })}
            >
              {style.label}
            </button>
          ))}
        </>
      ) : null}

      <span className="mx-1 h-6 w-px bg-slate-200" />
      <button
        aria-label="Duplicate object"
        className={toolbarButtonClass()}
        title="Duplicate"
        type="button"
        onClick={onDuplicate}
      >
        <Copy aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Delete object"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-100 bg-white text-rose-600 transition hover:bg-rose-50"
        title="Delete"
        type="button"
        onClick={onDelete}
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </button>

      {object.type === "image" ? (
        <span className="ml-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">
          Move, resize, duplicate, or delete
        </span>
      ) : null}
    </>
  );
}

function getObjectLabel(object: CanvasObject) {
  if (object.type === "penStroke") {
    return "Pen stroke";
  }

  if (object.type === "textBox") {
    return "Text box";
  }

  return object.type;
}

function SegmentLabel({ children }: { children: string }) {
  return <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{children}</span>;
}

function toolbarButtonClass(isActive = false) {
  return [
    "inline-flex h-8 w-8 items-center justify-center rounded-md border transition",
    isActive
      ? "border-slate-900 bg-slate-900 text-white"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
  ].join(" ");
}

function compactButtonClass(isActive = false, extraClass = "min-w-8") {
  return [
    "inline-flex h-8 items-center justify-center rounded-md border px-2 text-xs font-semibold transition",
    extraClass,
    isActive
      ? "border-slate-900 bg-slate-900 text-white"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
  ].join(" ");
}
