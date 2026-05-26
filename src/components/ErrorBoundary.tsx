"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Thinkleaf] Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}

function downloadBackupFromStorage() {
  try {
    const raw = window.localStorage.getItem("thinkleaf.workspace.v1");
    if (!raw) {
      window.alert("No saved workspace found in browser storage.");
      return;
    }

    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thinkleaf-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    window.alert("Could not read backup from browser storage.");
  }
}

function ErrorFallback() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-6 text-center text-slate-900">
      <div className="max-w-md">
        <h1 className="text-xl font-semibold text-slate-800">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">
          Thinkleaf ran into an unexpected error. Your saved data is still in your browser&apos;s
          storage.
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Download a backup before reloading so you don&apos;t lose any work.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="rounded bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700"
          type="button"
          onClick={downloadBackupFromStorage}
        >
          Download backup
        </button>
        <button
          className="rounded border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          type="button"
          onClick={() => window.location.reload()}
        >
          Reload app
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Error details have been logged to the browser console (F12 → Console).
      </p>
    </div>
  );
}
