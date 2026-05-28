"use client";

import { AlertCircle, CheckCircle2, CloudOff, Loader2 } from "lucide-react";
import type { SyncStatus } from "@/hooks/useSyncEngine";

type Props = {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastError?: string | null;
  onSyncNow?: () => void;
};

export function SyncStatusBadge({ status, lastSyncedAt, lastError = null, onSyncNow }: Props) {
  const lastSyncedLabel = lastSyncedAt
    ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
    : null;
  const title = [
    "Sync to cloud",
    lastSyncedLabel,
    status === "offline" ? "Offline" : null,
    status === "error" ? (lastError ?? "Sync error") : null,
  ].filter(Boolean).join(" - ");
  const isDisabled = status === "offline" || status === "syncing" || !onSyncNow;
  const buttonClass = [
    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition",
    "hover:bg-slate-100 hover:text-slate-600",
    "disabled:cursor-not-allowed disabled:hover:bg-transparent",
    "dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300",
    status === "synced" || (status === "idle" && lastSyncedAt) ? "text-green-500 dark:text-green-400" : "",
    status === "error" ? "text-amber-500 dark:text-amber-400" : "",
  ].filter(Boolean).join(" ");

  if (status === "syncing") {
    return (
      <button
        aria-label="Syncing to cloud"
        className={buttonClass}
        disabled
        title={title}
        type="button"
      >
        <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        <span className="sr-only">Syncing</span>
      </button>
    );
  }

  if (status === "synced" || (status === "idle" && lastSyncedAt)) {
    return (
      <button
        aria-label={title}
        className={buttonClass}
        title={title}
        type="button"
        onClick={onSyncNow}
      >
        <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="sr-only">{title}</span>
      </button>
    );
  }

  if (status === "offline") {
    return (
      <button
        aria-label="Sync to cloud unavailable offline"
        className={buttonClass}
        disabled
        title={title}
        type="button"
      >
        <CloudOff aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="sr-only">Offline</span>
      </button>
    );
  }

  if (status === "error") {
    return (
      <button
        aria-label={title}
        className={buttonClass}
        title={title}
        type="button"
        onClick={onSyncNow}
      >
        <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="sr-only">Sync error</span>
      </button>
    );
  }

  return (
    <button
      aria-label={title}
      className={buttonClass}
      title={title}
      type="button"
      onClick={onSyncNow}
    >
      <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
      <span className="sr-only">{title}</span>
    </button>
  );
}
