import { describe, expect, test } from "bun:test";
import type { WebAgentUIMessage } from "@/app/types";
import { shouldUpsertClientAssistant } from "./should-upsert-client-assistant";

function assistant(id: string, text: string): WebAgentUIMessage {
  return {
    id,
    role: "assistant",
    parts: [{ type: "text", text }],
  };
}

describe("shouldUpsertClientAssistant", () => {
  test("inserts when no stored row exists", () => {
    expect(shouldUpsertClientAssistant(assistant("a1", "hello"), null)).toBe(
      true,
    );
  });

  test("skips when client snapshot is thinner than stored", () => {
    expect(
      shouldUpsertClientAssistant(
        assistant("a1", "ok"),
        assistant("a1", "long answer already in database"),
      ),
    ).toBe(false);
  });

  test("upserts when client snapshot is richer than stored", () => {
    expect(
      shouldUpsertClientAssistant(
        assistant("a1", "longer client snapshot"),
        assistant("a1", "ok"),
      ),
    ).toBe(true);
  });
});
