import type { CanvasConnectorAnchor, CanvasObject, CanvasPoint, CanvasTool } from "@/types/workspace";

export type ResizeHandle = "n" | "e" | "s" | "w" | "nw" | "ne" | "sw" | "se";

export type MoveInteraction = {
  historyKey: string;
  kind: "move";
  id: string;
  offsetX: number;
  offsetY: number;
};

export type MoveSnapshot = Pick<CanvasObject, "x" | "x1" | "x2" | "y" | "y1" | "y2">;

export type MultiMoveInteraction = {
  historyKey: string;
  ids: string[];
  kind: "multiMove";
  pointerX: number;
  pointerY: number;
  startObjects: Record<string, MoveSnapshot>;
};

export type ResizeInteraction = {
  historyKey: string;
  kind: "resize";
  handle: ResizeHandle;
  id: string;
  pointerX: number;
  pointerY: number;
  startHeight: number;
  startWidth: number;
  startX: number;
  startY: number;
};

export type LineMoveInteraction = {
  historyKey: string;
  kind: "lineMove";
  id: string;
  pointerX: number;
  pointerY: number;
  startX1: number;
  startX2: number;
  startY1: number;
  startY2: number;
};

export type EndpointInteraction = {
  endpoint: "start" | "end";
  historyKey: string;
  id: string;
  kind: "endpoint";
};

export type ConnectorPathInteraction = {
  historyKey: string;
  id: string;
  kind: "connectorPath";
  pathKind: "curve" | "elbow";
};

export type ConnectorEndpointPreview = {
  endpoint: "start" | "end";
  id: string;
  pointerX: number;
  pointerY: number;
  targetAnchor: CanvasConnectorAnchor | null;
  targetObjectId: string | null;
};

export type CreateInteraction = {
  historyKey: string;
  kind: "create";
  id: string;
  tool: CanvasTool;
  startX: number;
  startY: number;
  moved: boolean;
};

export type PendingLineInteraction = {
  historyKey: string;
  id: string;
  kind: "pendingLine";
  startX: number;
  startY: number;
  tool: "Line" | "Arrow";
};

export type PenDrawInteraction = {
  historyKey: string;
  id: string;
  kind: "penDraw";
  moved: boolean;
};

export type LaserDrawInteraction = {
  id: string;
  kind: "laserDraw";
};

export type EraserInteraction = {
  erasedIds: string[];
  historyKey: string;
  kind: "eraser";
};

export type EraserCursorPoint = {
  id: string;
  x: number;
  y: number;
};

export type PanInteraction = {
  kind: "pan";
  pointerX: number;
  pointerY: number;
  startPanX: number;
  startPanY: number;
};

export type SelectionBoxInteraction = {
  additive: boolean;
  currentX: number;
  currentY: number;
  kind: "selectionBox";
  startX: number;
  startY: number;
};

export type Interaction =
  | MoveInteraction
  | MultiMoveInteraction
  | ResizeInteraction
  | LineMoveInteraction
  | EndpointInteraction
  | ConnectorPathInteraction
  | CreateInteraction
  | PendingLineInteraction
  | PenDrawInteraction
  | LaserDrawInteraction
  | EraserInteraction
  | PanInteraction
  | SelectionBoxInteraction;

export type LaserStroke = {
  color: string;
  id: string;
  points: CanvasPoint[];
};
