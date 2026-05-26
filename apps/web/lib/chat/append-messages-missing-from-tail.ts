import type { WebAgentUIMessage } from "@/app/types";

/**
 * Re-appends rows that the AI SDK drops when replaying a queued turn
 * (`sendMessage` with `messageId` slices the history after that user message).
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
