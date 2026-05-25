import { afterEach, describe, expect, mock, test } from "bun:test";
import type { WebAgentUIMessage } from "@/app/types";

const upsertSpy = mock(() =>
  Promise.resolve({ status: "inserted" as const }),
);
const createUserSpy = mock(() => Promise.resolve({ id: "u1" }));
const touchChatSpy = mock(() => Promise.resolve());

mock.module("@/lib/db/sessions", () => ({
  upsertChatMessageScoped: upsertSpy,
  createChatMessageIfNotExists: createUserSpy,
  touchChat: touchChatSpy,
}));

const { persistClientAssistantMessages, persistTrailingUserMessages } =
  await import("./persist-client-messages");

function assistant(id: string, text: string): WebAgentUIMessage {
  return {
    id,
    role: "assistant",
    parts: [{ type: "text", text }],
  };
}

function user(id: string, text: string): WebAgentUIMessage {
  return {
    id,
    role: "user",
    parts: [{ type: "text", text }],
  };
}

afterEach(() => {
  upsertSpy.mockClear();
  createUserSpy.mockClear();
  touchChatSpy.mockClear();
});

describe("persistClientAssistantMessages", () => {
  test("upserts every renderable assistant in the payload", async () => {
    await persistClientAssistantMessages("chat-1", [
      user("u1", "hi"),
      assistant("a1", "one"),
      user("u2", "again"),
      assistant("a2", "two"),
    ]);

    expect(upsertSpy).toHaveBeenCalledTimes(2);
  });
});

describe("persistTrailingUserMessages", () => {
  test("persists user messages after the last assistant", async () => {
    await persistTrailingUserMessages("chat-1", [
      user("u1", "first"),
      assistant("a1", "ok"),
      user("u2", "second"),
      user("u3", "third"),
    ]);

    expect(createUserSpy).toHaveBeenCalledTimes(2);
    expect(touchChatSpy).toHaveBeenCalledTimes(1);
  });
});
