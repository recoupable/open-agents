"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

type SessionsShellContextValue = {
  createBlankSession: (cloneUrl: string) => Promise<void>;
  isCreatingBlank: boolean;
  /**
   * Onboarding fallback for users with zero orgs. Calls
   * `POST /api/sessions/personal`, which provisions a personal repo + session
   * and routes the user into it. Safe to call repeatedly; the underlying
   * endpoint is idempotent on email + repo creation.
   */
  createPersonalSession: () => Promise<void>;
  isCreatingPersonal: boolean;
};

const SessionsShellContext = createContext<
  SessionsShellContextValue | undefined
>(undefined);

export function SessionsShellProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: SessionsShellContextValue;
}) {
  return (
    <SessionsShellContext.Provider value={value}>
      {children}
    </SessionsShellContext.Provider>
  );
}

export function useSessionsShell() {
  const context = useContext(SessionsShellContext);

  if (!context) {
    throw new Error(
      "useSessionsShell must be used within SessionsShellProvider",
    );
  }

  return context;
}
