"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  checkCloudHasData,
  checkLocalHasData,
  downloadFullWorkspaceFromCloud,
  getLinkedUserId,
  setLinkedUserId,
  uploadWorkspaceToCloud,
  type LocalDataSummary,
} from "@/lib/cloudSync";
import type { Folder, Page, Profile, Project } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MigrationStage =
  | { stage: "idle" }
  | { stage: "checking" }
  /** Downloading all cloud records + assets into local IDB. */
  | { stage: "hydrating" }
  /** Download complete — caller should apply records to React state then dismiss. */
  | { stage: "hydrated"; records: { profiles: Profile[]; projects: Project[]; folders: Folder[]; pages: Page[] }; assets: Array<{ id: string; data: string }> }
  /** Local has data, cloud is empty — offer upload. */
  | { stage: "prompt"; summary: LocalDataSummary }
  | { stage: "uploading" }
  | { stage: "done"; uploaded: number; assetsUploaded: number }
  /** Both local and cloud have data — user must choose. */
  | { stage: "reconcile"; localSummary: LocalDataSummary }
  | { stage: "skipped" }
  | { stage: "error"; message: string };

export type FirstSignInState = {
  status: MigrationStage;
  /** Upload local workspace to cloud (used by "prompt" and "reconcile → keep local"). */
  upload: () => Promise<void>;
  /** Download full cloud workspace to local (used by "reconcile → use cloud"). */
  useCloud: () => Promise<void>;
  /** Dismiss the current prompt without taking action. */
  skip: () => void;
  /** Dismiss the success/error state. */
  dismiss: () => void;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Detects the null → non-null auth transition and drives one-time workspace
 * reconciliation between local IDB and cloud Supabase data.
 *
 * Four cases after sign-in (if workspace is not already linked to this account):
 *   local empty + cloud has data  → auto-hydrate (no prompt)
 *   local has data + cloud empty  → upload prompt
 *   both have data                → reconciliation prompt
 *   both empty                    → set linkedUserId, stay idle
 *
 * After any successful operation, writes userId to IDB settings ("sync.linkedUserId")
 * so subsequent sign-ins skip the reconciliation check entirely.
 */
export function useFirstSignIn(user: User | null): FirstSignInState {
  const [status, setStatus] = useState<MigrationStage>({ stage: "idle" });
  const prevUserIdRef = useRef<string | null>(null);

  const performHydration = useCallback(async (userId: string) => {
    setStatus({ stage: "hydrating" });
    try {
      const result = await downloadFullWorkspaceFromCloud(userId);
      if (result.error) {
        console.warn("[ThinkLeaf] Hydration failed:", result.error);
        setStatus({ stage: "error", message: result.error });
        return;
      }
      await setLinkedUserId(userId);
      console.log(
        "[ThinkLeaf] Hydration complete —",
        result.records.profiles.length, "profiles,",
        result.records.projects.length, "projects,",
        result.records.pages.length, "pages,",
        result.assets.length, "assets",
      );
      setStatus({ stage: "hydrated", records: result.records, assets: result.assets });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      console.warn("[ThinkLeaf] Hydration error:", message);
      setStatus({ stage: "error", message });
    }
  }, []);

  useEffect(() => {
    const prevId = prevUserIdRef.current;
    const currId = user?.id ?? null;
    prevUserIdRef.current = currId;

    // Only act on null → non-null (first sign-in, or auth resolving on page load).
    if (prevId !== null || currId === null) return;

    setStatus({ stage: "checking" });

    Promise.all([checkLocalHasData(), checkCloudHasData(currId), getLinkedUserId()])
      .then(([localSummary, cloudHasData, linkedUserId]) => {
        if (linkedUserId === currId) {
          // Workspace already belongs to this account — incremental sync handles everything.
          console.log("[ThinkLeaf] Reconciliation skipped: workspace already linked to this account");
          setStatus({ stage: "idle" });
          return;
        }

        const localHasData = localSummary.hasData;

        if (!localHasData && !cloudHasData) {
          // Both empty — link account so future sign-ins skip this check.
          console.log("[ThinkLeaf] Both local and cloud empty — linking account");
          void setLinkedUserId(currId);
          setStatus({ stage: "idle" });
        } else if (!localHasData && cloudHasData) {
          // Cloud has data, local is empty — pull silently, no prompt needed.
          console.log("[ThinkLeaf] Local empty, cloud has data — starting auto-hydration");
          void performHydration(currId);
        } else if (localHasData && !cloudHasData) {
          // Local has data, cloud empty — offer to upload.
          console.log("[ThinkLeaf] Local has data, cloud empty — showing upload prompt");
          setStatus({ stage: "prompt", summary: localSummary });
        } else {
          // Both have data — let the user decide.
          console.log("[ThinkLeaf] Both local and cloud have data — showing reconciliation prompt");
          setStatus({ stage: "reconcile", localSummary });
        }
      })
      .catch((err) => {
        console.warn("[ThinkLeaf] Reconciliation check failed:", err);
        setStatus({ stage: "idle" });
      });
  }, [user, performHydration]);

  const upload = useCallback(async () => {
    if (!user) return;
    setStatus({ stage: "uploading" });
    try {
      const result = await uploadWorkspaceToCloud(user.id);
      if (result.error) {
        setStatus({ stage: "error", message: result.error });
      } else {
        await setLinkedUserId(user.id);
        console.log("[ThinkLeaf] Upload complete —", result.uploaded, "records,", result.assetsUploaded, "assets");
        setStatus({ stage: "done", uploaded: result.uploaded, assetsUploaded: result.assetsUploaded });
      }
    } catch (err) {
      setStatus({
        stage: "error",
        message: err instanceof Error ? err.message : "Upload failed — please try again.",
      });
    }
  }, [user]);

  const useCloud = useCallback(async () => {
    if (!user) return;
    void performHydration(user.id);
  }, [user, performHydration]);

  const skip = useCallback(() => setStatus({ stage: "skipped" }), []);
  const dismiss = useCallback(() => setStatus({ stage: "idle" }), []);

  return { status, upload, useCloud, skip, dismiss };
}
