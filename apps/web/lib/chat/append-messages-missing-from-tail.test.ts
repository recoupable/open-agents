import { describe, expect, it } from "bun:test";
import type { WebAgentUIMessage } from "@/app/types";
import { appendMessagesMissingFromTail } from "./append-messages-missing-from-tail";
import { getMessagesAfterUser } from "./get-messages-after-user";

function user(id: string): WebAgentUIMessage {
  return { id, role: "user", parts: [{ type: "text", text: id }] };
}

function assistant(id: string): WebAgentUIMessage {
  return { id, role: "assistant", parts: [{ type: "text", text: id }] };
}

describe("getMessagesAfterUser", () => {
  it("returns messages after the given user id", () => {
    const messages = [user("u1"), assistant("a1"), user("u2"), user("u3")];
    expect(getMessagesAfterUser(messages, "u2").map((m) => m.id)).toEqual([
      "u3",
    ]);
  });
});

describe("appendMessagesMissingFromTail", () => {
  it("appends tail rows without duplicating ids", () => {
    const current = [user("u1"), assistant("a1"), user("u2"), assistant("a2")];
    const tail = [user("u3")];

    const restored = appendMessagesMissingFromTail(current, tail);
    expect(restored.map((m) => m.id)).toEqual([
      "u1",
      "a1",
      "u2",
      "a2",
      "u3",
    ]);
  });
});
