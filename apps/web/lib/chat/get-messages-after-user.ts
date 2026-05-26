import type { WebAgentUIMessage } from "@/app/types";

/** Returns every message that follows the given user row in the thread. */
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
