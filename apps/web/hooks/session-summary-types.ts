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
