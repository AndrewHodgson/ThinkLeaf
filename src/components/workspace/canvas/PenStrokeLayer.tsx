import type { PointerEvent } from "react";
import { defaultPenSettings } from "@/lib/canvasStyle";
import type { CanvasObject, CanvasTool } from "@/types/workspace";
import { getPenInkOutlinePath, getPenPath } from "@/components/workspace/canvas/penRendering";

type PenStrokeLayerProps = {
  activeDrawingPenId: string | null;
  activeTool: CanvasTool;
  activeToolCursor: string | undefined;
  eraserPreviewObjectIds: string[];
  penObjects: CanvasObject[];
  selectedObjectId: string | null;
  onContinueObjectErase: (event: PointerEvent<Element>, object: CanvasObject) => void;
  onStartObjectErase: (event: PointerEvent<Element>, object: CanvasObject) => void;
  onStartPenMove: (event: PointerEvent<SVGPathElement>, object: CanvasObject) => void;
};

export function PenStrokeLayer({
  activeDrawingPenId,
  activeTool,
  activeToolCursor,
  eraserPreviewObjectIds,
  penObjects,
  selectedObjectId,
  onContinueObjectErase,
  onStartObjectErase,
  onStartPenMove,
}: PenStrokeLayerProps) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      {penObjects.map((object) => {
        const isSelected = selectedObjectId === object.id;
        const isActivelyDrawing = activeDrawingPenId === object.id;
        const isEraserPreviewed = activeTool === "Eraser" && eraserPreviewObjectIds.includes(object.id);

        return (
          <PenStrokeView
            key={object.id}
            activeTool={activeTool}
            activeToolCursor={activeToolCursor}
            isActivelyDrawing={isActivelyDrawing}
            isEraserPreviewed={isEraserPreviewed}
            isSelected={isSelected}
            object={object}
            onContinueObjectErase={onContinueObjectErase}
            onStartObjectErase={onStartObjectErase}
            onStartPenMove={onStartPenMove}
          />
        );
      })}
    </svg>
  );
}

function PenStrokeView({
  activeTool,
  activeToolCursor,
  isActivelyDrawing,
  isEraserPreviewed,
  isSelected,
  object,
  onContinueObjectErase,
  onStartObjectErase,
  onStartPenMove,
}: {
  activeTool: CanvasTool;
  activeToolCursor: string | undefined;
  isActivelyDrawing: boolean;
  isEraserPreviewed: boolean;
  isSelected: boolean;
  object: CanvasObject;
  onContinueObjectErase: (event: PointerEvent<Element>, object: CanvasObject) => void;
  onStartObjectErase: (event: PointerEvent<Element>, object: CanvasObject) => void;
  onStartPenMove: (event: PointerEvent<SVGPathElement>, object: CanvasObject) => void;
}) {
  const path = getPenPath(object);
  const penMode = object.penMode ?? defaultPenSettings.mode;
  const shouldRenderInk = penMode === "ink";
  const shouldRenderHighlighter = penMode === "highlighter";

  return (
    <g opacity={isEraserPreviewed ? 0.35 : 1}>
      <path
        className="pointer-events-auto"
        d={path}
        fill="none"
        opacity="0"
        stroke={object.strokeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={Math.max(16, object.strokeWidth + 10)}
        style={{ cursor: activeTool === "Eraser" ? "none" : activeToolCursor }}
        onPointerDown={(event) => {
          if (activeTool === "Eraser") {
            onStartObjectErase(event, object);
            return;
          }

          onStartPenMove(event, object);
        }}
        onPointerEnter={(event) => onContinueObjectErase(event, object)}
      />
      {shouldRenderInk ? (
        <path d={getPenInkOutlinePath(object)} fill={object.strokeColor} stroke="none" />
      ) : (
        <path
          d={path}
          fill="none"
          stroke={object.strokeColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={shouldRenderHighlighter ? 0.38 : 1}
          strokeWidth={object.strokeWidth}
          style={shouldRenderHighlighter ? { mixBlendMode: "multiply" } : undefined}
        />
      )}
      {isSelected && activeTool !== "Eraser" && !isActivelyDrawing ? (
        <rect
          fill="none"
          height={Math.max(1, object.height)}
          pointerEvents="none"
          stroke="#238157"
          strokeDasharray="4 4"
          width={Math.max(1, object.width)}
          x={object.x}
          y={object.y}
        />
      ) : null}
    </g>
  );
}
