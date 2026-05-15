import { isToolUIPart, type LanguageModel, type UIMessage } from "ai";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { estimateModelUsageCost } from "@/lib/models";
import { getInitialModels } from "@/lib/recoupable/get-initial-models";
import type { UsageDateRange } from "@/lib/usage/date-range";
import { db } from "./client";
import { creditsUsage, usageEvents } from "./schema";

export type UsageSource = "web" | "api";
export type UsageAgentType = "main" | "subagent";

/**
 * Per-turn cost in cents (minimum 1), driven by the same `AvailableModel.cost`
 * catalog the settings/usage page uses via `estimateModelUsageCost`. Returns 1
 * when pricing isn't available so a successful turn never lands as a free run.
 */
async function computeCreditsDeductedCents(
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  },
  modelId: string,
): Promise<number> {
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

export async function recordUsage(
  userId: string,
  data: {
    source: UsageSource;
    agentType?: UsageAgentType;
    model: LanguageModel | string;
    messages: UIMessage[];
    usage: {
      inputTokens: number;
      cachedInputTokens: number;
      outputTokens: number;
    };
    toolCallCount?: number;
  },
) {
  const inferredToolCallCount = data.messages
    .flatMap((m) => m.parts)
    .filter(isToolUIPart).length;
  const toolCallCount = data.toolCallCount ?? inferredToolCallCount;

  const provider =
    typeof data.model === "string"
      ? data.model.split("/")[0]
      : data.model.provider;
  const modelId =
    typeof data.model === "string" ? data.model : data.model.modelId;

  const creditsDeductedCents = modelId
    ? await computeCreditsDeductedCents(data.usage, modelId)
    : 0;

  // Atomic: either both the wallet debit AND the meter insert land, or
  // neither does. Prevents the wallet from drifting past the meter when
  // one side fails (the cubic/code-review concern). Errors are caught
  // outside the transaction so the agent workflow never aborts on a
  // credit accounting failure.
  try {
    await db.transaction(async (tx) => {
      if (creditsDeductedCents > 0) {
        await tx
          .update(creditsUsage)
          .set({
            remainingCredits: sql`${creditsUsage.remainingCredits} - ${creditsDeductedCents}`,
          })
          .where(eq(creditsUsage.accountId, userId));
      }

      await tx.insert(usageEvents).values({
        id: nanoid(),
        userId,
        source: data.source,
        agentType: data.agentType ?? "main",
        provider: provider ?? null,
        modelId: modelId ?? null,
        inputTokens: data.usage.inputTokens,
        cachedInputTokens: data.usage.cachedInputTokens,
        outputTokens: data.usage.outputTokens,
        toolCallCount,
        creditsDeductedCents,
      });
    });
  } catch (error) {
    console.error(
      "Failed to record usage (wallet + meter rolled back together):",
      error,
    );
  }
}

export interface DailyUsage {
  date: string;
  source: UsageSource;
  agentType: UsageAgentType;
  provider: string | null;
  modelId: string | null;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  messageCount: number;
  toolCallCount: number;
}

export interface UsageHistoryOptions {
  days?: number;
  range?: UsageDateRange;
  allTime?: boolean;
}

function buildUsageHistoryWhereClause(
  userId: string,
  options?: UsageHistoryOptions,
) {
  if (options?.range) {
    return sql`${usageEvents.userId} = ${userId} and date(${usageEvents.createdAt}) >= ${options.range.from} and date(${usageEvents.createdAt}) <= ${options.range.to}`;
  }

  if (options?.allTime) {
    return sql`${usageEvents.userId} = ${userId}`;
  }

  const days = options?.days ?? 280;
  const since = new Date();
  since.setDate(since.getDate() - days);

  return sql`${usageEvents.userId} = ${userId} and ${usageEvents.createdAt} >= ${since.toISOString()}`;
}

export async function getUsageHistory(
  userId: string,
  options?: UsageHistoryOptions,
): Promise<DailyUsage[]> {
  const rows = await db
    .select({
      date: sql<string>`date(${usageEvents.createdAt})`,
      source: usageEvents.source,
      agentType: usageEvents.agentType,
      provider: usageEvents.provider,
      modelId: usageEvents.modelId,
      inputTokens: sql<number>`coalesce(sum(${usageEvents.inputTokens}), 0)::double precision`,
      cachedInputTokens: sql<number>`coalesce(sum(${usageEvents.cachedInputTokens}), 0)::double precision`,
      outputTokens: sql<number>`coalesce(sum(${usageEvents.outputTokens}), 0)::double precision`,
      messageCount: sql<number>`coalesce(sum(case when ${usageEvents.agentType} = 'main' then 1 else 0 end), 0)::double precision`,
      toolCallCount: sql<number>`coalesce(sum(${usageEvents.toolCallCount}), 0)::double precision`,
    })
    .from(usageEvents)
    .where(buildUsageHistoryWhereClause(userId, options))
    .groupBy(
      sql`date(${usageEvents.createdAt})`,
      usageEvents.source,
      usageEvents.agentType,
      usageEvents.provider,
      usageEvents.modelId,
    )
    .orderBy(sql`date(${usageEvents.createdAt})`);

  return rows;
}
