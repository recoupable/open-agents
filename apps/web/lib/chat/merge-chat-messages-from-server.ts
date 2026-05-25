import type { WebAgentUIMessage } from "@/app/types";
function messageRichnessScore(message: WebAgentUIMessage): number {
  if (message.role !== "assistant") {
    return message.parts.length;
  }

  let score = message.parts.length;
  for (const part of message.parts) {
    if (part.type === "text") {
      score += part.text.length;
    }
  }
  return score;
}

function pickPreferredMessage(
  serverMessage: WebAgentUIMessage,
  localMessage: WebAgentUIMessage,
): WebAgentUIMessage {
  if (serverMessage.role !== "assistant" || localMessage.role !== "assistant") {
    return serverMessage;
  }

  const serverScore = messageRichnessScore(serverMessage);
  const localScore = messageRichnessScore(localMessage);
  return localScore > serverScore ? localMessage : serverMessage;
}

/**
 * Merge server-fetched messages with in-memory chat state without dropping
 * local-only rows (optimistic users, in-flight assistants) or thinner DB rows.
 */
export function mergeChatMessagesFromServer(
  localMessages: WebAgentUIMessage[],
  serverMessages: WebAgentUIMessage[],
): WebAgentUIMessage[] {
  if (serverMessages.length === 0) {
    return localMessages;
  }

  const serverById = new Map(serverMessages.map((message) => [message.id, message]));
  const mergedIds = new Set<string>();
  const merged: WebAgentUIMessage[] = [];

  for (const localMessage of localMessages) {
    const serverMessage = serverById.get(localMessage.id);
    if (serverMessage) {
      merged.push(pickPreferredMessage(serverMessage, localMessage));
    } else {
      merged.push(localMessage);
    }
    mergedIds.add(localMessage.id);
  }

  for (const serverMessage of serverMessages) {
    if (!mergedIds.has(serverMessage.id)) {
      merged.push(serverMessage);
      mergedIds.add(serverMessage.id);
    }
  }

  return merged;
}

/** True when merge would change the message list (by id sequence or count). */
export function chatMessagesSnapshotChanged(
  before: WebAgentUIMessage[],
  after: WebAgentUIMessage[],
): boolean {
  if (before.length !== after.length) {
    return true;
  }

  for (let index = 0; index < before.length; index += 1) {
    if (before[index]?.id !== after[index]?.id) {
      return true;
    }
  }

  return false;
}
