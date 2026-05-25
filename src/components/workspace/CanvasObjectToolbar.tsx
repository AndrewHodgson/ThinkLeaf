"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
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
import type {
  CanvasConnectorAnchor,
  CanvasConnectorStart,
  CanvasCreationDefaultStyle,
  CanvasObject,
  CanvasPenSettings,
  CanvasTool,
} from "@/types/workspace";
import type { CanvasShapeType } from "@/types/workspace";

type CanvasObjectToolbarProps = {
  object: CanvasObject;
  pendingConnectorStart: CanvasConnectorStart | null;
  onCancelConnector: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStartConnector: (sourceAnchor: CanvasConnectorAnchor) => void;
  onUpdate: (updates: Partial<CanvasObject>) => void;
};

type PenToolToolbarProps = {
  penSettings: CanvasPenSettings;
  onChange: Dispatch<SetStateAction<CanvasPenSettings>>;
};

type CanvasToolDefaultsToolbarProps = {
  defaults: CanvasCreationDefaultStyle;
  tool: CanvasTool;
  onUpdate: (updates: CanvasCreationDefaultStyle) => void;
};

const activeControlClass = "border-leaf-200 bg-leaf-50 text-leaf-700";
const activeMenuItemClass = "bg-leaf-50 text-leaf-700";
const connectorStylePresets = [
  { label: "Straight", value: "straight" as const },
  { label: "Elbow", value: "elbow" as const },
  { label: "Curve", value: "curve" as const },
];
const arrowDirectionPresets = [
  { label: "None", value: "none" as const },
  { label: "Forward", value: "forward" as const },
  { label: "Back", value: "backward" as const },
  { label: "Both", value: "both" as const },
];
const connectorAnchorPresets = [
  { label: "Top", value: "top" as const },
  { label: "Right", value: "right" as const },
  { label: "Bottom", value: "bottom" as const },
  { label: "Left", value: "left" as const },
];
const shapeTypePresets = [
  { label: "Rectangle", value: "rectangle" as const },
  { label: "Circle", value: "circle" as const },
  { label: "Diamond", value: "diamond" as const },
];

export function PenToolToolbar({ penSettings, onChange }: PenToolToolbarProps) {
  function updateMode(mode: CanvasPenSettings["mode"]) {
    onChange((currentSettings) => {
      const isEnteringHighlighter = mode === "highlighter" && currentSettings.mode !== "highlighter";

      return {
        ...currentSettings,
        mode,
        ...(isEnteringHighlighter
          ? {
              strokeColor: defaultHighlighterColor,
              strokeWidth: defaultHighlighterStrokeWidth,
            }
          : {}),
      };
    });
  }

  function updatePenDefaults(updates: Partial<CanvasPenSettings>) {
    onChange((currentSettings) => ({
      ...currentSettings,
      ...updates,
    }));
  }

  return (
    <>
      <div className="mr-2 min-w-24">
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tool</div>
        <div className="text-xs font-semibold text-slate-700">Pen defaults</div>
      </div>
      <PenModeControls allowLaserMode mode={penSettings.mode} onModeChange={updateMode} />
      {penSettings.mode === "laser" ? (
        <ColorPicker
          currentValue={getLaserColor(penSettings.laserColor)}
          label="Laser Pointer"
          onSelect={(laserColor) => updatePenDefaults({ laserColor })}
          presets={colorPresets}
        />
      ) : (
        <ColorPicker
          currentValue={penSettings.strokeColor}
          label="Stroke"
          onSelect={(strokeColor) => updatePenDefaults({ strokeColor })}
          presets={colorPresets}
        />
      )}
      <PenStrokeControls
        inkDensity={penSettings.inkDensity}
        laserFadeDuration={penSettings.laserFadeDuration}
        mode={penSettings.mode}
        smoothing={penSettings.smoothing}
        strokeWidth={penSettings.strokeWidth}
        showModeControls={false}
        onInkDensityChange={(inkDensity) => updatePenDefaults({ inkDensity })}
        onLaserFadeDurationChange={(laserFadeDuration) => updatePenDefaults({ laserFadeDuration })}
        onModeChange={updateMode}
        onSmoothingChange={(smoothing) => updatePenDefaults({ smoothing })}
        onStrokeWidthChange={(strokeWidth) => updatePenDefaults({ strokeWidth })}
      />
    </>
  );
}

