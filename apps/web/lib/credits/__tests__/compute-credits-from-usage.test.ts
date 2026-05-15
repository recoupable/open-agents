import { afterEach, describe, expect, it, mock, test } from "bun:test";

let availableModelsResult: unknown[] = [];
let getAvailableModelsThrows = false;

mock.module("ai", () => ({
  gateway: {
    getAvailableModels: async () => {
      if (getAvailableModelsThrows) {
        throw new Error("gateway exploded");
      }
      return { models: availableModelsResult };
    },
  },
}));

const { computeCreditsFromUsage } =
  await import("../compute-credits-from-usage");

function resetMocks() {
  availableModelsResult = [];
  getAvailableModelsThrows = false;
}

describe("computeCreditsFromUsage", () => {
  afterEach(() => {
    resetMocks();
  });

  it("returns cents from input/output pricing × token counts (matches api/getCreditUsage)", async () => {
    // $0.000003 per input token, $0.000015 per output token
    // 1000 input + 500 output → 0.003 + 0.0075 = $0.0105 = 1.05 cents → round to 1
    availableModelsResult = [
      {
        id: "anthropic/claude-haiku-4.5",
        pricing: { input: "0.000003", output: "0.000015" },
      },
    ];

    const cents = await computeCreditsFromUsage(
      { inputTokens: 1000, outputTokens: 500 },
      "anthropic/claude-haiku-4.5",
    );

    expect(cents).toBe(1);
  });

  it("rounds correctly for larger amounts (matches handleChatCredits)", async () => {
    // 100k input + 50k output × pricing above → 0.3 + 0.75 = $1.05 → 105 cents
    availableModelsResult = [
      {
        id: "anthropic/claude-haiku-4.5",
        pricing: { input: "0.000003", output: "0.000015" },
      },
    ];

    const cents = await computeCreditsFromUsage(
      { inputTokens: 100_000, outputTokens: 50_000 },
      "anthropic/claude-haiku-4.5",
    );

    expect(cents).toBe(105);
  });

  test("returns minimum 1 cent when the model is not in the gateway catalog", async () => {
    availableModelsResult = []; // model id won't match

    const cents = await computeCreditsFromUsage(
      { inputTokens: 1000, outputTokens: 500 },
      "anthropic/claude-haiku-4.5",
    );

    expect(cents).toBe(1);
  });

  test("returns minimum 1 cent when the model has no pricing", async () => {
    availableModelsResult = [
      { id: "anthropic/claude-haiku-4.5", pricing: undefined },
    ];

    const cents = await computeCreditsFromUsage(
      { inputTokens: 1000, outputTokens: 500 },
      "anthropic/claude-haiku-4.5",
    );

    expect(cents).toBe(1);
  });

  test("returns minimum 1 cent for zero-token usage (matches handleChatCredits Math.max(1, 0))", async () => {
    availableModelsResult = [
      {
        id: "anthropic/claude-haiku-4.5",
        pricing: { input: "0.000003", output: "0.000015" },
      },
    ];

    const cents = await computeCreditsFromUsage(
      { inputTokens: 0, outputTokens: 0 },
      "anthropic/claude-haiku-4.5",
    );

    expect(cents).toBe(1);
  });

  test("returns minimum 1 cent when the gateway lookup throws", async () => {
    getAvailableModelsThrows = true;

    const cents = await computeCreditsFromUsage(
      { inputTokens: 1000, outputTokens: 500 },
      "anthropic/claude-haiku-4.5",
    );

    expect(cents).toBe(1);
  });
});
