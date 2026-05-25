"use client";

import type { PointerEvent } from "react";
import {
  defaultCanvasStyle,
  objectCanvasOriginX,
  objectCanvasOriginY,
} from "@/lib/canvasStyle";
import type { CanvasConnectorAnchor, CanvasObject } from "@/types/workspace";
import type { EraserCursorPoint, ResizeHandle } from "@/components/workspace/canvas/canvasLayerTypes";

export function CanvasObjectView({
  isEditing,
  object,
  onFinishEditing,
  onTextChange,
}: {
  isEditing: boolean;
  object: CanvasObject;
  onFinishEditing: () => void;
  onTextChange: (text: string) => void;
}) {
  const sharedStyle = {
    backgroundColor: object.fillColor,
    borderColor: object.strokeColor,
    borderStyle: object.strokeStyle ?? defaultCanvasStyle.strokeStyle,
    borderWidth: object.strokeWidth,
    color: object.textColor,
  };
  const textStyle = {
    color: object.textColor,
    fontSize: object.fontSize ?? defaultCanvasStyle.fontSize,
    fontStyle: object.textItalic ? "italic" : "normal",
    fontWeight: object.textBold ? 700 : 400,
    textAlign: object.textAlign ?? defaultCanvasStyle.textAlign,
  };
  const textHighlightStyle = {
    backgroundColor: object.textHighlightColor ?? defaultCanvasStyle.textHighlightColor,
  };
  const verticalClass = {
    bottom: "justify-end",
    middle: "justify-center",
    top: "justify-start",
  }[object.textVerticalAlign ?? defaultCanvasStyle.textVerticalAlign];
  const hasText = object.type === "textBox" || object.text !== undefined;

  function renderTextContent() {
    if (!hasText) {
      return null;
    }

    if (isEditing) {
      return (
        <textarea
          autoFocus
          className="h-full w-full resize-none border-none bg-transparent px-2 py-1 leading-5 outline-none"
          data-canvas-text-editor="true"
          style={textStyle}
          value={object.text ?? ""}
          onBlur={onFinishEditing}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.blur();
              onFinishEditing();
            }
          }}
        />
      );
    }

    return (
      <div
        className={`flex h-full w-full flex-col overflow-hidden whitespace-pre-wrap px-2 py-1 leading-5 ${verticalClass}`}
      >
        <div style={textStyle}>
          <span style={textHighlightStyle}>{object.text || "Text box"}</span>
        </div>
      </div>
    );
  }

  if (object.type === "rectangle") {
    return (
      <div className="h-full w-full rounded" style={sharedStyle}>
        {renderTextContent()}
      </div>
    );
  }

  if (object.type === "circle") {
    return (
      <div className="h-full w-full overflow-hidden rounded-full" style={sharedStyle}>
        {renderTextContent()}
      </div>
    );
  }

  if (object.type === "diamond") {
    return (
      <div className="relative h-full w-full">
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible">
          <polygon
            fill={object.fillColor}
            points={`${object.width / 2},0 ${object.width},${object.height / 2} ${object.width / 2},${object.height} 0,${object.height / 2}`}
            stroke={object.strokeColor}
            strokeDasharray={object.strokeStyle === "dashed" ? "8 6" : object.strokeStyle === "dotted" ? "0 6" : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={object.strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="absolute inset-[12%]">{renderTextContent()}</div>
      </div>
    );
  }

  if (object.type === "image") {
    return (
      <div className="h-full w-full overflow-hidden rounded-md border border-slate-200 bg-white" style={sharedStyle}>
        {object.imageDataUrl ? (
          <img alt="" className="h-full w-full object-contain" draggable={false} src={object.imageDataUrl} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">Missing image</div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-md border bg-white/85 p-1" style={sharedStyle}>
      {renderTextContent()}
    </div>
  );
}

export function EraserCursorRing({
  opacity,
  point,
  size,
  zoom,
}: {
  opacity: number;
  point: EraserCursorPoint;
  size: number;
  zoom: number;
}) {
  const scaledSize = size / zoom;
  const borderWidth = Math.max(1.5 / zoom, 1);

  return (
    <div
      className="absolute rounded-full bg-white/20"
      style={{
        border: `${borderWidth}px solid rgba(15, 23, 42, 0.88)`,
        boxShadow: `0 0 0 ${Math.max(2 / zoom, 1)}px rgba(255, 255, 255, 0.86), 0 4px ${Math.max(
          12 / zoom,
          4,
        )}px rgba(15, 23, 42, 0.18)`,
        height: scaledSize,
        left: objectCanvasOriginX + point.x,
        opacity,
        top: objectCanvasOriginY + point.y,
        transform: "translate(-50%, -50%)",
        width: scaledSize,
      }}
    />
  );
}

export function ResizeHandleButton({
  handle,
  onPointerDown,
}: {
  handle: ResizeHandle;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  const position = {
    e: "-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
    n: "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
    ne: "-right-1.5 -top-1.5 cursor-nesw-resize",
    nw: "-left-1.5 -top-1.5 cursor-nwse-resize",
    s: "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
    se: "-bottom-1.5 -right-1.5 cursor-nwse-resize",
    sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
    w: "-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
  }[handle];

  return (
    <button
      aria-label={`Resize ${handle}`}
      className={`absolute h-3.5 w-3.5 rounded-full border border-leaf-600 bg-white shadow-sm ${position}`}
      title="Resize"
      type="button"
      onPointerDown={onPointerDown}
    />
  );
}

export function FlowchartConnectorHandle({
  anchor,
  onPointerDown,
}: {
  anchor: CanvasConnectorAnchor;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>, anchor: CanvasConnectorAnchor) => void;
}) {
  const position = {
    bottom: "-bottom-9 left-1/2 -translate-x-1/2",
    left: "-left-9 top-1/2 -translate-y-1/2",
    right: "-right-9 top-1/2 -translate-y-1/2",
    top: "-top-9 left-1/2 -translate-x-1/2",
  }[anchor];

  return (
    <button
      aria-label={`Add connected shape ${anchor}`}
      className={`absolute flex h-6 w-6 items-center justify-center rounded-full border border-leaf-600 bg-white text-sm font-bold leading-none text-leaf-700 shadow-sm ring-4 ring-white/80 transition hover:bg-leaf-50 ${position}`}
      title="Add connected shape"
      type="button"
      onPointerDown={(event) => onPointerDown(event, anchor)}
    >
      +
    </button>
  );
}

export function EndpointHandle({
  endpoint,
  object,
  onStart,
  point,
}: {
  endpoint: "start" | "end";
  object: CanvasObject;
  onStart: (event: PointerEvent<HTMLButtonElement>, object: CanvasObject, endpoint: "start" | "end") => void;
  point: { x: number; y: number };
}) {
  return (
    <button
      aria-label={`Move ${endpoint} endpoint`}
      className="pointer-events-auto absolute h-7 w-7 rounded-full border border-leaf-600 bg-white shadow-sm ring-4 ring-white/70"
      style={{ left: point.x - 14, top: point.y - 14 }}
      title="Move endpoint"
      type="button"
      onPointerDown={(event) => onStart(event, object, endpoint)}
    />
  );
}
