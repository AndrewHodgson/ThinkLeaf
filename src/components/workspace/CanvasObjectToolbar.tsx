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
  Copy,
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

type CanvasObjectToolbarProps = {
  object: CanvasObject;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdate: (updates: Partial<CanvasObject>) => void;
};

export function CanvasObjectToolbar({ object, onDelete, onDuplicate, onUpdate }: CanvasObjectToolbarProps) {
  const supportsFill = object.type === "rectangle" || object.type === "circle" || object.type === "textBox";
  const supportsStroke = object.type !== "image";
  const supportsText = object.type === "textBox" || object.text !== undefined;
  const supportsStrokeStyle = object.type === "rectangle" || object.type === "line" || object.type === "arrow";
  const hasExtraControls = supportsText || supportsStroke;

  return (
    <div
      className="pointer-events-auto border-b border-slate-200 bg-white/95 px-4 py-3 shadow-soft backdrop-blur"
      data-pan-block="true"
      data-wheel-block="true"
    >
      <div className="flex min-h-8 flex-wrap items-center gap-2">
        <div className="mr-2 min-w-24">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Selection</div>
          <div className="text-xs font-semibold capitalize text-slate-700">{object.type}</div>
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

        {supportsText ? (
          <>
            <ColorPicker
              currentValue={object.textColor}
              label="Text"
              onSelect={(textColor) => onUpdate({ textColor })}
              presets={colorPresets}
            />
            <ColorPicker
              currentValue={object.textHighlightColor ?? "transparent"}
              label="Highlight"
              onSelect={(textHighlightColor) => onUpdate({ textHighlightColor })}
              presets={highlightPresets}
            />
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
      </div>

      {hasExtraControls ? (
        <div className="mt-2 flex min-h-8 flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
          {supportsText ? <TextFormattingControls object={object} onUpdate={onUpdate} /> : null}
          {supportsText && supportsStroke ? <span className="mx-1 h-6 w-px bg-slate-200" /> : null}
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
        </div>
      ) : null}
    </div>
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
    <>
      <SegmentLabel>Text</SegmentLabel>
      <button
        aria-label="Bold text"
        className={toolbarButtonClass(Boolean(object.textBold))}
        title="Bold"
        type="button"
        onClick={() => onUpdate({ textBold: !object.textBold })}
      >
        <Bold aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Italic text"
        className={toolbarButtonClass(Boolean(object.textItalic))}
        title="Italic"
        type="button"
        onClick={() => onUpdate({ textItalic: !object.textItalic })}
      >
        <Italic aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align text left"
        className={toolbarButtonClass((object.textAlign ?? "left") === "left")}
        title="Align left"
        type="button"
        onClick={() => onUpdate({ textAlign: "left" })}
      >
        <AlignLeft aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align text center"
        className={toolbarButtonClass(object.textAlign === "center")}
        title="Align center"
        type="button"
        onClick={() => onUpdate({ textAlign: "center" })}
      >
        <AlignCenter aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align text right"
        className={toolbarButtonClass(object.textAlign === "right")}
        title="Align right"
        type="button"
        onClick={() => onUpdate({ textAlign: "right" })}
      >
        <AlignRight aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align text top"
        className={toolbarButtonClass((object.textVerticalAlign ?? "top") === "top")}
        title="Align top"
        type="button"
        onClick={() => onUpdate({ textVerticalAlign: "top" })}
      >
        <AlignVerticalJustifyStart aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align text middle"
        className={toolbarButtonClass(object.textVerticalAlign === "middle")}
        title="Align middle"
        type="button"
        onClick={() => onUpdate({ textVerticalAlign: "middle" })}
      >
        <AlignVerticalJustifyCenter aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align text bottom"
        className={toolbarButtonClass(object.textVerticalAlign === "bottom")}
        title="Align bottom"
        type="button"
        onClick={() => onUpdate({ textVerticalAlign: "bottom" })}
      >
        <AlignVerticalJustifyEnd aria-hidden="true" className="h-4 w-4" />
      </button>
      <TextSizeDropdown selectedSize={object.fontSize ?? 14} onSelect={(fontSize) => onUpdate({ fontSize })} />
    </>
  );
}

function TextSizeDropdown({
  onSelect,
  selectedSize,
}: {
  onSelect: (fontSize: number) => void;
  selectedSize: number;
}) {
  return (
    <details className="relative">
      <summary className="inline-flex h-8 min-w-14 cursor-pointer list-none items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50">
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
  );
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
