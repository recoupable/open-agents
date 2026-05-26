import { describe, expect, it } from "bun:test";
import type { WebAgentUIMessage } from "@/app/types";
import { reorderChatMessagesForThreadDisplay } from "./reorder-chat-messages-for-thread-display";

function user(id: string): WebAgentUIMessage {
  return { id, role: "user", parts: [{ type: "text", text: id }] };
}

function assistant(id: string): WebAgentUIMessage {
  return { id, role: "assistant", parts: [{ type: "text", text: id }] };
}

describe("reorderChatMessagesForThreadDisplay", () => {
  it("pairs clustered users before assistants into turn order", () => {
    const u1 = user("u1");
    const u2 = user("u2");
    const u3 = user("u3");
    const a1 = assistant("a1");
    const a2 = assistant("a2");

    const createdAtById = new Map<string, Date>([
      ["u1", new Date("2026-01-01T00:00:00Z")],
      ["u2", new Date("2026-01-01T00:00:01Z")],
      ["u3", new Date("2026-01-01T00:00:02Z")],
      ["a1", new Date("2026-01-01T00:00:10Z")],
      ["a2", new Date("2026-01-01T00:00:11Z")],
    ]);

    const ordered = reorderChatMessagesForThreadDisplay(
      [u1, u2, u3, a1, a2],
      createdAtById,
    );

    expect(ordered.map((message) => message.id)).toEqual([
      "u1",
      "a1",
      "u2",
      "a2",
      "u3",
    ]);
  });

  it("keeps already-interleaved rows unchanged", () => {
    const messages = [user("u1"), assistant("a1"), user("u2"), assistant("a2")];
    const createdAtById = new Map(
      messages.map((message, index) => [
        message.id,
        new Date(`2026-01-01T00:00:0${index}Z`),
      ]),
    );

    const ordered = reorderChatMessagesForThreadDisplay(messages, createdAtById);
    expect(ordered.map((message) => message.id)).toEqual([
      "u1",
      "a1",
      "u2",
      "a2",
    ]);
  });
});
