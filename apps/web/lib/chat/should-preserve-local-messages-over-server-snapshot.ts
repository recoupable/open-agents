import type { WebAgentUIMessage } from "@/app/types";

function countByRole(
  messages: WebAgentUIMessage[],
  role: WebAgentUIMessage["role"],
): number {
  return messages.filter((message) => message.role === role).length;
}

/**
 * Returns true when the in-memory chat history is ahead of the server snapshot
 * and replacing would drop assistant replies the user still sees locally.
 */
export function shouldPreserveLocalMessagesOverServerSnapshot(
  localMessages: WebAgentUIMessage[],
  serverMessages: WebAgentUIMessage[],
): boolean {
  if (serverMessages.length === 0) {
    return false;
  }

  if (localMessages.length > serverMessages.length) {
    return true;
  }

  const localAssistantCount = countByRole(localMessages, "assistant");
  const serverAssistantCount = countByRole(serverMessages, "assistant");
  if (localAssistantCount > serverAssistantCount) {
    return true;
  }

  const lastLocal = localMessages[localMessages.length - 1];
  const lastServer = serverMessages[serverMessages.length - 1];
  if (
    lastLocal?.role === "user" &&
    lastServer?.role === "user" &&
    localMessages.length >= serverMessages.length
  ) {
    return true;
  }

  return false;
}
