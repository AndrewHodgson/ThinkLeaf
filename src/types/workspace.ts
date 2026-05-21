export type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Folder = {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Page = {
  id: string;
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

export type CanvasObjectType = "rectangle" | "circle" | "textBox" | "line" | "arrow";

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
  text?: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  textColor: string;
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
  projects: Project[];
  folders: Folder[];
  pages: Page[];
  recentPageIds: string[];
};
