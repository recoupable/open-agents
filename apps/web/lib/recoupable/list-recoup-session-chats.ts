import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

/**
 * Wire-format `chats` row as returned by the recoupable API
 * (`toChatResponse` shape: camelCase keys, ISO strings for
 * timestamps). Defined inline so this helper does not depend on the
 * local Drizzle schema declaration.
 */
export type RecoupChat = {
  id: string;
  sessionId: string;
  title: string;
  modelId: string | null;
  activeStreamId: string | null;
  lastAssistantMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecoupSessionChatSummary = RecoupChat & {
  hasUnread: boolean;
  isStreaming: boolean;
};

export type ListRecoupSessionChatsResponse = {
  chats: RecoupSessionChatSummary[];
  defaultModelId: string | null;
};

/**
 * GET `recoup-api/api/sessions/{sessionId}/chats` with Privy Bearer auth.
 * Throws on transport failure or non-2xx. Wraps an explicit
 * `cache: "no-store"` to keep the SWR no-store semantics callers rely on.
 */
export async function listRecoupSessionChats(
  sessionId: string,
  accessToken: string,
): Promise<ListRecoupSessionChatsResponse> {
  const res = await fetch(
    `${RECOUPABLE_API_BASE_URL}/api/sessions/${encodeURIComponent(sessionId)}/chats`,
    {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    throw new Error(`listRecoupSessionChats: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<ListRecoupSessionChatsResponse>;
}
