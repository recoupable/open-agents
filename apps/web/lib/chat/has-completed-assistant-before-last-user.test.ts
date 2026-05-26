import { describe, expect, test } from "bun:test";
import type { WebAgentUIMessage } from "@/app/types";
import { hasCompletedAssistantBeforeLastUser } from "./has-completed-assistant-before-last-user";

function user(id: string, text: string): WebAgentUIMessage {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

function assistant(id: string, text: string): WebAgentUIMessage {
  return { id, role: "assistant", parts: [{ type: "text", text }] };
}

describe("hasCompletedAssistantBeforeLastUser", () => {
  test("false when the thread ends with assistant (tool-loop continuation)", () => {
    expect(
      hasCompletedAssistantBeforeLastUser([
        user("u1", "hi"),
        assistant("a1", "hello"),
      ]),
    ).toBe(false);
  });

  test("false for a single user message", () => {
    expect(hasCompletedAssistantBeforeLastUser([user("u1", "hi")])).toBe(false);
  });

  test("true when a completed assistant precedes the trailing user", () => {
    expect(
      hasCompletedAssistantBeforeLastUser([
        user("u1", "weather"),
        assistant("a1", "sunny"),
        user("u2", "instagram?"),
      ]),
    ).toBe(true);
  });
});
