"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Bold,
  ChevronDown,
  Italic,
  Trash2,
} from "lucide-react";
import {
  colorPresets,
  fillPresets,
  highlightPresets,
  strokeStylePresets,
  strokeWidthPresets,
  textSizePresets,
} from "@/lib/canvasStyle";
import { ColorPicker } from "@/components/workspace/ColorPicker";
import type { CanvasObject } from "@/types/workspace";

type ObjectPropertiesPanelProps = {
  object: CanvasObject;
  onDelete: () => void;
  onUpdate: (updates: Partial<CanvasObject>) => void;
};

export function ObjectPropertiesPanel({ object, onDelete, onUpdate }: ObjectPropertiesPanelProps) {
  const supportsFill = object.type === "rectangle" || object.type === "circle" || object.type === "textBox";
  const supportsStroke = object.type !== "image";
  const supportsText = object.type === "textBox" || object.text !== undefined;
  const supportsStrokeStyle = object.type === "rectangle" || object.type === "line" || object.type === "arrow";

  return (
    <aside className="w-[300px] shrink-0 pt-4">
      <div className="sticky top-4 rounded-md border border-slate-200 bg-white/95 p-4 shadow-soft backdrop-blur">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Object</div>
        <div className="mt-1 text-sm font-medium text-slate-900">{object.type}</div>

        <div className="mt-4 space-y-4">
          {supportsStroke ? (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Stroke</div>
              <ColorPicker
                currentValue={object.strokeColor}
                label="Stroke"
                onSelect={(strokeColor) => onUpdate({ strokeColor })}
                presets={colorPresets}
              />
            </div>
          ) : null}
          {supportsFill ? (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Fill</div>
              <ColorPicker
                currentValue={object.fillColor}
                label="Fill"
                onSelect={(fillColor) => onUpdate({ fillColor })}
                presets={fillPresets}
              />
            </div>
          ) : null}
          {supportsText ? (
            <>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Text</div>
                <ColorPicker
                  currentValue={object.textColor}
                  label="Text"
                  onSelect={(textColor) => onUpdate({ textColor })}
                  presets={colorPresets}
                />
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Highlight</div>
                <ColorPicker
                  currentValue={object.textHighlightColor ?? "transparent"}
                  label="Highlight"
                  onSelect={(textHighlightColor) => onUpdate({ textHighlightColor })}
                  presets={highlightPresets}
                />
              </div>
              <TextFormattingControls object={object} onUpdate={onUpdate} />
            </>
          ) : null}
          {supportsStroke ? (
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
          ) : null}
          {supportsStrokeStyle ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stroke style</div>
              <div className="mt-2 flex items-center gap-2">
                {strokeStylePresets.map((style) => (
                  <button
                    key={style.value}
                    aria-label={`Stroke style ${style.label}`}
                    className={[
                      "inline-flex h-8 min-w-16 items-center justify-center rounded-md border px-2 text-xs font-semibold transition",
                      (object.strokeStyle ?? "solid") === style.value
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                    type="button"
                    onClick={() => onUpdate({ strokeStyle: style.value })}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
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

function TextFormattingControls({
  object,
  onUpdate,
}: {
  object: CanvasObject;
  onUpdate: (updates: Partial<CanvasObject>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Text style</div>
        <div className="mt-2 flex items-center gap-2">
          <button
            aria-label="Bold text"
            className={formatButtonClass(Boolean(object.textBold))}
            title="Bold"
            type="button"
            onClick={() => onUpdate({ textBold: !object.textBold })}
          >
            <Bold aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Italic text"
            className={formatButtonClass(Boolean(object.textItalic))}
            title="Italic"
            type="button"
            onClick={() => onUpdate({ textItalic: !object.textItalic })}
          >
            <Italic aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Text align</div>
        <div className="mt-2 flex items-center gap-2">
          <button
            aria-label="Align text left"
            className={formatButtonClass((object.textAlign ?? "left") === "left")}
            title="Align left"
            type="button"
            onClick={() => onUpdate({ textAlign: "left" })}
          >
            <AlignLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Align text center"
            className={formatButtonClass(object.textAlign === "center")}
            title="Align center"
            type="button"
            onClick={() => onUpdate({ textAlign: "center" })}
          >
            <AlignCenter aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Align text right"
            className={formatButtonClass(object.textAlign === "right")}
            title="Align right"
            type="button"
            onClick={() => onUpdate({ textAlign: "right" })}
          >
            <AlignRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vertical align</div>
        <div className="mt-2 flex items-center gap-2">
          <button
            aria-label="Align text top"
            className={formatButtonClass((object.textVerticalAlign ?? "top") === "top")}
            title="Align top"
            type="button"
            onClick={() => onUpdate({ textVerticalAlign: "top" })}
          >
            <AlignVerticalJustifyStart aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Align text middle"
            className={formatButtonClass(object.textVerticalAlign === "middle")}
            title="Align middle"
            type="button"
            onClick={() => onUpdate({ textVerticalAlign: "middle" })}
          >
            <AlignVerticalJustifyCenter aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Align text bottom"
            className={formatButtonClass(object.textVerticalAlign === "bottom")}
            title="Align bottom"
            type="button"
            onClick={() => onUpdate({ textVerticalAlign: "bottom" })}
          >
            <AlignVerticalJustifyEnd aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <TextSizeDropdown selectedSize={object.fontSize ?? 14} onSelect={(fontSize) => onUpdate({ fontSize })} />
    </div>
  );
}

function formatButtonClass(isActive = false) {
  return [
    "inline-flex h-8 w-8 items-center justify-center rounded-md border transition",
    isActive
      ? "border-slate-900 bg-slate-900 text-white"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
  ].join(" ");
}

function TextSizeDropdown({
  onSelect,
  selectedSize,
}: {
  onSelect: (fontSize: number) => void;
  selectedSize: number;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Text size</div>
      <details className="relative mt-2">
        <summary className="inline-flex h-8 min-w-20 cursor-pointer list-none items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50">
          {selectedSize}
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
        </summary>
        <div className="absolute left-0 top-9 z-30 grid min-w-20 gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-soft">
          {textSizePresets.map((fontSize) => (
            <button
              key={fontSize}
              aria-label={`Text size ${fontSize}`}
              className={[
                "h-8 rounded px-2 text-left text-xs font-semibold transition",
                selectedSize === fontSize ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
              ].join(" ")}
              title={`Text size ${fontSize}`}
              type="button"
              onClick={() => onSelect(fontSize)}
            >
              {fontSize}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
