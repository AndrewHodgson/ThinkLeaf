"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Bold as BoldIcon,
  ChevronDown,
  Copy,
  Highlighter,
  Italic as ItalicIcon,
  Trash2,
  Type,
} from "lucide-react";
import {
  colorPresets,
  defaultCanvasStyle,
  defaultHighlighterColor,
  defaultHighlighterStrokeWidth,
  defaultLaserColor,
  defaultPenSettings,
  fillPresets,
  highlightPresets,
  laserFadeDurationPresets,
  penInkDensityPresets,
  penModePresets,
  penStrokeWidthPresets,
  penSmoothingPresets,
  strokeStylePresets,
  strokeWidthPresets,
  textSizePresets,
} from "@/lib/canvasStyle";
import { ColorPicker } from "@/components/workspace/ColorPicker";
import type { CanvasCreationDefaultStyle, CanvasObject, CanvasPenSettings, CanvasTool } from "@/types/workspace";

type CanvasObjectToolbarProps = {
  object: CanvasObject;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdate: (updates: Partial<CanvasObject>) => void;
};

type PenToolToolbarProps = {
  penSettings: CanvasPenSettings;
  onChange: (settings: CanvasPenSettings) => void;
};

type CanvasToolDefaultsToolbarProps = {
  defaults: CanvasCreationDefaultStyle;
  tool: CanvasTool;
  onUpdate: (updates: CanvasCreationDefaultStyle) => void;
};

export function PenToolToolbar({ penSettings, onChange }: PenToolToolbarProps) {
  function updateMode(mode: CanvasPenSettings["mode"]) {
    const isEnteringHighlighter = mode === "highlighter" && penSettings.mode !== "highlighter";

    onChange({
      ...penSettings,
      mode,
      ...(isEnteringHighlighter
        ? {
            strokeColor: defaultHighlighterColor,
            strokeWidth: defaultHighlighterStrokeWidth,
          }
        : {}),
    });
  }

  return (
    <>
      <div className="mr-2 min-w-24">
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tool</div>
        <div className="text-xs font-semibold text-slate-700">Pen defaults</div>
      </div>
      {penSettings.mode === "laser" ? (
        <ColorPicker
          currentValue={getLaserColor(penSettings.laserColor)}
          label="Laser"
          onSelect={(laserColor) => onChange({ ...penSettings, laserColor })}
          presets={colorPresets}
        />
      ) : (
        <ColorPicker
          currentValue={penSettings.strokeColor}
          label="Stroke"
          onSelect={(strokeColor) => onChange({ ...penSettings, strokeColor })}
          presets={colorPresets}
        />
      )}
      <PenStrokeControls
        allowLaserMode
        inkDensity={penSettings.inkDensity}
        laserFadeDuration={penSettings.laserFadeDuration}
        mode={penSettings.mode}
        smoothing={penSettings.smoothing}
        strokeWidth={penSettings.strokeWidth}
        onInkDensityChange={(inkDensity) => onChange({ ...penSettings, inkDensity })}
        onLaserFadeDurationChange={(laserFadeDuration) => onChange({ ...penSettings, laserFadeDuration })}
        onModeChange={updateMode}
        onSmoothingChange={(smoothing) => onChange({ ...penSettings, smoothing })}
        onStrokeWidthChange={(strokeWidth) => onChange({ ...penSettings, strokeWidth })}
      />
    </>
  );
}

