import type {
  SessionChatListItem,
  SessionSummary,
} from "./session-summary-types";

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
