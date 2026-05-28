"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase";
import { pullRemoteChanges, pushDirtyRecords } from "@/lib/syncEngine";
import type { Folder, Page, Profile, Project } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

export type SyncEngineState = {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  syncNow: () => void;
};

type SyncEngineCallbacks = {
  /** Called after a successful push so React state syncedAt stays correct. */
  onRecordsSynced: (
    table: "profiles" | "projects" | "folders" | "pages",
    records: Array<{ id: string; updatedAt: string }>,
    syncedAt: string,
  ) => void;
  /** Called with pulled records; caller merges them via last-write-wins. */
  onRemoteRecords: (records: {
    profiles: Profile[];
    projects: Project[];
    folders: Folder[];
    pages: Page[];
  }) => void;
  /** Called with newly downloaded asset blobs for injection into canvas state. */
  onRemoteAssets: (assets: Array<{ id: string; data: string }>) => void;
};

const SYNC_INTERVAL_MS = 60_000;
const MIN_SYNC_INTERVAL_MS = 10_000;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSyncEngine(user: User | null, callbacks: SyncEngineCallbacks): SyncEngineState {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);
  // Always call the latest callbacks without re-creating runSync.
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const runSync = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    if (isSyncingRef.current) return;

    const now = Date.now();
    if (now - lastSyncTimeRef.current < MIN_SYNC_INTERVAL_MS) return;

    isSyncingRef.current = true;
    lastSyncTimeRef.current = now;
    setStatus("syncing");
    setLastError(null);

    try {
      // ── Push ──────────────────────────────────────────────────────────────
      const push = await pushDirtyRecords(user.id);
      if (push.error) {
        setStatus("error");
        setLastError(push.error);
        return;
      }

      const { syncedRecords, syncedAt } = push;
      const cb = callbacksRef.current;
      if (syncedRecords.profiles.length) cb.onRecordsSynced("profiles", syncedRecords.profiles, syncedAt);
      if (syncedRecords.projects.length) cb.onRecordsSynced("projects", syncedRecords.projects, syncedAt);
      if (syncedRecords.folders.length) cb.onRecordsSynced("folders", syncedRecords.folders, syncedAt);
      if (syncedRecords.pages.length) cb.onRecordsSynced("pages", syncedRecords.pages, syncedAt);

      // ── Pull ──────────────────────────────────────────────────────────────
      const pull = await pullRemoteChanges(user.id);
      if (pull.error) {
        setStatus("error");
        setLastError(pull.error);
        return;
      }

      const { profiles, projects, folders, pages } = pull.records;
      if (profiles.length || projects.length || folders.length || pages.length) {
        callbacksRef.current.onRemoteRecords(pull.records);
      }
      if (pull.assets.length) {
        callbacksRef.current.onRemoteAssets(pull.assets);
      }

      setStatus("synced");
      setLastSyncedAt(new Date().toISOString());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      console.warn("[ThinkLeaf] Sync error:", message);
      setStatus("error");
      setLastError(message);
    } finally {
      isSyncingRef.current = false;
    }
  }, [user]);

  // Reset status on sign-out.
  useEffect(() => {
    if (user === null) {
      setStatus("idle");
      setLastSyncedAt(null);
      setLastError(null);
    }
  }, [user]);

  // Sync shortly after sign-in (after useFirstSignIn has had time to run).
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prevId = prevUserIdRef.current;
    const currId = user?.id ?? null;
    prevUserIdRef.current = currId;

    if (prevId !== null || currId === null) return;

    const t = setTimeout(() => { void runSync(); }, 2000);
    return () => clearTimeout(t);
  }, [user, runSync]);

  // Periodic sync.
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;
    const id = setInterval(() => { void runSync(); }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user, runSync]);

  // Sync on window focus.
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;
    const handle = () => { void runSync(); };
    window.addEventListener("focus", handle);
    return () => window.removeEventListener("focus", handle);
  }, [user, runSync]);

  // Sync on reconnect; mark offline when network drops.
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;

    const handleOnline = () => {
      if (status === "offline" || status === "error") setStatus("idle");
      void runSync();
    };
    const handleOffline = () => setStatus("offline");

    if (!navigator.onLine) setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user, runSync, status]);

  const syncNow = useCallback(() => { void runSync(); }, [runSync]);

  return { status, lastSyncedAt, lastError, syncNow };
}
