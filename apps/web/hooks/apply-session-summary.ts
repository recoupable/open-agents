import type { SessionsResponse, SessionSummary } from "./session-summary-types";

export function applySessionSummary(
  current: SessionsResponse | undefined,
  sessionId: string,
  summary: SessionSummary,
): SessionsResponse | undefined {
  if (!current) {
    return current;
  }

  let changed = false;
  const sessions = current.sessions.map((session) => {
    if (session.id !== sessionId) {
      return session;
    }

    if (
      session.hasUnread === summary.hasUnread &&
      session.hasStreaming === summary.hasStreaming &&
      session.latestChatId === summary.latestChatId
    ) {
      return session;
    }

    changed = true;
    return {
      ...session,
      ...summary,
    };
  });

  return changed ? { ...current, sessions } : current;
}
