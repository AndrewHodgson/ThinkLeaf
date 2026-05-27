import { formatDate } from "@/lib/workspaceUtils";
import type { Page } from "@/types/workspace";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { FileText, Star } from "lucide-react";

type PageButtonProps = {
  compact?: boolean;
  isActive: boolean;
  page: Page;
  actions?: ReactNode;
  onClick: () => void;
  onDoubleClickTitle?: () => void;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameKeyDown?: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
  onRenameBlur?: () => void;
};

export function PageButton({
  compact = false,
  isActive,
  page,
  actions,
  onClick,
  onDoubleClickTitle,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameKeyDown,
  onRenameBlur,
}: PageButtonProps) {
  const rowClass = [
    "group flex items-center gap-2 rounded-md border px-1 transition",
    isActive
      ? "border-leaf-400 text-leaf-700"
      : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50",
  ].join(" ");

  const icon = page.isFavorite ? (
    <Star aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-leaf-500 text-leaf-600" />
  ) : (
    <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
  );

  const actionsSlot = actions ? (
    <div
      className="flex shrink-0 items-center gap-1"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {actions}
    </div>
  ) : null;

  if (isRenaming) {
    return (
      <div className={rowClass}>
        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex min-w-0 items-center gap-2">
            {icon}
            <input
              autoFocus
              className="min-w-0 flex-1 rounded bg-transparent px-0.5 text-sm font-medium leading-5 outline-none ring-1 ring-inset ring-leaf-400"
              value={renameValue ?? ""}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => onRenameChange?.(e.target.value)}
              onKeyDown={onRenameKeyDown}
              onBlur={onRenameBlur}
            />
          </div>
        </div>
        {actionsSlot}
      </div>
    );
  }

  return (
    <div className={rowClass}>
      <button
        className="min-w-0 flex-1 text-left"
        type="button"
        onClick={onClick}
        onDoubleClick={onDoubleClickTitle}
      >
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="min-w-0 break-words text-sm font-medium leading-5">{page.title || "Untitled"}</span>
        </div>
        {!compact ? (
          <div className="mt-1 truncate text-xs text-slate-400">Updated {formatDate(page.updatedAt)}</div>
        ) : null}
      </button>
      {actionsSlot}
    </div>
  );
}
