"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Circle,
  Diamond,
  Eraser,
  Grid3X3,
  Hand,
  HelpCircle,
  Image as ImageIcon,
  Download,
  Mail,
  Upload,
  Magnet,
  Maximize2,
  Moon,
  Redo2,
  Settings2,
  MousePointer2,
  ArrowRight,
  Square,
  Sun,
  Type,
  Minus,
  Pencil,
  ZoomIn,
  ZoomOut,
  Trash2,
  Undo2,
} from "lucide-react";
import type { CanvasShapeType, CanvasTool } from "@/types/workspace";

const tools: Array<{ icon: typeof MousePointer2; label: CanvasTool; shortcut: string }> = [
  { icon: MousePointer2, label: "Select", shortcut: "1" },
  { icon: Hand, label: "Pan", shortcut: "2" },
  { icon: Type, label: "Text Box", shortcut: "4" },
  { icon: Minus, label: "Line", shortcut: "5" },
  { icon: ArrowRight, label: "Arrow", shortcut: "6" },
];

const shapeOptions: Array<{ icon: typeof Square; label: string; value: CanvasShapeType }> = [
  { icon: Square, label: "Rectangle", value: "rectangle" },
  { icon: Circle, label: "Circle", value: "circle" },
  { icon: Diamond, label: "Diamond", value: "diamond" },
];

const activeControlClass = "border-leaf-200 bg-leaf-50 text-leaf-700";

