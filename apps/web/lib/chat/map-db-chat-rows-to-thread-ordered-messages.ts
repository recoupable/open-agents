import type { WebAgentUIMessage } from "@/app/types";
import { reorderChatMessagesForThreadDisplay } from "@/lib/chat/reorder-chat-messages-for-thread-display";

type ChatMessageRow = {
  id: string;
  parts: unknown;
  createdAt: Date;
};

export function mapDbChatRowsToThreadOrderedMessages(
  rows: ChatMessageRow[],
): WebAgentUIMessage[] {
  const messages: WebAgentUIMessage[] = [];
  const createdAtById = new Map<string, Date>();
  for (const row of rows) {
    messages.push(row.parts as WebAgentUIMessage);
    createdAtById.set(row.id, row.createdAt);
  }
  return reorderChatMessagesForThreadDisplay(messages, createdAtById);
}
