"use client";

import { AlertCircle, CheckCircle, CloudDownload, CloudUpload, Loader2 } from "lucide-react";
import type { MigrationStage } from "@/hooks/useFirstSignIn";

type Props = {
  status: MigrationStage;
  onUpload: () => Promise<void>;
  onUseCloud: () => Promise<void>;
  onSkip: () => void;
  onDismiss: () => void;
};

export function MigrationPrompt({ status, onUpload, onUseCloud, onSkip, onDismiss }: Props) {
  if (
    status.stage === "idle" ||
    status.stage === "checking" ||
    status.stage === "hydrated" ||
    status.stage === "skipped"
  ) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
    >
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">

        {status.stage === "hydrating" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-leaf-600" />
            <p className="text-sm font-medium text-slate-700">Downloading your workspace…</p>
            <p className="text-xs text-slate-400">Fetching your notes and assets from the cloud.</p>
          </div>
        )}

        {status.stage === "prompt" && (
          <>
            <div className="mb-5 flex items-start gap-3">
              <CloudUpload aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-leaf-600" />
              <div>
                <h2 className="text-base font-semibold text-slate-800">Upload local workspace?</h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  You have{" "}
                  <strong>{status.summary.pages === 1 ? "1 page" : `${status.summary.pages} pages`}</strong>
                  {status.summary.projects > 0 && (
                    <>
                      {" "}across{" "}
                      <strong>
                        {status.summary.projects === 1 ? "1 project" : `${status.summary.projects} projects`}
                      </strong>
                    </>
                  )}{" "}
                  saved locally. Upload to your account to keep it safe and sync across devices.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Your local data will not be changed or deleted regardless of your choice.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="w-full rounded-md bg-leaf-600 px-4 py-2 text-sm font-medium text-white hover:bg-leaf-700"
                type="button"
                onClick={onUpload}
              >
                Upload to my account
              </button>
              <button
                className="w-full rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                type="button"
                onClick={onSkip}
              >
                Keep local only for now
              </button>
            </div>
          </>
        )}

        {status.stage === "reconcile" && (
          <>
            <div className="mb-5 flex items-start gap-3">
              <CloudDownload aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <h2 className="text-base font-semibold text-slate-800">Workspace conflict detected</h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  This device has{" "}
                  <strong>{status.localSummary.pages === 1 ? "1 local page" : `${status.localSummary.pages} local pages`}</strong>
                  {status.localSummary.projects > 0 && (
                    <>
                      {" "}across{" "}
                      <strong>
                        {status.localSummary.projects === 1 ? "1 project" : `${status.localSummary.projects} projects`}
                      </strong>
                    </>
                  )}
                  , and your account already has notes from another device.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  "Use cloud workspace" replaces this device's local workspace with the cloud copy.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="w-full rounded-md bg-leaf-600 px-4 py-2 text-sm font-medium text-white hover:bg-leaf-700"
                type="button"
                onClick={onUseCloud}
              >
                Use cloud workspace
              </button>
              <button
                className="w-full rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                type="button"
                onClick={onUpload}
              >
                Keep local workspace
              </button>
              <button
                className="w-full rounded-md px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-600"
                type="button"
                onClick={onSkip}
              >
                Decide later
              </button>
            </div>
          </>
        )}

        {status.stage === "uploading" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-leaf-600" />
            <p className="text-sm font-medium text-slate-700">Uploading workspace…</p>
            <p className="text-xs text-slate-400">This may take a moment for large workspaces.</p>
          </div>
        )}

        {status.stage === "done" && (
          <>
            <div className="mb-5 flex items-start gap-3">
              <CheckCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div>
                <h2 className="text-base font-semibold text-slate-800">Upload complete</h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  {status.uploaded} record{status.uploaded !== 1 ? "s" : ""} uploaded to your account
                  {status.assetsUploaded > 0
                    ? `, including ${status.assetsUploaded} image${status.assetsUploaded !== 1 ? "s" : ""}`
                    : ""}
                  .
                </p>
              </div>
            </div>
            <button
              className="w-full rounded-md bg-leaf-600 px-4 py-2 text-sm font-medium text-white hover:bg-leaf-700"
              type="button"
              onClick={onDismiss}
            >
              Continue
            </button>
          </>
        )}

        {status.stage === "error" && (
          <>
            <div className="mb-5 flex items-start gap-3">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div>
                <h2 className="text-base font-semibold text-slate-800">Something went wrong</h2>
                <p className="mt-1.5 text-sm text-slate-600">{status.message}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Your local data is safe. You can retry or skip for now.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="w-full rounded-md bg-leaf-600 px-4 py-2 text-sm font-medium text-white hover:bg-leaf-700"
                type="button"
                onClick={onUpload}
              >
                Try again
              </button>
              <button
                className="w-full rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                type="button"
                onClick={onSkip}
              >
                Skip for now
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
