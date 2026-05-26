import type { WebAgentUIMessage } from "@/app/types";

/** Messages that follow a specific user row in the thread (e.g. later queued prompts). */
export function getMessagesAfterUser(
  messages: WebAgentUIMessage[],
  userMessageId: string,
): WebAgentUIMessage[] {
  const userIndex = messages.findIndex((message) => message.id === userMessageId);
  if (userIndex < 0) {
    return [];
  }

  return messages.slice(userIndex + 1);
}

/**
 * Re-append rows removed when the AI SDK truncates history for a queued turn
 * (`sendMessage` with `messageId` slices after that user).
 */
export function appendMessagesMissingFromTail(
  current: WebAgentUIMessage[],
  tail: WebAgentUIMessage[],
): WebAgentUIMessage[] {
  if (tail.length === 0) {
    return current;
  }

  const knownIds = new Set(current.map((message) => message.id));
  const restored = [...current];

  for (const message of tail) {
    if (!knownIds.has(message.id)) {
      restored.push(message);
      knownIds.add(message.id);
    }
  }

  return restored;
}
