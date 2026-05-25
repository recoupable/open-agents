import type { WebAgentUIMessage } from "@/app/types";
import { dedupeMessageReasoning } from "@/lib/chat/dedupe-message-reasoning";
import { shouldUpsertClientAssistant } from "@/lib/chat/should-upsert-client-assistant";
import { hasRenderableAssistantMessage } from "@/lib/chat-streaming-state";
import {
  createChatMessageIfNotExists,
  getChatMessageById,
  touchChat,
  upsertChatMessageScoped,
} from "@/lib/db/sessions";

function storedMessageFromParts(parts: unknown): WebAgentUIMessage | null {
  if (!parts || typeof parts !== "object") {
    return null;
  }

  const candidate = parts as WebAgentUIMessage;
  if (candidate.role !== "assistant" || !Array.isArray(candidate.parts)) {
    return null;
  }

  return candidate;
}

/**
 * Persist renderable assistant messages from the client only when missing
 * from the DB or the client snapshot is richer than the stored row.
 *
 * Must not be imported from workflow code (uses Node DB + chat-streaming-state).
 */
export async function persistClientAssistantMessages(
  chatId: string,
  messages: WebAgentUIMessage[],
): Promise<void> {
  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }
    if (!hasRenderableAssistantMessage(message)) {
      continue;
    }

    try {
      const dedupedMessage = dedupeMessageReasoning(message);
      const existingRow = await getChatMessageById(dedupedMessage.id);
      const existingMessage =
        existingRow?.chatId === chatId && existingRow.role === "assistant"
          ? storedMessageFromParts(existingRow.parts)
          : null;

      if (!shouldUpsertClientAssistant(dedupedMessage, existingMessage)) {
        continue;
      }

      const result = await upsertChatMessageScoped({
        id: dedupedMessage.id,
        chatId,
        role: "assistant",
        parts: dedupedMessage,
      });

      if (result.status === "conflict") {
        console.warn(
          `Skipped assistant upsert due to ID scope conflict: ${message.id}`,
        );
      }
    } catch (error) {
      console.error("Failed to persist client assistant message:", error);
    }
  }
}

/**
 * Persist user messages after the last assistant in the client array.
 * Used when a new prompt arrives during an active stream (409) so every
 * queued user turn is in the DB before the next workflow starts.
 */
export async function persistTrailingUserMessages(
  chatId: string,
  messages: WebAgentUIMessage[],
): Promise<void> {
  const trailingUsers: WebAgentUIMessage[] = [];

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) {
      continue;
    }
    if (message.role === "assistant") {
      break;
    }
    if (message.role === "user") {
      trailingUsers.unshift(message);
    }
  }

  if (trailingUsers.length === 0) {
    return;
  }

  let touched = false;

  for (const message of trailingUsers) {
    try {
      const created = await createChatMessageIfNotExists({
        id: message.id,
        chatId,
        role: "user",
        parts: message,
      });
      if (created) {
        touched = true;
      }
    } catch (error) {
      console.error("Failed to persist trailing user message:", error);
    }
  }

  if (touched) {
    await touchChat(chatId).catch(() => undefined);
  }
}
