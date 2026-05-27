import type { SidebarItemColor } from "@/types/workspace";

export const SIDEBAR_ITEM_PADDING_CLASS = "px-1 py-0.5";

export const SIDEBAR_COLOR_TEXT: Record<SidebarItemColor, string> = {
  green: "text-emerald-600",
  blue: "text-blue-600",
  purple: "text-purple-600",
  orange: "text-orange-500",
  red: "text-red-600",
  gray: "text-slate-500",
};

export const SIDEBAR_COLOR_ICON: Record<SidebarItemColor, string> = {
  green: "text-emerald-500",
  blue: "text-blue-500",
  purple: "text-purple-500",
  orange: "text-orange-500",
  red: "text-red-500",
  gray: "text-slate-400",
};

export const SIDEBAR_COLOR_OPTIONS: Array<{ value: SidebarItemColor | undefined; label: string; swatch: string }> = [
  { value: undefined, label: "Default", swatch: "bg-slate-200 border-slate-300" },
  { value: "green", label: "Green", swatch: "bg-emerald-500 border-emerald-600" },
  { value: "blue", label: "Blue", swatch: "bg-blue-500 border-blue-600" },
  { value: "purple", label: "Purple", swatch: "bg-purple-500 border-purple-600" },
  { value: "orange", label: "Orange", swatch: "bg-orange-500 border-orange-600" },
  { value: "red", label: "Red", swatch: "bg-red-500 border-red-600" },
  { value: "gray", label: "Gray", swatch: "bg-slate-400 border-slate-500" },
];
