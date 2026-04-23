import type { WebAgentUIMessage } from "@/app/types";

export interface ChatRequestBody {
  messages: WebAgentUIMessage[];
  sessionId?: string;
  chatId?: string;
  /**
   * Short-lived Recoupable access token (Privy JWT) for this prompt.
   * Forwarded into the agent's `experimental_context` so tools making
   * outbound calls to the Recoupable API authenticate as the user for
   * the duration of this prompt only.
   */
  recoupAccessToken?: string;
}

type ParseChatRequestResult =
  | {
      ok: true;
      body: ChatRequestBody;
    }
  | {
      ok: false;
      response: Response;
    };

type RequireChatIdentifiersResult =
  | {
      ok: true;
      sessionId: string;
      chatId: string;
    }
  | {
      ok: false;
      response: Response;
    };

export async function parseChatRequestBody(
  req: Request,
): Promise<ParseChatRequestResult> {
  try {
    const body = (await req.json()) as ChatRequestBody;
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}

export function requireChatIdentifiers(
  body: ChatRequestBody,
): RequireChatIdentifiersResult {
  if (!body.sessionId || !body.chatId) {
    return {
      ok: false,
      response: Response.json(
        { error: "sessionId and chatId are required" },
        { status: 400 },
      ),
    };
  }

  return {
    ok: true,
    sessionId: body.sessionId,
    chatId: body.chatId,
  };
}
