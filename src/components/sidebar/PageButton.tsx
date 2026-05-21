import { formatDate } from "@/lib/workspaceUtils";
import type { Page } from "@/types/workspace";
import { FileText, Star } from "lucide-react";

type PageButtonProps = {
  compact?: boolean;
  isActive: boolean;
  page: Page;
  onClick: () => void;
};

export function PageButton({ compact = false, isActive, page, onClick }: PageButtonProps) {
  return (
    <button
      className={[
        "block w-full rounded-md border px-2 py-2 text-left transition",
        isActive
          ? "border-leaf-200 bg-leaf-50 text-leaf-700"
          : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50",
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      <div className="flex min-w-0 items-center gap-2">
        {page.isFavorite ? (
          <Star aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-leaf-500 text-leaf-600" />
        ) : (
          <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        )}
        <span className="min-w-0 truncate text-sm font-medium">{page.title || "Untitled"}</span>
      </div>
      {!compact ? (
        <div className="mt-1 truncate text-xs text-slate-400">Updated {formatDate(page.updatedAt)}</div>
      ) : null}
    </button>
  );
}
