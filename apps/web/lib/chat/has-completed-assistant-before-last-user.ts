import type { WebAgentUIMessage } from "@/app/types";
import { hasRenderableAssistantMessage } from "@/lib/chat-streaming-state";

/**
 * True when the payload ends with a new user turn after at least one completed
 * assistant reply earlier in the thread (queued prompt while a stream may still
 * be active on a prior turn).
 */
export function hasCompletedAssistantBeforeLastUser(
  messages: WebAgentUIMessage[],
): boolean {
  const lastIndex = messages.length - 1;
  const lastMessage = messages[lastIndex];
  if (!lastMessage || lastMessage.role !== "user") {
    return false;
  }

  for (let index = lastIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) {
      continue;
    }
    if (
      message.role === "assistant" &&
      hasRenderableAssistantMessage(message)
    ) {
      return true;
    }
  }

  return false;
}
