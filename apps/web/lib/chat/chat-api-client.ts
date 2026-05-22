import { RECOUPABLE_API_BASE_URL } from "@/lib/recoupable/api-base-url";

/**
 * POST endpoint used by `AbortableChatTransport` and imperative
 * callers.
 *
 * Cut over (recoupable/api#601) from open-agents' own
 * `/api/chat` route to recoup-api's `/api/chat/workflow` — the
 * backend port that runs the agent loop as a durable Vercel
 * Workflow against the session's sandbox. Same wire format
 * (`message-metadata`, task-tool async-generator yields,
 * `RECOUP_ACCESS_TOKEN` sandbox env, prompt caching) — only the
 * URL changed.
 *
 * The stop (`/api/chat/{chatId}/stop`) and resume-stream
 * (`/api/chat/{chatId}/stream`) sub-routes are still served by
 * open-agents itself — those endpoints haven't been ported to
 * recoup-api yet. Cancel-from-UI and refresh-mid-stream are
 * known partial-degradation paths until those land.
 */
export const CHAT_API_POST_PATH = `${RECOUPABLE_API_BASE_URL}/api/chat/workflow`;

export type ChatApiCommonBodyFields = {
  sessionId: string;
  chatId: string;
  recoupAccessToken?: string;
  context?: { contextLimit: number };
};

export function buildChatApiCommonBody(params: {
  sessionId: string;
  chatId: string;
  recoupAccessToken?: string | null;
  contextLimit?: number | null;
}): ChatApiCommonBodyFields {
  const body: ChatApiCommonBodyFields = {
    sessionId: params.sessionId,
    chatId: params.chatId,
  };

  if (params.recoupAccessToken) {
    body.recoupAccessToken = params.recoupAccessToken;
  }

  if (params.contextLimit != null) {
    body.context = { contextLimit: params.contextLimit };
  }

  return body;
}

export async function postChatApi(body: unknown): Promise<Response> {
  return fetch(CHAT_API_POST_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
