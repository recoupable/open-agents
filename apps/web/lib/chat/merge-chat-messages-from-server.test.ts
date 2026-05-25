import { describe, expect, test } from "bun:test";
import type { WebAgentUIMessage } from "@/app/types";
import {
  chatMessagesSnapshotChanged,
  mergeChatMessagesFromServer,
} from "./merge-chat-messages-from-server";

function user(id: string, text: string): WebAgentUIMessage {
  return {
    id,
    role: "user",
    parts: [{ type: "text", text }],
  };
}

function assistant(id: string, text: string): WebAgentUIMessage {
  return {
    id,
    role: "assistant",
    parts: [{ type: "text", text }],
  };
}

describe("mergeChatMessagesFromServer", () => {
  test("keeps local-only messages in order", () => {
    const local = [user("u1", "a"), assistant("a1", "short"), user("u2", "b")];
    const server = [user("u1", "a"), assistant("a1", "short")];

    const merged = mergeChatMessagesFromServer(local, server);
    expect(merged.map((m) => m.id)).toEqual(["u1", "a1", "u2"]);
  });

  test("prefers richer local assistant over thin server row", () => {
    const local = [
      user("u1", "hi"),
      assistant("a1", "long answer with detail"),
    ];
    const server = [user("u1", "hi"), assistant("a1", "ok")];

    const merged = mergeChatMessagesFromServer(local, server);
    expect(merged[1]?.parts[0]).toMatchObject({
      type: "text",
      text: "long answer with detail",
    });
  });

  test("appends server-only messages at the end", () => {
    const local = [user("u1", "a")];
    const server = [user("u1", "a"), assistant("a1", "from server")];

    const merged = mergeChatMessagesFromServer(local, server);
    expect(merged.map((m) => m.id)).toEqual(["u1", "a1"]);
  });
});

describe("chatMessagesSnapshotChanged", () => {
  test("detects length and id order changes", () => {
    const base = [user("u1", "a")];
    expect(chatMessagesSnapshotChanged(base, base)).toBe(false);
    expect(chatMessagesSnapshotChanged(base, [...base, user("u2", "b")])).toBe(
      true,
    );
  });

  test("detects richer content when ids are unchanged", () => {
    const local = [user("u1", "hi"), assistant("a1", "short")];
    const merged = mergeChatMessagesFromServer(local, [
      user("u1", "hi"),
      assistant("a1", "longer server answer"),
    ]);

    expect(chatMessagesSnapshotChanged(local, merged)).toBe(true);
  });
});
