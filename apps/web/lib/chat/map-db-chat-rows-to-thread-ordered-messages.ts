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
  const messages = rows.map((row) => row.parts as WebAgentUIMessage);
  const createdAtById = new Map(rows.map((row) => [row.id, row.createdAt]));
  return reorderChatMessagesForThreadDisplay(messages, createdAtById);
}
