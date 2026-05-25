import type { WebAgentUIMessage } from "@/app/types";

/** Higher score means more complete message content (parts count + text length). */
export function messageRichnessScore(message: WebAgentUIMessage): number {
  let score = message.parts.length;

  if (message.role !== "assistant") {
    return score;
  }

  for (const part of message.parts) {
    if (part.type === "text") {
      score += part.text.length;
    }
  }

  return score;
}
