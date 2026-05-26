import { persistClientAssistantMessages } from "@/app/api/chat/_lib/persist-client-messages";
import {
  requireAuthenticatedUser,
  requireOwnedSessionChat,
} from "@/app/api/sessions/_lib/session-context";
import type { WebAgentUIMessage } from "@/app/types";

type RouteContext = {
  params: Promise<{ sessionId: string; chatId: string }>;
};

function isWebAgentMessage(value: unknown): value is WebAgentUIMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as WebAgentUIMessage).id === "string" &&
    ((value as WebAgentUIMessage).role === "user" ||
      (value as WebAgentUIMessage).role === "assistant") &&
    Array.isArray((value as WebAgentUIMessage).parts)
  );
}

/** Backfill assistant rows from in-memory chat state (richness-safe upsert). */
export async function POST(req: Request, context: RouteContext) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { sessionId, chatId } = await context.params;

  const chatContext = await requireOwnedSessionChat({
    userId: authResult.userId,
    sessionId,
    chatId,
  });
  if (!chatContext.ok) {
    return chatContext.response;
  }

  let body: { messages?: unknown };
  try {
    body = (await req.json()) as { messages?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.messages)) {
    return Response.json({ error: "messages array is required" }, { status: 400 });
  }

  const messages = body.messages.filter(isWebAgentMessage);
  await persistClientAssistantMessages(chatId, messages);

  return Response.json({ success: true });
}
