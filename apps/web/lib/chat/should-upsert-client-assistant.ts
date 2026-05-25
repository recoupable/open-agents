import type { WebAgentUIMessage } from "@/app/types";
import { messageRichnessScore } from "@/lib/chat/message-richness-score";

/** True when the client assistant row should replace or insert into the database. */
export function shouldUpsertClientAssistant(
  client: WebAgentUIMessage,
  stored: WebAgentUIMessage | null,
): boolean {
  if (!stored) {
    return true;
  }

  return messageRichnessScore(client) > messageRichnessScore(stored);
}
