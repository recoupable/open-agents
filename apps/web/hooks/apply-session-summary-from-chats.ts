import { applySessionSummary } from "./apply-session-summary";
import { deriveSessionSummaryFromChats } from "./derive-session-summary-from-chats";
import type {
  SessionChatListItem,
  SessionsResponse,
} from "./session-summary-types";

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
