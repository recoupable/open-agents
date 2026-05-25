import type { WebAgentUIMessage } from "@/app/types";
import { messageRichnessScore } from "@/lib/chat/message-richness-score";

function pickPreferredMessage(
  serverMessage: WebAgentUIMessage,
  localMessage: WebAgentUIMessage,
): WebAgentUIMessage {
  if (serverMessage.role !== "assistant" || localMessage.role !== "assistant") {
    return serverMessage;
  }

  return messageRichnessScore(localMessage) > messageRichnessScore(serverMessage)
    ? localMessage
    : serverMessage;
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

/** True when merged messages differ from the local snapshot in ids or content. */
export function chatMessagesSnapshotChanged(
  before: WebAgentUIMessage[],
  after: WebAgentUIMessage[],
): boolean {
  if (before.length !== after.length) {
    return true;
  }

  for (let index = 0; index < before.length; index += 1) {
    const previous = before[index];
    const next = after[index];
    if (!previous || !next || previous.id !== next.id) {
      return true;
    }
    if (messageRichnessScore(previous) !== messageRichnessScore(next)) {
      return true;
    }
  }

  return false;
}