export function CanvasToolDefaultsToolbar({ defaults, tool, onUpdate }: CanvasToolDefaultsToolbarProps) {
  const isTextTool = tool === "Text Box";
  const isShapeTool = tool === "Shape";
  const supportsFill = isShapeTool || isTextTool;
  const supportsStroke = isShapeTool || tool === "Line" || tool === "Arrow" || isTextTool;
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

export function CanvasObjectToolbar({
  object,
  pendingConnectorStart,
  onCancelConnector,
  onDelete,
  onDuplicate,
  onStartConnector,
  onUpdate,
}: CanvasObjectToolbarProps) {
  const supportsFill =
    object.type === "rectangle" || object.type === "circle" || object.type === "diamond" || object.type === "textBox";
  const supportsStroke = object.type !== "image";
  const supportsStrokeStyle =
    object.type === "rectangle" ||
    object.type === "circle" ||
    object.type === "diamond" ||
    object.type === "textBox" ||
    object.type === "line" ||
    object.type === "arrow";
  const isPenStroke = object.type === "penStroke";
  const isConnectedLine = Boolean(object.sourceObjectId && object.targetObjectId);
  const isShape = isCanvasShape(object);

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

      {isPenStroke ? (
        <>
          <PenModeControls mode={object.penMode ?? defaultPenSettings.mode} onModeChange={updatePenMode} />
          <ColorPicker
            currentValue={object.strokeColor}
            label="Stroke"
            onSelect={(strokeColor) => onUpdate({ strokeColor })}
            presets={colorPresets}
          />
          <PenStrokeControls
            inkDensity={object.penInkDensity ?? defaultPenSettings.inkDensity}
            laserFadeDuration={defaultPenSettings.laserFadeDuration}
            mode={object.penMode ?? defaultPenSettings.mode}
            smoothing={object.penSmoothing ?? defaultPenSettings.smoothing}
            strokeWidth={object.strokeWidth}
            showModeControls={false}
            onInkDensityChange={(penInkDensity) => onUpdate({ penInkDensity })}
            onLaserFadeDurationChange={() => undefined}
            onModeChange={updatePenMode}
            onSmoothingChange={(penSmoothing) => onUpdate({ penSmoothing })}
            onStrokeWidthChange={(strokeWidth) => onUpdate({ strokeWidth })}
          />
        </>
      ) : (
        <>
          {isShape ? (
            <>
              <SegmentLabel>Shape</SegmentLabel>
              <ToolbarDropdown
                ariaLabel="Shape type"
                currentLabel={getShapeTypeLabel(object.type)}
                options={shapeTypePresets}
                selectedValue={object.type}
                title="Shape type"
                onSelect={(type) => onUpdate({ type })}
              />
              <ToolbarTextInput
                ariaLabel="Shape label"
                placeholder="Label"
                title="Shape label"
                value={object.shapeLabel ?? ""}
                onChange={(shapeLabel) => onUpdate({ shapeLabel })}
              />
              <SegmentLabel>Connect</SegmentLabel>
              {connectorAnchorPresets.map((anchor) => {
                const isPending =
                  pendingConnectorStart?.sourceObjectId === object.id &&
                  pendingConnectorStart.sourceAnchor === anchor.value;

                return (
                  <button
                    key={`connect-${anchor.value}`}
                    aria-label={`Connect from ${anchor.label}`}
                    className={compactButtonClass(isPending, "min-w-12")}
                    title={`Connect to another shape from ${anchor.label}`}
                    type="button"
                    onClick={() => {
                      if (isPending) {
                        onCancelConnector();
                      } else {
                        onStartConnector(anchor.value);
                      }
                    }}
                  >
                    {anchor.label}
                  </button>
                );
              })}
            </>
          ) : null}
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
            <StrokeWidthControls
              strokeWidth={object.strokeWidth}
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
          {isConnectedLine ? (
            <>
              <SegmentLabel>Connector</SegmentLabel>
              {connectorStylePresets.map((style) => (
                <button
                  key={style.value}
                  aria-label={`Connector style ${style.label}`}
                  className={compactButtonClass((object.connectorStyle ?? "straight") === style.value, "min-w-16")}
                  type="button"
                  onClick={() => onUpdate({ connectorStyle: style.value })}
                >
                  {style.label}
                </button>
              ))}
              <SegmentLabel>Start</SegmentLabel>
              <ToolbarDropdown
                ariaLabel="Connector start anchor"
                currentLabel={getConnectorAnchorLabel(object.sourceAnchor)}
                options={connectorAnchorPresets}
                selectedValue={object.sourceAnchor ?? "right"}
                title="Start anchor"
                onSelect={(sourceAnchor) => onUpdate({ sourceAnchor })}
              />
              <SegmentLabel>End</SegmentLabel>
              <ToolbarDropdown
                ariaLabel="Connector end anchor"
                currentLabel={getConnectorAnchorLabel(object.targetAnchor)}
                options={connectorAnchorPresets}
                selectedValue={object.targetAnchor ?? "left"}
                title="End anchor"
                onSelect={(targetAnchor) => onUpdate({ targetAnchor })}
              />
              <SegmentLabel>Arrow</SegmentLabel>
              {arrowDirectionPresets.map((direction) => (
                <button
                  key={direction.value}
                  aria-label={`Arrow direction ${direction.label}`}
                  className={compactButtonClass(getArrowDirectionValue(object) === direction.value, "min-w-14")}
                  type="button"
                  onClick={() => onUpdate({ arrowDirection: direction.value })}
                >
                  {direction.label}
                </button>
              ))}
              <ToolbarTextInput
                ariaLabel="Connector label"
                placeholder="Label"
                title="Connector label"
                value={object.connectorLabel ?? ""}
                onChange={(connectorLabel) => onUpdate({ connectorLabel })}
              />
            </>
          ) : null}
        </>
      )}

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

function ToolbarTextInput({
  ariaLabel,
  placeholder,
  title,
  value,
  onChange,
}: {
  ariaLabel: string;
  placeholder: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      aria-label={ariaLabel}
      className="h-8 w-28 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-leaf-300 focus:ring-2 focus:ring-leaf-100"
      placeholder={placeholder}
      title={title}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onPointerDown={(event) => event.stopPropagation()}
    />
  );
}

function PenModeControls({
  allowLaserMode = false,
  mode,
  onModeChange,
}: {
  allowLaserMode?: boolean;
  mode: CanvasPenSettings["mode"];
  onModeChange: (mode: CanvasPenSettings["mode"]) => void;
}) {
  const modePresets = allowLaserMode ? penModePresets : penModePresets.filter((preset) => preset.value !== "laser");

  return (
    <>
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
    </>
  );
}

function StrokeWidthControls({
  strokeWidth,
  onStrokeWidthChange,
}: {
  strokeWidth: number;
  onStrokeWidthChange: (strokeWidth: number) => void;
}) {
  return (
    <>
      <SegmentLabel>Width</SegmentLabel>
      {strokeWidthPresets.map((nextStrokeWidth) => (
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
      ))}
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
  showModeControls = true,
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
  showModeControls?: boolean;
  showPenControls?: boolean;
  onInkDensityChange: (inkDensity: CanvasPenSettings["inkDensity"]) => void;
  onLaserFadeDurationChange: (laserFadeDuration: CanvasPenSettings["laserFadeDuration"]) => void;
  onModeChange: (mode: CanvasPenSettings["mode"]) => void;
  onSmoothingChange: (smoothing: CanvasPenSettings["smoothing"]) => void;
  onStrokeWidthChange: (strokeWidth: number) => void;
}) {
  const isLaserMode = mode === "laser";

  return (
    <>
      {showPenControls && showModeControls ? (
        <PenModeControls allowLaserMode={allowLaserMode} mode={mode} onModeChange={onModeChange} />
      ) : null}
      {!isLaserMode ? (
        <>
          <SegmentLabel>Width</SegmentLabel>
          <ToolbarDropdown
            ariaLabel="Pen stroke width"
            currentLabel={`${strokeWidth}`}
            options={penStrokeWidthPresets.map((width) => ({ label: `${width}`, value: width }))}
            selectedValue={strokeWidth}
            title="Pen stroke width"
            onSelect={onStrokeWidthChange}
          />
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
                selectedValue === option.value ? activeMenuItemClass : "text-slate-600 hover:bg-slate-50",
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

  if (object.type === "diamond") {
    return "Diamond";
  }

  return object.type;
}

function isCanvasShape(object: CanvasObject): object is CanvasObject & { type: CanvasShapeType } {
  return object.type === "rectangle" || object.type === "circle" || object.type === "diamond";
}

function getShapeTypeLabel(type: CanvasShapeType) {
  return shapeTypePresets.find((preset) => preset.value === type)?.label ?? "Rectangle";
}

function getArrowDirectionValue(object: CanvasObject) {
  if (
    object.arrowDirection === "none" ||
    object.arrowDirection === "forward" ||
    object.arrowDirection === "backward" ||
    object.arrowDirection === "both"
  ) {
    return object.arrowDirection;
  }

  return object.type === "arrow" ? "forward" : "none";
}

function getConnectorAnchorLabel(anchor: CanvasConnectorAnchor | undefined) {
  return connectorAnchorPresets.find((preset) => preset.value === anchor)?.label ?? "Auto";
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
      ? activeControlClass
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
  ].join(" ");
}

function compactButtonClass(isActive = false, extraClass = "min-w-8") {
  return [
    "inline-flex h-8 items-center justify-center rounded-md border px-2 text-xs font-semibold transition",
    extraClass,
    isActive
      ? activeControlClass
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
  ].join(" ");
}