type CanvasCreationToolbarProps = {
  activeTool: CanvasTool;
  activeShapeType: CanvasShapeType;
  canRedoCanvas: boolean;
  canUndoCanvas: boolean;
  isDarkMode: boolean;
  isGridVisible: boolean;
  isFlowchartConnectorArrowEnabled: boolean;
  isSnapToGridEnabled: boolean;
  onHelpClick: () => void;
  onImageUploadClick: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onResetWorkspace: () => void;
  onRedoCanvas: () => void;
  onResetView: () => void;
  onToggleDarkMode: () => void;
  onToggleGrid: () => void;
  onToggleFlowchartConnectorArrow: () => void;
  onToggleSnapToGrid: () => void;
  onShapeTypeChange: (shapeType: CanvasShapeType) => void;
  onToolChange: (tool: CanvasTool) => void;
  onUndoCanvas: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function CanvasCreationToolbar({
  activeTool,
  activeShapeType,
  canRedoCanvas,
  canUndoCanvas,
  isDarkMode,
  isGridVisible,
  isFlowchartConnectorArrowEnabled,
  isSnapToGridEnabled,
  onHelpClick,
  onImageUploadClick,
  onExportBackup,
  onImportBackup,
  onResetWorkspace,
  onRedoCanvas,
  onResetView,
  onToggleDarkMode,
  onToggleGrid,
  onToggleFlowchartConnectorArrow,
  onToggleSnapToGrid,
  onShapeTypeChange,
  onToolChange,
  onUndoCanvas,
  onZoomIn,
  onZoomOut,
}: CanvasCreationToolbarProps) {
  const shapeDropdownRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const betaRef = useRef<HTMLDivElement>(null);
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBetaOpen, setIsBetaOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const activeShapeOption = shapeOptions.find((option) => option.value === activeShapeType) ?? shapeOptions[0];
  const ActiveShapeIcon = activeShapeOption.icon;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof globalThis.Node && !shapeDropdownRef.current?.contains(event.target)) {
        setIsShapeMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof globalThis.Node)) {
        return;
      }
      if (!settingsRef.current?.contains(event.target)) {
        setIsSettingsOpen(false);
      }
      if (!betaRef.current?.contains(event.target)) {
        setIsBetaOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
        setIsBetaOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function selectShape(shapeType: CanvasShapeType) {
    onShapeTypeChange(shapeType);
    onToolChange("Shape");
    setIsShapeMenuOpen(false);
  }

  return (
    <>
      {isResetConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onPointerDown={() => setIsResetConfirmOpen(false)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-xl"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-slate-800">Reset Beta Workspace?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This will permanently delete all projects, folders, pages, notes, and canvas objects stored in this
              browser. This cannot be undone.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Download a backup first to save a copy of your current work.
            </p>
            <button
              className="mt-3 flex items-center gap-1.5 text-sm text-leaf-600 hover:text-leaf-800 hover:underline"
              type="button"
              onClick={onExportBackup}
            >
              <Download aria-hidden="true" className="h-3.5 w-3.5" />
              Download Backup
            </button>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                type="button"
                onClick={() => {
                  onResetWorkspace();
                  setIsResetConfirmOpen(false);
                  setIsBetaOpen(false);
                }}
              >
                Reset Workspace
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div
        data-pan-block="true"
        data-wheel-block="true"
        className="pointer-events-auto absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-2 py-2 shadow-soft backdrop-blur"
        onPointerDown={(event) => event.stopPropagation()}
      >
      <div className="flex items-center gap-1.5">
        {tools.slice(0, 2).map((tool) => {
          const Icon = tool.icon;

          return (
            <button
              key={tool.label}
              aria-label={`${tool.label} tool, shortcut ${tool.shortcut}`}
              className={[
                "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
                activeTool === tool.label
                  ? activeControlClass
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
              title={`${tool.label} (${tool.shortcut})`}
              type="button"
              onClick={() => onToolChange(tool.label)}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              <ShortcutBadge isActive={activeTool === tool.label}>{tool.shortcut}</ShortcutBadge>
            </button>
          );
        })}
        <div ref={shapeDropdownRef} className="relative flex">
          <button
            aria-label={`Shape tool, ${activeShapeOption.label}, shortcut 3`}
            className={[
              "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
              activeTool === "Shape"
                ? activeControlClass
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
            ].join(" ")}
            title={`Shape: ${activeShapeOption.label} (3)`}
            type="button"
            onClick={() => onToolChange("Shape")}
          >
            <ActiveShapeIcon aria-hidden="true" className="h-4 w-4" />
            <ShortcutBadge isActive={activeTool === "Shape"}>3</ShortcutBadge>
          </button>
          <button
            aria-expanded={isShapeMenuOpen}
            aria-label="Choose shape type"
            className={[
              "-ml-1 inline-flex h-9 w-5 items-center justify-center rounded-r-full border border-l-0 transition",
              activeTool === "Shape"
                ? activeControlClass
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
            ].join(" ")}
            title="Choose shape type"
            type="button"
            onClick={() => setIsShapeMenuOpen((current) => !current)}
          >
            <ChevronDown aria-hidden="true" className="h-3 w-3" />
          </button>
          {isShapeMenuOpen ? (
            <div className="absolute bottom-12 left-0 z-30 grid min-w-36 gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-soft">
              {shapeOptions.map((option) => {
                const OptionIcon = option.icon;

                return (
                  <button
                    key={option.value}
                    aria-label={`Shape type ${option.label}`}
                    className={[
                      "flex h-8 items-center gap-2 rounded px-2 text-left text-xs font-semibold transition",
                      activeShapeType === option.value ? "bg-leaf-50 text-leaf-700" : "text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                    type="button"
                    onClick={() => selectShape(option.value)}
                  >
                    <OptionIcon aria-hidden="true" className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        {tools.slice(2).map((tool) => {
          const Icon = tool.icon;

          return (
            <button
              key={tool.label}
              aria-label={`${tool.label} tool, shortcut ${tool.shortcut}`}
              className={[
                "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
                activeTool === tool.label
                  ? activeControlClass
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
              title={`${tool.label} (${tool.shortcut})`}
              type="button"
              onClick={() => onToolChange(tool.label)}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              <ShortcutBadge isActive={activeTool === tool.label}>{tool.shortcut}</ShortcutBadge>
            </button>
          );
        })}
        <button
          aria-label="Import image, shortcut 8"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          title="Import image (8)"
          type="button"
          onClick={onImageUploadClick}
        >
          <ImageIcon aria-hidden="true" className="h-4 w-4" />
          <ShortcutBadge>8</ShortcutBadge>
        </button>
        <button
          aria-label="Pen tool, shortcut 9"
          className={[
            "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
            activeTool === "Pen"
              ? activeControlClass
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
          ].join(" ")}
          title="Pen (9)"
          type="button"
          onClick={() => onToolChange("Pen")}
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
          <ShortcutBadge isActive={activeTool === "Pen"}>9</ShortcutBadge>
        </button>
        <button
          aria-label="Eraser tool, shortcut 0"
          className={[
            "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
            activeTool === "Eraser"
              ? activeControlClass
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
          ].join(" ")}
          title="Eraser (0)"
          type="button"
          onClick={() => onToolChange("Eraser")}
        >
          <Eraser aria-hidden="true" className="h-4 w-4" />
          <ShortcutBadge isActive={activeTool === "Eraser"}>0</ShortcutBadge>
        </button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button
          aria-label="Zoom in, shortcut plus"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          title="Zoom in (+)"
          type="button"
          onClick={onZoomIn}
        >
          <ZoomIn aria-hidden="true" className="h-4 w-4" />
          <ShortcutBadge>+</ShortcutBadge>
        </button>
        <button
          aria-label="Zoom out, shortcut minus"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          title="Zoom out (-)"
          type="button"
          onClick={onZoomOut}
        >
          <ZoomOut aria-hidden="true" className="h-4 w-4" />
          <ShortcutBadge>-</ShortcutBadge>
        </button>
        <button
          aria-label="Reset view"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          title="Reset view"
          type="button"
          onClick={onResetView}
        >
          <Maximize2 aria-hidden="true" className="h-4 w-4" />
        </button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button
          aria-label="Undo canvas action, shortcut Command or Control Z"
          className={toolbarButtonClass(false, !canUndoCanvas)}
          title="Undo canvas action (Cmd/Ctrl+Z)"
          type="button"
          onClick={() => {
            if (canUndoCanvas) {
              onUndoCanvas();
            }
          }}
        >
          <Undo2 aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          aria-label="Redo canvas action, shortcut Command or Control Shift Z or Command or Control Y"
          className={toolbarButtonClass(false, !canRedoCanvas)}
          title="Redo canvas action (Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y)"
          type="button"
          onClick={() => {
            if (canRedoCanvas) {
              onRedoCanvas();
            }
          }}
        >
          <Redo2 aria-hidden="true" className="h-4 w-4" />
        </button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button
          aria-label="Open shortcuts help"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          title="Shortcuts and controls"
          type="button"
          onClick={onHelpClick}
        >
          <HelpCircle aria-hidden="true" className="h-4 w-4" />
        </button>
        <div ref={settingsRef} className="relative">
          <button
            aria-expanded={isSettingsOpen}
            aria-label="Canvas settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            title="Canvas settings"
            type="button"
            onClick={() => {
              setIsSettingsOpen((v) => !v);
              setIsBetaOpen(false);
            }}
          >
            <Settings2 aria-hidden="true" className="h-4 w-4" />
          </button>
          {isSettingsOpen ? (
            <div className="absolute bottom-12 right-0 z-30 w-52 rounded-md border border-slate-200 bg-white p-2 text-sm shadow-soft">
              <button
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                className={[
                  "flex h-9 w-full items-center justify-between gap-2 rounded px-2 text-left transition",
                  isDarkMode ? "bg-leaf-50 text-leaf-700" : "text-slate-600 hover:bg-slate-50",
                ].join(" ")}
                type="button"
                onClick={onToggleDarkMode}
              >
                <span className="inline-flex items-center gap-2">
                  {isDarkMode ? (
                    <Moon aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Sun aria-hidden="true" className="h-4 w-4" />
                  )}
                  Theme
                </span>
                <span className="text-xs font-semibold">{isDarkMode ? "Dark" : "Light"}</span>
              </button>
              <button
                aria-label={isSnapToGridEnabled ? "Disable snap to grid" : "Enable snap to grid"}
                className={[
                  "mt-1 flex h-9 w-full items-center justify-between gap-2 rounded px-2 text-left transition",
                  isSnapToGridEnabled ? "bg-leaf-50 text-leaf-700" : "text-slate-600 hover:bg-slate-50",
                ].join(" ")}
                type="button"
                onClick={onToggleSnapToGrid}
              >
                <span className="inline-flex items-center gap-2">
                  <Magnet aria-hidden="true" className="h-4 w-4" />
                  Snap
                </span>
                <span className="text-xs font-semibold">{isSnapToGridEnabled ? "On" : "Off"}</span>
              </button>
              <button
                aria-label={isGridVisible ? "Hide grid" : "Show grid"}
                className={[
                  "mt-1 flex h-9 w-full items-center justify-between gap-2 rounded px-2 text-left transition",
                  isGridVisible ? "bg-leaf-50 text-leaf-700" : "text-slate-600 hover:bg-slate-50",
                ].join(" ")}
                type="button"
                onClick={onToggleGrid}
              >
                <span className="inline-flex items-center gap-2">
                  <Grid3X3 aria-hidden="true" className="h-4 w-4" />
                  Grid
                </span>
                <span className="text-xs font-semibold">{isGridVisible ? "On" : "Off"}</span>
              </button>
              <button
                aria-label={
                  isFlowchartConnectorArrowEnabled
                    ? "Disable default flowchart connector arrows"
                    : "Enable default flowchart connector arrows"
                }
                className={[
                  "mt-1 flex h-9 w-full items-center justify-between gap-2 rounded px-2 text-left transition",
                  isFlowchartConnectorArrowEnabled ? "bg-leaf-50 text-leaf-700" : "text-slate-600 hover:bg-slate-50",
                ].join(" ")}
                type="button"
                onClick={onToggleFlowchartConnectorArrow}
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  Flow arrows
                </span>
                <span className="text-xs font-semibold">{isFlowchartConnectorArrowEnabled ? "On" : "Off"}</span>
              </button>
            </div>
          ) : null}
        </div>
        <div ref={betaRef} className="relative">
          <button
            aria-expanded={isBetaOpen}
            aria-label="Beta info and tools"
            className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
            title="Beta info and tools"
            type="button"
            onClick={() => {
              setIsBetaOpen((v) => !v);
              setIsSettingsOpen(false);
            }}
          >
            Beta
          </button>
          {isBetaOpen ? (
            <div className="absolute bottom-12 right-0 z-30 w-56 rounded-md border border-slate-200 bg-white p-2 text-sm shadow-soft">
              <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Desktop Beta
              </div>
              <p className="px-2 pb-2 text-[11px] leading-relaxed text-slate-400">
                Notes are stored locally in this browser only — not synced to the cloud. Download a
                backup regularly to keep a copy on your device. Clearing browser data may remove your
                notes.
              </p>
              <div className="border-t border-slate-100 pt-2">
                <button
                  className="flex h-9 w-full items-center gap-2 rounded px-2 text-left text-slate-600 transition hover:bg-slate-50"
                  type="button"
                  onClick={onExportBackup}
                >
                  <Download aria-hidden="true" className="h-4 w-4" />
                  Download Backup
                </button>
                <button
                  className="mt-1 flex h-9 w-full items-center gap-2 rounded px-2 text-left text-slate-600 transition hover:bg-slate-50"
                  type="button"
                  onClick={onImportBackup}
                >
                  <Upload aria-hidden="true" className="h-4 w-4" />
                  Restore Backup
                </button>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <button
                  className="flex h-9 w-full items-center gap-2 rounded px-2 text-left text-red-600 transition hover:bg-red-50"
                  type="button"
                  onClick={() => setIsResetConfirmOpen(true)}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Reset Beta Workspace
                </button>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <a
                  className="flex h-9 w-full items-center gap-2 rounded px-2 text-left text-slate-600 transition hover:bg-slate-50"
                  href="mailto:theycallmehodg@gmail.com?subject=ThinkLeaf%20Beta%20Feedback"
                >
                  <Mail aria-hidden="true" className="h-4 w-4" />
                  Send Feedback
                </a>
              </div>
              <p className="px-2 pb-1 pt-2 text-[11px] text-slate-400">ThinkLeaf Beta v0.1</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
    </>
  );
}

function ShortcutBadge({ children, isActive = false }: { children: string; isActive?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "pointer-events-none absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border px-1 text-[10px] font-bold leading-none shadow-sm",
        isActive ? "border-leaf-200 bg-white text-leaf-700" : "border-slate-200 bg-slate-50 text-slate-500",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function toolbarButtonClass(isActive = false, isDisabled = false) {
  return [
    "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
    isDisabled
      ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
      : isActive
        ? activeControlClass
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
  ].join(" ");
}
