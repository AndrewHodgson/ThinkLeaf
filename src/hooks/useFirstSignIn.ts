"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  checkCloudHasData,
  checkLocalHasData,
  uploadWorkspaceToCloud,
  type LocalDataSummary,
} from "@/lib/cloudSync";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MigrationStage =
  | { stage: "idle" }
  | { stage: "checking" }
  | { stage: "prompt"; summary: LocalDataSummary }
  | { stage: "uploading" }
  | { stage: "done"; uploaded: number; assetsUploaded: number }
  | { stage: "skipped" }
  | { stage: "error"; message: string };

export type FirstSignInState = {
  status: MigrationStage;
  upload: () => Promise<void>;
  skip: () => void;
  dismiss: () => void;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Detects the null → non-null auth transition (either first-ever sign-in or
 * page reload where the user is already signed in) and drives a one-time
 * prompt to upload local workspace data to the cloud.
 *
 * State machine:
 *   idle → checking → prompt → uploading → done
 *                           ↘ skipped
 *                  ↘ idle  (cloud already has data, or local is empty)
 *   uploading → error → uploading (retry)
 *                     ↘ skipped
 */
export function useFirstSignIn(user: User | null): FirstSignInState {
  const [status, setStatus] = useState<MigrationStage>({ stage: "idle" });
  // Tracks the user ID from the previous render so we can detect the transition.
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const prevId = prevUserIdRef.current;
    const currId = user?.id ?? null;
    prevUserIdRef.current = currId;

    // Only act on null → non-null (new sign-in, or auth resolving on page load).
    if (prevId !== null || currId === null) return;

    setStatus({ stage: "checking" });

    Promise.all([checkLocalHasData(), checkCloudHasData(currId)])
      .then(([localSummary, cloudHasData]) => {
        if (!localSummary.hasData || cloudHasData) {
          // Nothing to migrate: no pages locally, or cloud already populated.
          setStatus({ stage: "idle" });
          return;
        }
        setStatus({ stage: "prompt", summary: localSummary });
      })
      .catch((err) => {
        // Checking failed — silently stay idle rather than blocking the user.
        console.warn("[ThinkLeaf] Migration check failed:", err);
        setStatus({ stage: "idle" });
      });
  }, [user]);

  const upload = useCallback(async () => {
    if (!user) return;
    setStatus({ stage: "uploading" });
    try {
      const result = await uploadWorkspaceToCloud(user.id);
      if (result.error) {
        setStatus({ stage: "error", message: result.error });
      } else {
        setStatus({ stage: "done", uploaded: result.uploaded, assetsUploaded: result.assetsUploaded });
      }
    } catch (err) {
      setStatus({
        stage: "error",
        message: err instanceof Error ? err.message : "Upload failed — please try again.",
      });
    }
  }, [user]);

  const skip = useCallback(() => setStatus({ stage: "skipped" }), []);
  const dismiss = useCallback(() => setStatus({ stage: "idle" }), []);

  return { status, upload, skip, dismiss };
}
