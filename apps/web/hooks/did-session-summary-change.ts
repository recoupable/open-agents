import type { SessionSummary } from "./session-summary-types";

export function didSessionSummaryChange(
  previous: SessionSummary | null,
  next: SessionSummary,
): boolean {
  if (!previous) {
    return true;
  }

  return (
    previous.hasUnread !== next.hasUnread ||
    previous.hasStreaming !== next.hasStreaming ||
    previous.latestChatId !== next.latestChatId
  );
}
