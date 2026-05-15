import { isToolUIPart, type LanguageModel, type UIMessage } from "ai";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { computeCreditsDeductedCents } from "@/lib/credits/compute-credits-deducted-cents";
import type { UsageDateRange } from "@/lib/usage/date-range";
import { db } from "./client";
import { creditsUsage, usageEvents } from "./schema";

export type UsageSource = "web" | "api";
export type UsageAgentType = "main" | "subagent";

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
    /**
     * Gateway-reported total cost in USD for this turn (from
     * `assistantMessage.metadata.totalMessageCost`). When present this is
     * used directly so the wallet debit converges with the cost the UI
     * displays next to the assistant response. Falls back to a token-based
     * estimate when omitted (subagent steps don't carry per-step cost).
     */
    gatewayCostUsd?: number;
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
    ? await computeCreditsDeductedCents(
        data.usage,
        modelId,
        data.gatewayCostUsd,
      )
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
