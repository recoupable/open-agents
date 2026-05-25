import type { WebAgentUIMessage } from "@/app/types";
import { dedupeMessageReasoning } from "@/lib/chat/dedupe-message-reasoning";
import { hasRenderableAssistantMessage } from "@/lib/chat-streaming-state";
import {
  createChatMessageIfNotExists,
  touchChat,
  upsertChatMessageScoped,
} from "@/lib/db/sessions";

/**
 * Persist all renderable assistant messages from the client payload.
 * Backfills the DB when the UI already has replies that never made it to
 * `chat_messages` (e.g. interrupted workflow, ID conflict, or race).
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