export function CanvasToolDefaultsToolbar({ defaults, tool, onUpdate }: CanvasToolDefaultsToolbarProps) {
  const isTextTool = tool === "Text Box";
  const supportsFill = tool === "Rectangle" || tool === "Circle" || isTextTool;
  const supportsStroke = tool === "Rectangle" || tool === "Circle" || tool === "Line" || tool === "Arrow" || isTextTool;
  const supportsStrokeStyle = supportsStroke;
  const strokeWidth = defaults.strokeWidth ?? defaultCanvasStyle.strokeWidth;
  const strokeStyle = defaults.strokeStyle ?? defaultCanvasStyle.strokeStyle;
  const textAlign = defaults.textAlign ?? defaultCanvasStyle.textAlign;
  const textVerticalAlign = defaults.textVerticalAlign ?? defaultCanvasStyle.textVerticalAlign;

  return (
    <>
      <div className="mr-2 min-w-24">
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tool</div>
        <div className="text-xs font-semibold text-slate-700">{tool} defaults</div>
      </div>

      {isTextTool ? (
        <>
          <ColorPicker
            currentValue={defaults.textColor ?? defaultCanvasStyle.textColor}
            icon={<Type aria-hidden="true" className="h-4 w-4" />}
            label="Text color"
            onSelect={(textColor) => onUpdate({ textColor })}
            presets={colorPresets}
          />
          <ColorPicker
            currentValue={defaults.textHighlightColor ?? defaultCanvasStyle.textHighlightColor}
            icon={<Highlighter aria-hidden="true" className="h-4 w-4" />}
            label="Highlight"
            onSelect={(textHighlightColor) => onUpdate({ textHighlightColor })}
            presets={highlightPresets}
          />
          <ToolbarDropdown
            ariaLabel="Default text size"
            currentLabel={`${defaults.fontSize ?? defaultCanvasStyle.fontSize}`}
            options={textSizePresets.map((fontSize) => ({ label: `${fontSize}`, value: fontSize }))}
            selectedValue={defaults.fontSize ?? defaultCanvasStyle.fontSize}
            title="Text size"
            onSelect={(fontSize) => onUpdate({ fontSize })}
          />
          <button
            aria-label="Default bold text"
            className={toolbarButtonClass(Boolean(defaults.textBold))}
            title="Bold"
            type="button"
            onClick={() => onUpdate({ textBold: !defaults.textBold })}
          >
            <BoldIcon aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Default italic text"
            className={toolbarButtonClass(Boolean(defaults.textItalic))}
            title="Italic"
            type="button"
            onClick={() => onUpdate({ textItalic: !defaults.textItalic })}
          >
            <ItalicIcon aria-hidden="true" className="h-4 w-4" />
          </button>
          <span className="h-6 w-px bg-slate-200" />
          <button
            aria-label="Default text align left"
            className={toolbarButtonClass(textAlign === "left")}
            title="Align left"
            type="button"
            onClick={() => onUpdate({ textAlign: "left" })}
          >
            <AlignLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Default text align center"
            className={toolbarButtonClass(textAlign === "center")}
            title="Align center"
            type="button"
            onClick={() => onUpdate({ textAlign: "center" })}
          >
            <AlignCenter aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Default text align right"
            className={toolbarButtonClass(textAlign === "right")}
            title="Align right"
            type="button"
            onClick={() => onUpdate({ textAlign: "right" })}
          >
            <AlignRight aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Default text align top"
            className={toolbarButtonClass(textVerticalAlign === "top")}
            title="Align top"
            type="button"
            onClick={() => onUpdate({ textVerticalAlign: "top" })}
          >
            <AlignVerticalJustifyStart aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Default text align middle"
            className={toolbarButtonClass(textVerticalAlign === "middle")}
            title="Align middle"
            type="button"
            onClick={() => onUpdate({ textVerticalAlign: "middle" })}
          >
            <AlignVerticalJustifyCenter aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Default text align bottom"
            className={toolbarButtonClass(textVerticalAlign === "bottom")}
            title="Align bottom"
            type="button"
            onClick={() => onUpdate({ textVerticalAlign: "bottom" })}
          >
            <AlignVerticalJustifyEnd aria-hidden="true" className="h-4 w-4" />
          </button>
          <span className="h-6 w-px bg-slate-200" />
        </>
      ) : null}

      {supportsFill ? (
        <ColorPicker
          currentValue={defaults.fillColor ?? defaultCanvasStyle.fillColor}
          label="Fill"
          onSelect={(fillColor) => onUpdate({ fillColor })}
          presets={fillPresets}
        />
      ) : null}

      {supportsStroke ? (
        <ColorPicker
          currentValue={defaults.strokeColor ?? defaultCanvasStyle.strokeColor}
          label="Stroke"
          onSelect={(strokeColor) => onUpdate({ strokeColor })}
          presets={colorPresets}
        />
      ) : null}

      {supportsStroke ? (
        <>
          <SegmentLabel>Width</SegmentLabel>
          {strokeWidthPresets.map((nextStrokeWidth) => (
            <button
              key={`${tool}-default-stroke-width-${nextStrokeWidth}`}
              aria-label={`Default stroke width ${nextStrokeWidth}`}
              className={compactButtonClass(strokeWidth === nextStrokeWidth)}
              title={`Stroke width ${nextStrokeWidth}`}
              type="button"
              onClick={() => onUpdate({ strokeWidth: nextStrokeWidth })}
            >
              {nextStrokeWidth}
            </button>
          ))}
        </>
      ) : null}

      {supportsStrokeStyle ? (
        <>
          <SegmentLabel>Style</SegmentLabel>
          {strokeStylePresets.map((style) => (
            <button
              key={`${tool}-default-stroke-style-${style.value}`}
              aria-label={`Default stroke style ${style.label}`}
              className={compactButtonClass(strokeStyle === style.value, "min-w-14")}
              type="button"
              onClick={() => onUpdate({ strokeStyle: style.value })}
            >
              {style.label}
            </button>
          ))}
        </>
      ) : null}
    </>
  );
}

