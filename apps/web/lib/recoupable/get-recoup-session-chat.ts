import type { WebAgentUIMessage } from "@/app/types";
import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

/**
 * Full chat row in the recoupable API wire shape (matches api's
 * `toChatResponse`: camelCase keys, ISO-string timestamps).
 */
export type RecoupSessionChat = {
  id: string;
  sessionId: string;
  title: string;
  modelId: string | null;
  activeStreamId: string | null;
  lastAssistantMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GetRecoupSessionChatResponse = {
  chat: RecoupSessionChat;
  isStreaming: boolean;
  messages: WebAgentUIMessage[];
};

/**
 * GET `recoup-api/api/sessions/{sessionId}/chats/{chatId}` with Privy
 * Bearer auth. Throws on transport failure or non-2xx. Wraps an
 * explicit `cache: "no-store"` to keep the no-store refresh semantics
 * that the chat snapshot caller relies on.
 */
export async function getRecoupSessionChat(
  sessionId: string,
  chatId: string,
  accessToken: string,
): Promise<GetRecoupSessionChatResponse> {
  const res = await fetch(
    `${RECOUPABLE_API_BASE_URL}/api/sessions/${encodeURIComponent(
      sessionId,
    )}/chats/${encodeURIComponent(chatId)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    throw new Error(`getRecoupSessionChat: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<GetRecoupSessionChatResponse>;
}
