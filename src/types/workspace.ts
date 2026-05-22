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
  createdAt: string;
  updatedAt: string;
};

export type Folder = {
  id: string;
  profileId: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Page = {
  id: string;
  profileId: string;
  projectId: string;
  folderId: string;
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

export type CanvasObjectType = "rectangle" | "circle" | "textBox" | "line" | "arrow" | "image";
export type CanvasTextAlign = "left" | "center" | "right";
export type CanvasTextVerticalAlign = "top" | "middle" | "bottom";
export type CanvasStrokeStyle = "solid" | "dashed" | "dotted";

export type CanvasTool =
  | "Select"
  | "Pan"
  | "Rectangle"
  | "Circle"
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
  text?: string;
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
  createdAt: string;
  updatedAt: string;
  // Future connector objects may add sourceObjectId, targetObjectId, sourceAnchor, and targetAnchor.
  // For now, line and arrow objects remain independent and do not stick to moved objects.
};

export type CanvasViewState = {
  panX: number;
  panY: number;
  zoom: number;
};

export type WorkspaceData = {
  profiles: Profile[];
  activeProfileId: string;
  projects: Project[];
  folders: Folder[];
  pages: Page[];
  recentPageIds: string[];
};
