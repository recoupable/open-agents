import { describe, expect, test } from "bun:test";
import type { WebAgentUIMessage } from "@/app/types";
import { shouldPreserveLocalMessagesOverServerSnapshot } from "./should-preserve-local-messages-over-server-snapshot";

function msg(
  id: string,
  role: WebAgentUIMessage["role"],
): WebAgentUIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text: id }],
  };
}

describe("shouldPreserveLocalMessagesOverServerSnapshot", () => {
  test("preserves local when it has more messages", () => {
    const local = [msg("u1", "user"), msg("a1", "assistant"), msg("u2", "user")];
    const server = [msg("u1", "user"), msg("a1", "assistant")];

    expect(
      shouldPreserveLocalMessagesOverServerSnapshot(local, server),
    ).toBe(true);
  });

  test("preserves local when it has more assistant replies", () => {
    const local = [
      msg("u1", "user"),
      msg("a1", "assistant"),
      msg("u2", "user"),
      msg("a2", "assistant"),
    ];
    const server = [msg("u1", "user"), msg("a1", "assistant"), msg("u2", "user")];

    expect(
      shouldPreserveLocalMessagesOverServerSnapshot(local, server),
    ).toBe(true);
  });

  test("allows replace when server is at least as complete", () => {
    const local = [msg("u1", "user"), msg("a1", "assistant")];
    const server = [
      msg("u1", "user"),
      msg("a1", "assistant"),
      msg("u2", "user"),
      msg("a2", "assistant"),
    ];

    expect(
      shouldPreserveLocalMessagesOverServerSnapshot(local, server),
    ).toBe(false);
  });
});
