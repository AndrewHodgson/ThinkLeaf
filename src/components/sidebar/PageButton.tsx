import { formatDate } from "@/lib/workspaceUtils";
import type { Page } from "@/types/workspace";
import type { ReactNode } from "react";
import { FileText, Star } from "lucide-react";

type PageButtonProps = {
  compact?: boolean;
  isActive: boolean;
  page: Page;
  actions?: ReactNode;
  onClick: () => void;
};

export function PageButton({ compact = false, isActive, page, actions, onClick }: PageButtonProps) {
  return (
    <div
      className={[
        "group flex items-start gap-2 rounded-md border px-2 py-2 transition",
        isActive
          ? "border-leaf-200 bg-leaf-50 text-leaf-700"
          : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      <button className="min-w-0 flex-1 text-left" type="button" onClick={onClick}>
        <div className="flex min-w-0 items-start gap-2">
          {page.isFavorite ? (
            <Star aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-leaf-500 text-leaf-600" />
          ) : (
            <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          )}
          <span className="min-w-0 break-words text-sm font-medium leading-5">{page.title || "Untitled"}</span>
        </div>
        {!compact ? (
          <div className="mt-1 truncate text-xs text-slate-400">Updated {formatDate(page.updatedAt)}</div>
        ) : null}
      </button>

      {actions ? (
        <div
          className="flex shrink-0 items-center gap-1"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
