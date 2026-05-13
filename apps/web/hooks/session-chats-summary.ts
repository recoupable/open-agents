import type { Chat } from "@/lib/db/schema";

export type SessionChatListItem = Chat & {
  hasUnread: boolean;
  isStreaming: boolean;
};

export type SessionsResponse = {
  sessions: Array<{
    id: string;
    hasUnread: boolean;
    hasStreaming: boolean;
    latestChatId: string | null;
  }>;
};

export type SessionSummary = {
  hasUnread: boolean;
  hasStreaming: boolean;
  latestChatId: string | null;
};

function areSessionSummariesEqual(
  left: SessionSummary,
  right: SessionSummary,
): boolean {
  return (
    left.hasUnread === right.hasUnread &&
    left.hasStreaming === right.hasStreaming &&
    left.latestChatId === right.latestChatId
  );
}

export function didSessionSummaryChange(
  previous: SessionSummary | null,
  next: SessionSummary,
): boolean {
  if (!previous) {
    return true;
  }

  return !areSessionSummariesEqual(previous, next);
}

export function deriveSessionSummaryFromChats(
  nextChats: SessionChatListItem[],
): SessionSummary {
  const latestChat = nextChats.length > 0 ? nextChats[0] : null;

  return {
    hasUnread: nextChats.some((chat) => chat.hasUnread),
    hasStreaming: nextChats.some((chat) => chat.isStreaming),
    latestChatId: latestChat ? latestChat.id : null,
  };
}

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

export function applySessionSummaryFromChats(
  current: SessionsResponse | undefined,
  sessionId: string,
  nextChats: SessionChatListItem[],
): SessionsResponse | undefined {
  return applySessionSummary(
    current,
    sessionId,
    deriveSessionSummaryFromChats(nextChats),
  );
}
