"use client";

import { AlertCircle, CheckCircle2, Loader2, WifiOff } from "lucide-react";
import type { SyncStatus } from "@/hooks/useSyncEngine";

type Props = {
  status: SyncStatus;
  lastSyncedAt: string | null;
};

export function SyncStatusBadge({ status, lastSyncedAt }: Props) {
  if (status === "idle" && !lastSyncedAt) return null;

  if (status === "syncing") {
    return (
      <span className="inline-flex items-center text-slate-400" title="Syncing…">
        <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        <span className="sr-only">Syncing</span>
      </span>
    );
  }

  if (status === "synced" || (status === "idle" && lastSyncedAt)) {
    const label = lastSyncedAt
      ? `Synced at ${new Date(lastSyncedAt).toLocaleTimeString()}`
      : "Synced";
    return (
      <span className="inline-flex items-center text-green-500" title={label}>
        <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  if (status === "offline") {
    return (
      <span className="inline-flex items-center text-slate-400" title="Offline — changes saved locally">
        <WifiOff aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="sr-only">Offline</span>
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="inline-flex items-center text-amber-500" title="Sync error — will retry on reconnect">
        <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="sr-only">Sync error</span>
      </span>
    );
  }

  return null;
}
