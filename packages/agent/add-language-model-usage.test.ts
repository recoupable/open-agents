import { describe, expect, test } from "bun:test";
import type { LanguageModelUsage } from "ai";
import { addLanguageModelUsage } from "./add-language-model-usage";

function usage(
  overrides: Partial<LanguageModelUsage> = {},
): LanguageModelUsage {
  return {
    inputTokens: undefined,
    inputTokenDetails: {
      noCacheTokens: undefined,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    },
    outputTokens: undefined,
    outputTokenDetails: { textTokens: undefined, reasoningTokens: undefined },
    totalTokens: undefined,
    ...overrides,
  };
}

describe("language model usage across turns", () => {
  test("combines cached, generated, and legacy token counts without changing either turn", () => {
    const first = usage({
      inputTokens: 100,
      inputTokenDetails: {
        noCacheTokens: 70,
        cacheReadTokens: 20,
        cacheWriteTokens: 10,
      },
      outputTokens: 30,
      outputTokenDetails: { textTokens: 20, reasoningTokens: 10 },
      totalTokens: 130,
      cachedInputTokens: 20,
      reasoningTokens: 10,
    });
    const second = usage({
      inputTokens: 25,
      inputTokenDetails: {
        noCacheTokens: 10,
        cacheReadTokens: 15,
        cacheWriteTokens: undefined,
      },
      outputTokens: 7,
      outputTokenDetails: { textTokens: 2, reasoningTokens: 5 },
      totalTokens: 32,
      cachedInputTokens: 15,
      reasoningTokens: 5,
    });
    const original = structuredClone([first, second]);

    const total = addLanguageModelUsage(first, second);

    expect(total.inputTokens).toBe(125);
    expect(total.outputTokens).toBe(37);
    expect(total.totalTokens).toBe(162);
    expect(total.inputTokenDetails).toEqual({
      noCacheTokens: 80,
      cacheReadTokens: 35,
      cacheWriteTokens: 10,
    });
    expect(total.outputTokenDetails).toEqual({
      textTokens: 22,
      reasoningTokens: 15,
    });
    expect(total.cachedInputTokens).toBe(35);
    expect(total.reasoningTokens).toBe(15);
    expect([first, second]).toEqual(original);
  });

  test("distinguishes unknown usage from an explicitly reported zero", () => {
    const unknown = addLanguageModelUsage(usage(), usage());
    expect(unknown.totalTokens).toBeUndefined();
    expect(unknown.inputTokenDetails.cacheReadTokens).toBeUndefined();
    const reported = addLanguageModelUsage(usage(), usage({ inputTokens: 0 }));
    expect(reported.inputTokens).toBe(0);
    expect(reported.outputTokens).toBeUndefined();
  });
});
