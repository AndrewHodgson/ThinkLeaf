"use client";

import { LogIn, MonitorDown } from "lucide-react";

type Props = {
  authLoading: boolean;
  canAuthenticate: boolean;
  isStartingOffline: boolean;
  isDarkMode: boolean;
  onLogIn: () => void;
  onToggleDarkMode: () => void;
  onUseOffline: () => void;
};

export function FirstRunWelcome({
  authLoading,
  canAuthenticate,
  isStartingOffline,
  isDarkMode,
  onLogIn,
  onToggleDarkMode,
  onUseOffline,
}: Props) {
  return (
    <main className="flex min-h-screen bg-slate-50 px-5 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-leaf-700 dark:text-leaf-400">ThinkLeaf</div>
          <button
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            type="button"
            onClick={onToggleDarkMode}
          >
            {isDarkMode ? "Light" : "Dark"}
          </button>
        </div>

        <section className="flex flex-1 flex-col justify-center py-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h1 className="text-xl font-semibold tracking-normal text-slate-900 dark:text-slate-50">
              Welcome to ThinkLeaf
            </h1>
            <div className="mt-6 grid gap-2">
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-leaf-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-leaf-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canAuthenticate || authLoading}
                title={canAuthenticate ? "Log in or sign up" : "Sign-in is not configured"}
                type="button"
                onClick={onLogIn}
              >
                <LogIn aria-hidden="true" className="h-4 w-4" />
                Log in / Sign up
              </button>
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                disabled={isStartingOffline}
                type="button"
                onClick={onUseOffline}
              >
                <MonitorDown aria-hidden="true" className="h-4 w-4" />
                {isStartingOffline ? "Starting..." : "Use offline"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
