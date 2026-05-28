export type SidebarItemColor = "green" | "blue" | "purple" | "orange" | "red" | "gray";

export type Profile = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  profileId: string;
  name: string;
  color?: SidebarItemColor;
  createdAt: string;
  updatedAt: string;
};

export type Folder = {
  id: string;
  profileId: string;
  projectId: string;
  parentFolderId?: string;
  name: string;
  color?: SidebarItemColor;
  createdAt: string;
  updatedAt: string;
};

export type Page = {
  id: string;
  profileId: string;
  projectId: string;
  folderId?: string;
  title: string;
  body: string;
  noteDate: string;
  canvasViewState: CanvasViewState;
  canvasObjects: CanvasObject[];
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PageTemplate = {
  id: string;
  name: string;
  title: string;
  body: string;
  canvasViewState: CanvasViewState;
  canvasObjects: CanvasObject[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type CanvasObjectType =
  | "rectangle"
  | "circle"
  | "diamond"
  | "textBox"
  | "line"
  | "arrow"
  | "image"
  | "penStroke"
  | "group";
export type CanvasShapeType = "rectangle" | "circle" | "diamond";
export type CanvasTextAlign = "left" | "center" | "right";
export type CanvasTextVerticalAlign = "top" | "middle" | "bottom";
export type CanvasStrokeStyle = "solid" | "dashed" | "dotted";
export type CanvasConnectorAnchor = "top" | "right" | "bottom" | "left";
export type CanvasConnectorStyle = "straight" | "elbow" | "curve";
export type CanvasConnectorArrowDirection = "none" | "forward" | "backward" | "both";
export type CanvasConnectorLineMode = "single" | "double";
export type CanvasConnectorStart = {
  sourceAnchor: CanvasConnectorAnchor;
  sourceObjectId: string;
};
export type CanvasPenSmoothing = "off" | "light" | "medium" | "high" | "veryHigh";
export type CanvasPenMode = "uniform" | "ink" | "highlighter" | "laser";
export type CanvasPenInkDensity = "low" | "medium" | "high" | "veryHigh";
export type CanvasLaserFadeDuration = "fast" | "normal" | "long" | "longer" | "longest";
export type CanvasPoint = {
  t?: number;
  x: number;
  y: number;
};

export type CanvasPenSettings = {
  inkDensity: CanvasPenInkDensity;
  laserColor: string;
  laserFadeDuration: CanvasLaserFadeDuration;
  mode: CanvasPenMode;
  strokeColor: string;
  strokeWidth: number;
};

export type CanvasTool =
  | "Select"
  | "Pan"
  | "Shape"
  | "Pen"
  | "Text Box"
  | "Line"
  | "Arrow"
  | "Image"
  | "Eraser";

export type CanvasObject = {
  id: string;
  type: CanvasObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  imageDataUrl?: string;
  penPoints?: CanvasPoint[];
  penInkDensity?: CanvasPenInkDensity;
  penMode?: CanvasPenMode;
  penSmoothing?: CanvasPenSmoothing;
  groupId?: string;
  groupColor?: SidebarItemColor;
  groupedObjectIds?: string[];
  groupLabel?: string;
  text?: string;
  connectorLabel?: string;
  shapeLabel?: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeStyle?: CanvasStrokeStyle;
  textColor: string;
  textHighlightColor?: string;
  textBold?: boolean;
  textItalic?: boolean;
  textAlign?: CanvasTextAlign;
  textVerticalAlign?: CanvasTextVerticalAlign;
  fontSize?: number;
  sourceObjectId?: string;
  targetObjectId?: string;
  sourceAnchor?: CanvasConnectorAnchor;
  targetAnchor?: CanvasConnectorAnchor;
  connectorStyle?: CanvasConnectorStyle;
  arrowDirection?: CanvasConnectorArrowDirection;
  connectorLineMode?: CanvasConnectorLineMode;
  secondLineArrowDirection?: CanvasConnectorArrowDirection;
  secondLineStrokeColor?: string;
  secondLineStrokeStyle?: CanvasStrokeStyle;
  secondLineStrokeWidth?: number;
  curveControlOffsetX?: number;
  curveControlOffsetY?: number;
  elbowBendOffsetX?: number;
  elbowBendOffsetY?: number;
  createdAt: string;
  updatedAt: string;
};

export type CanvasCreationDefaultStyle = Partial<
  Pick<
    CanvasObject,
    | "fillColor"
    | "fontSize"
    | "strokeColor"
    | "strokeStyle"
    | "strokeWidth"
    | "textAlign"
    | "textBold"
    | "textColor"
    | "textHighlightColor"
    | "textItalic"
    | "textVerticalAlign"
  >
>;

export type CanvasCreationToolDefaults = {
  arrow: CanvasCreationDefaultStyle;
  circle: CanvasCreationDefaultStyle;
  diamond: CanvasCreationDefaultStyle;
  line: CanvasCreationDefaultStyle;
  rectangle: CanvasCreationDefaultStyle;
  textBox: CanvasCreationDefaultStyle;
};

export type CanvasViewState = {
  panX: number;
  panY: number;
  zoom: number;
};

export type CanvasHistoryOptions = {
  historyKey?: string;
  recordHistory?: boolean;
};

export type WorkspaceData = {
  profiles: Profile[];
  activeProfileId: string;
  projects: Project[];
  folders: Folder[];
  pages: Page[];
  recentPageIds: string[];
};