export function CanvasObjectToolbar({ object, onDelete, onDuplicate, onUpdate }: CanvasObjectToolbarProps) {
  const supportsFill = object.type === "rectangle" || object.type === "circle" || object.type === "textBox";
  const supportsStroke = object.type !== "image";
  const supportsStrokeStyle =
    object.type === "rectangle" ||
    object.type === "circle" ||
    object.type === "textBox" ||
    object.type === "line" ||
    object.type === "arrow";
  const isPenStroke = object.type === "penStroke";

  function updatePenMode(penMode: CanvasPenSettings["mode"]) {
    const isEnteringHighlighter = penMode === "highlighter" && object.penMode !== "highlighter";

    onUpdate({
      penMode,
      ...(isEnteringHighlighter
        ? {
            strokeColor: defaultHighlighterColor,
            strokeWidth: Math.max(defaultHighlighterStrokeWidth, object.strokeWidth),
          }
        : {}),
    });
  }

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
        <PenStrokeControls
          inkDensity={object.penInkDensity ?? defaultPenSettings.inkDensity}
          laserFadeDuration={defaultPenSettings.laserFadeDuration}
          mode={object.penMode ?? defaultPenSettings.mode}
          smoothing={object.penSmoothing ?? defaultPenSettings.smoothing}
          strokeWidth={object.strokeWidth}
          showPenControls={isPenStroke}
          onInkDensityChange={(penInkDensity) => onUpdate({ penInkDensity })}
          onLaserFadeDurationChange={() => undefined}
          onModeChange={updatePenMode}
          onSmoothingChange={(penSmoothing) => onUpdate({ penSmoothing })}
          onStrokeWidthChange={(strokeWidth) => onUpdate({ strokeWidth })}
        />
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

function PenStrokeControls({
  allowLaserMode = false,
  inkDensity,
  laserFadeDuration,
  mode,
  smoothing,
  strokeWidth,
  showPenControls = true,
  onInkDensityChange,
  onLaserFadeDurationChange,
  onModeChange,
  onSmoothingChange,
  onStrokeWidthChange,
}: {
  allowLaserMode?: boolean;
  inkDensity: CanvasPenSettings["inkDensity"];
  laserFadeDuration: CanvasPenSettings["laserFadeDuration"];
  mode: CanvasPenSettings["mode"];
  smoothing: CanvasPenSettings["smoothing"];
  strokeWidth: number;
  showPenControls?: boolean;
  onInkDensityChange: (inkDensity: CanvasPenSettings["inkDensity"]) => void;
  onLaserFadeDurationChange: (laserFadeDuration: CanvasPenSettings["laserFadeDuration"]) => void;
  onModeChange: (mode: CanvasPenSettings["mode"]) => void;
  onSmoothingChange: (smoothing: CanvasPenSettings["smoothing"]) => void;
  onStrokeWidthChange: (strokeWidth: number) => void;
}) {
  const isLaserMode = mode === "laser";
  const modePresets = allowLaserMode ? penModePresets : penModePresets.filter((preset) => preset.value !== "laser");

  return (
    <>
      {!isLaserMode ? (
        <>
          <SegmentLabel>Width</SegmentLabel>
          {showPenControls ? (
            <ToolbarDropdown
              ariaLabel="Pen stroke width"
              currentLabel={`${strokeWidth}`}
              options={penStrokeWidthPresets.map((width) => ({ label: `${width}`, value: width }))}
              selectedValue={strokeWidth}
              title="Pen stroke width"
              onSelect={onStrokeWidthChange}
            />
          ) : (
            strokeWidthPresets.map((nextStrokeWidth) => (
              <button
                key={nextStrokeWidth}
                aria-label={`Stroke width ${nextStrokeWidth}`}
                className={compactButtonClass(strokeWidth === nextStrokeWidth)}
                title={`Stroke width ${nextStrokeWidth}`}
                type="button"
                onClick={() => onStrokeWidthChange(nextStrokeWidth)}
              >
                {nextStrokeWidth}
              </button>
            ))
          )}
        </>
      ) : null}
      {showPenControls ? (
        <>
          {!isLaserMode ? (
            <>
              <SegmentLabel>Smoothing</SegmentLabel>
              <ToolbarDropdown
                ariaLabel="Pen smoothing"
                currentLabel={getPresetLabel(penSmoothingPresets, smoothing)}
                options={penSmoothingPresets}
                selectedValue={smoothing}
                title="Pen smoothing"
                onSelect={onSmoothingChange}
              />
            </>
          ) : null}
          <SegmentLabel>Mode</SegmentLabel>
          {modePresets.map((preset) => (
            <button
              key={preset.value}
              aria-label={`Pen mode ${preset.label}`}
              className={compactButtonClass(mode === preset.value, "min-w-16")}
              title={`Pen mode ${preset.label}`}
              type="button"
              onClick={() => onModeChange(preset.value)}
            >
              {preset.label}
            </button>
          ))}
          {isLaserMode ? (
            <>
              <SegmentLabel>Fade</SegmentLabel>
              <ToolbarDropdown
                ariaLabel="Laser fade duration"
                currentLabel={getPresetLabel(laserFadeDurationPresets, laserFadeDuration)}
                options={laserFadeDurationPresets}
                selectedValue={laserFadeDuration}
                title="Laser fade duration"
                onSelect={onLaserFadeDurationChange}
              />
            </>
          ) : null}
          {mode === "ink" ? (
            <>
              <SegmentLabel>Density</SegmentLabel>
              <ToolbarDropdown
                ariaLabel="Ink density"
                currentLabel={getPresetLabel(penInkDensityPresets, inkDensity)}
                options={penInkDensityPresets}
                selectedValue={inkDensity}
                title="Ink density"
                onSelect={onInkDensityChange}
              />
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function ToolbarDropdown<TValue extends string | number>({
  ariaLabel,
  currentLabel,
  options,
  selectedValue,
  title,
  onSelect,
}: {
  ariaLabel: string;
  currentLabel: string;
  options: Array<{ label: string; value: TValue }>;
  selectedValue: TValue;
  title: string;
  onSelect: (value: TValue) => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof globalThis.Node && !dropdownRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  function selectValue(value: TValue) {
    onSelect(value);
    setIsOpen(false);
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className="inline-flex h-8 min-w-16 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        title={title}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        {currentLabel}
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      {isOpen ? (
        <div className="absolute left-0 top-9 z-30 grid min-w-28 gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-soft">
          {options.map((option) => (
            <button
              key={`${ariaLabel}-${option.value}`}
              aria-label={`${ariaLabel} ${option.label}`}
              className={[
                "h-8 rounded px-2 text-left text-xs font-semibold transition",
                selectedValue === option.value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
              ].join(" ")}
              type="button"
              onClick={() => selectValue(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getPresetLabel<TValue extends string | number>(
  presets: Array<{ label: string; value: TValue }>,
  value: TValue,
) {
  return presets.find((preset) => preset.value === value)?.label ?? `${value}`;
}

function getObjectLabel(object: CanvasObject) {
  if (object.type === "penStroke") {
    if (object.penMode === "highlighter") {
      return "Highlighter";
    }

    return "Pen stroke";
  }

  if (object.type === "textBox") {
    return "Text box";
  }

  return object.type;
}

function getLaserColor(value: string | undefined) {
  return typeof value === "string" && value.trim() ? value : defaultLaserColor;
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
