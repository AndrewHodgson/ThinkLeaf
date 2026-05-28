"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";

type AuthMode = "signIn" | "signUp";

type Props = {
  initialMode?: AuthMode;
  onClose: () => void;
  onSignIn?: (email: string, password: string) => Promise<{ error: string | null }>;
  onSignUp?: (email: string, password: string) => Promise<{ error: string | null }>;
};

export function AuthModal({ initialMode = "signIn", onClose, onSignIn, onSignUp }: Props) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    if (!onSignIn || !onSignUp) return;
    setAuthSubmitting(true);
    setAuthError(null);
    const result = authMode === "signIn"
      ? await onSignIn(authEmail, authPassword)
      : await onSignUp(authEmail, authPassword);
    setAuthSubmitting(false);
    if (result.error) {
      setAuthError(result.error);
    } else {
      onClose();
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {authMode === "signIn" ? "Sign in" : "Create account"}
          </h2>
          <button
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleAuthSubmit}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="auth-email">
                Email
              </label>
              <input
                autoComplete="email"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-leaf-900"
                id="auth-email"
                required
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="auth-password">
                Password
              </label>
              <input
                autoComplete={authMode === "signIn" ? "current-password" : "new-password"}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-leaf-900"
                id="auth-password"
                minLength={6}
                required
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
            </div>
            {authError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{authError}</p>
            ) : null}
            <button
              className="w-full rounded-md bg-leaf-600 px-4 py-2 text-sm font-medium text-white hover:bg-leaf-700 disabled:opacity-60"
              disabled={authSubmitting}
              type="submit"
            >
              {authSubmitting ? "..." : authMode === "signIn" ? "Sign in" : "Create account"}
            </button>
          </div>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          {authMode === "signIn" ? (
            <>
              No account?{" "}
              <button
                className="text-leaf-600 hover:underline dark:text-leaf-400"
                type="button"
                onClick={() => { setAuthMode("signUp"); setAuthError(null); }}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Have an account?{" "}
              <button
                className="text-leaf-600 hover:underline dark:text-leaf-400"
                type="button"
                onClick={() => { setAuthMode("signIn"); setAuthError(null); }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
