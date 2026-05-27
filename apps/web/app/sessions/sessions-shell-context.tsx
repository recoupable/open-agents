"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

type SessionsShellContextValue = {
  /**
   * Unified personal + org session creator. Calls
   * `POST recoup-api/api/sessions` with either an empty body (personal,
   * recoup-api derives `recoupable/<accountId>`) or
   * `{ organizationId }` (org, recoup-api derives `recoupable/<orgId>`).
   * See `useCreateSession`.
   */
  createSession: (params?: { organizationId?: string }) => Promise<void>;
  isCreating: boolean;
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
