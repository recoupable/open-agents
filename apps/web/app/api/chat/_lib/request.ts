import { z } from "zod";
import type { WebAgentUIMessage } from "@/app/types";

const chatRequestBodySchema = z.object({
  messages: z.custom<WebAgentUIMessage[]>((val) => Array.isArray(val), {
    message: "messages must be an array",
  }),
  sessionId: z.string().optional(),
  chatId: z.string().optional(),
  /**
   * Short-lived Recoupable access token (Privy JWT) for this prompt.
   * Forwarded into the agent's `experimental_context` so tools making
   * outbound calls to the Recoupable API authenticate as the user for
   * the duration of this prompt only.
   */
  recoupAccessToken: z.string().min(1).max(8192).optional(),
  context: z
    .object({
      contextLimit: z.number(),
    })
    .optional(),
});

export type ChatRequestBody = z.infer<typeof chatRequestBodySchema>;

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
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }

  const parsed = chatRequestBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json(
        { error: "Invalid request body", issues: parsed.error.issues },
        { status: 400 },
      ),
    };
  }

  return { ok: true, body: parsed.data };
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
