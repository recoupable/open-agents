import { estimateModelUsageCost } from "@/lib/models";
import { getInitialModels } from "@/lib/recoupable/get-initial-models";

/**
 * Per-turn cost in cents (minimum 1). Prefers the gateway-reported actual
 * cost when available (`assistantMessage.metadata.totalMessageCost`, the same
 * source the chat UI shows next to the assistant response) and falls back to
 * a token-based estimate via `estimateModelUsageCost` against the
 * `AvailableModel.cost` catalog the settings/usage page uses. Returns 1 when
 * no pricing is available so a successful turn never lands as a free run.
 */
export async function computeCreditsDeductedCents(
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  },
  modelId: string,
  gatewayCostUsd?: number,
): Promise<number> {
  if (
    typeof gatewayCostUsd === "number" &&
    Number.isFinite(gatewayCostUsd) &&
    gatewayCostUsd > 0
  ) {
    return Math.max(1, Math.round(gatewayCostUsd * 100));
  }

  try {
    const models = await getInitialModels();
    const model = models.find((m) => m.id === modelId);
    const usd = estimateModelUsageCost(usage, model?.cost);
    if (typeof usd !== "number" || usd <= 0) return 1;
    return Math.max(1, Math.round(usd * 100));
  } catch (error) {
    console.error("Failed to compute credits from usage:", error);
    return 1;
  }
}
