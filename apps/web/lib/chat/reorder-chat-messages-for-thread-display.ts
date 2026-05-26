import type { WebAgentUIMessage } from "@/app/types";

/**
 * Rebuilds chat order for display when rows were persisted by created_at
 * (e.g. queued users saved before the prior assistant finished).
 *
 * Walks messages in created_at order and pairs each assistant with the
 * earliest still-unpaired user, then appends any remaining users.
 */
export function reorderChatMessagesForThreadDisplay(
  messages: WebAgentUIMessage[],
  createdAtById: ReadonlyMap<string, Date>,
): WebAgentUIMessage[] {
  const sorted = [...messages].sort((left, right) => {
    const leftAt = createdAtById.get(left.id)?.getTime() ?? 0;
    const rightAt = createdAtById.get(right.id)?.getTime() ?? 0;
    if (leftAt !== rightAt) {
      return leftAt - rightAt;
    }
    return left.id.localeCompare(right.id);
  });

  const pendingUsers: WebAgentUIMessage[] = [];
  const ordered: WebAgentUIMessage[] = [];

  for (const message of sorted) {
    if (message.role === "user") {
      pendingUsers.push(message);
      continue;
    }

    if (message.role === "assistant") {
      const pairedUser = pendingUsers.shift();
      if (pairedUser) {
        ordered.push(pairedUser, message);
      } else {
        ordered.push(message);
      }
    }
  }

  ordered.push(...pendingUsers);
  return ordered;
}
