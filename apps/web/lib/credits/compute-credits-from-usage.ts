import { gateway } from "ai";

export interface UsageInput {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Per-turn cost in cents, mirroring api/lib/credits/getCreditUsage.ts +
 * api/lib/credits/handleChatCredits.ts (Math.max(1, round(cost * 100))).
 *
 * Every successful turn costs at least 1 cent — even if the gateway
 * lookup fails or the model isn't in the catalog — so missing pricing
 * data never silently produces free runs.
 */
export async function computeCreditsFromUsage(
  usage: UsageInput,
  modelId: string,
): Promise<number> {
  try {
    const { models } = await gateway.getAvailableModels();
    const model = models.find((m) => m.id === modelId);
    if (!model?.pricing?.input || !model?.pricing?.output) {
      return 1;
    }
    const inputCost = usage.inputTokens * Number(model.pricing.input);
    const outputCost = usage.outputTokens * Number(model.pricing.output);
    return Math.max(1, Math.round((inputCost + outputCost) * 100));
  } catch (error) {
    console.error("Failed to compute credits from usage:", error);
    return 1;
  }
}
