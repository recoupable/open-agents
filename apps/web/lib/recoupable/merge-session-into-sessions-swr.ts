import type { Session } from "@/lib/db/schema";

/** `/api/sessions` SWR cache shape used by session chat (list rows may carry UI flags). */
export type SessionsSwrSnapshot = {
  sessions: (Session & { hasUnread?: boolean })[];
};

export function mergeSessionIntoSessionsSwrSnapshot(
  current: SessionsSwrSnapshot | undefined,
  sessionId: string,
  session: Session,
): SessionsSwrSnapshot | undefined {
  if (!current) {
    return current;
  }

  return {
    ...current,
    sessions: current.sessions.map((row) =>
      row.id === sessionId ? { ...row, ...session } : row,
    ),
  };
}
