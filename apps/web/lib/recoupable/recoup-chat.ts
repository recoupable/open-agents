/**
 * Wire-format `chats` row as returned by the recoupable API
 * (matches the api's `toChatResponse`: camelCase keys, ISO strings
 * for timestamps). Single source of truth for the type — recoupable
 * helpers and any server → client boundary that hands chats to the
 * UI should consume / produce this shape.
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

/**
 * Drizzle-shaped chat row (Date timestamps) — narrow to the fields
 * we actually serialize so callers don't have to hand-pick props.
 */
type DrizzleChatRow = Omit<
  RecoupChat,
  "createdAt" | "updatedAt" | "lastAssistantMessageAt"
> & {
  createdAt: Date;
  updatedAt: Date;
  lastAssistantMessageAt: Date | null;
};

/**
 * Convert a Drizzle-shaped chat row into the recoupable wire format
 * by ISO-stringifying the timestamps. Used at server → client
 * boundaries that prefetch via Drizzle but hand off to UI consumers
 * that expect the API wire shape.
 */
export function toRecoupChat<T extends DrizzleChatRow>(
  row: T,
): RecoupChat & Omit<T, keyof DrizzleChatRow> {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastAssistantMessageAt: row.lastAssistantMessageAt?.toISOString() ?? null,
  };
}
