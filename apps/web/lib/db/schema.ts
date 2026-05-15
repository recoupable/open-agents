import type { SandboxState } from "@open-harness/sandbox";
import type { GlobalSkillRef } from "@/lib/skills/global-skill-refs";
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";

// Open-agents schema, types-only, pointed at recoupable Supabase.
//
// Schema ownership moved to the database codebase; tables here mirror
// the Supabase migrations under
// recoupable/database/supabase/migrations/2026050100*_open_agents_*.sql.
//
// TS-side properties keep the legacy `userId` name; the underlying
// column is `account_id` (UUID FK to accounts.id) on Supabase. No
// drizzle-kit migrations are generated from this file anymore.

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("account_id").notNull(),
    title: text("title").notNull(),
    status: text("status", {
      enum: ["running", "completed", "failed", "archived"],
    })
      .notNull()
      .default("running"),
    repoOwner: text("repo_owner"),
    repoName: text("repo_name"),
    branch: text("branch"),
    cloneUrl: text("clone_url"),
    isNewBranch: boolean("is_new_branch").default(false).notNull(),
    globalSkillRefs: jsonb("global_skill_refs")
      .$type<GlobalSkillRef[]>()
      .notNull()
      .default([]),
    sandboxState: jsonb("sandbox_state").$type<SandboxState>(),
    lifecycleState: text("lifecycle_state", {
      enum: [
        "provisioning",
        "active",
        "hibernating",
        "hibernated",
        "restoring",
        "archived",
        "failed",
      ],
    }),
    lifecycleVersion: integer("lifecycle_version").notNull().default(0),
    lastActivityAt: timestamp("last_activity_at"),
    sandboxExpiresAt: timestamp("sandbox_expires_at"),
    hibernateAfter: timestamp("hibernate_after"),
    lifecycleRunId: text("lifecycle_run_id"),
    lifecycleError: text("lifecycle_error"),
    linesAdded: integer("lines_added").default(0),
    linesRemoved: integer("lines_removed").default(0),
    snapshotUrl: text("snapshot_url"),
    snapshotCreatedAt: timestamp("snapshot_created_at"),
    snapshotSizeBytes: integer("snapshot_size_bytes"),
    cachedDiff: jsonb("cached_diff"),
    cachedDiffUpdatedAt: timestamp("cached_diff_updated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("sessions_account_id_idx").on(table.userId)],
);

export const chats = pgTable(
  "chats",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    modelId: text("model_id").default("anthropic/claude-haiku-4.5"),
    activeStreamId: text("active_stream_id"),
    lastAssistantMessageAt: timestamp("last_assistant_message_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("chats_session_id_idx").on(table.sessionId)],
);

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", {
    enum: ["user", "assistant"],
  }).notNull(),
  parts: jsonb("parts").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatReads = pgTable(
  "chat_reads",
  {
    userId: text("account_id").notNull(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.chatId] }),
    index("chat_reads_chat_id_idx").on(table.chatId),
  ],
);

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    modelId: text("model_id"),
    status: text("status", {
      enum: ["completed", "aborted", "failed"],
    }).notNull(),
    startedAt: timestamp("started_at").notNull(),
    finishedAt: timestamp("finished_at").notNull(),
    totalDurationMs: integer("total_duration_ms").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("workflow_runs_chat_id_idx").on(table.chatId)],
);

export const workflowRunSteps = pgTable(
  "workflow_run_steps",
  {
    id: text("id").primaryKey(),
    workflowRunId: text("workflow_run_id")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    startedAt: timestamp("started_at").notNull(),
    finishedAt: timestamp("finished_at").notNull(),
    durationMs: integer("duration_ms").notNull(),
    finishReason: text("finish_reason"),
    rawFinishReason: text("raw_finish_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("workflow_run_steps_run_id_idx").on(table.workflowRunId),
    uniqueIndex("workflow_run_steps_run_step_idx").on(
      table.workflowRunId,
      table.stepNumber,
    ),
  ],
);

export const usageEvents = pgTable("usage_events", {
  id: text("id").primaryKey(),
  userId: text("account_id").notNull(),
  source: text("source", { enum: ["web", "api"] })
    .notNull()
    .default("web"),
  agentType: text("agent_type", { enum: ["main", "subagent"] })
    .notNull()
    .default("main"),
  provider: text("provider"),
  modelId: text("model_id"),
  inputTokens: integer("input_tokens").notNull().default(0),
  cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  toolCallCount: integer("tool_call_count").notNull().default(0),
  creditsDeductedCents: integer("credits_deducted_cents").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Legacy wallet (Supabase-owned). Open-agents debits this on each
// recordUsage() write so credits_usage.remaining_credits stays the
// fast cached balance, and usage_events stays the append-only ledger.
// Schema lives in recoupable/database (see lib/supabase/credits_usage/
// in the api repo for the canonical write path).
export const creditsUsage = pgTable("credits_usage", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  accountId: text("account_id").notNull(),
  remainingCredits: integer("remaining_credits").notNull().default(0),
  timestamp: timestamp("timestamp", { withTimezone: true }),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type ChatRead = typeof chatReads.$inferSelect;
export type NewChatRead = typeof chatReads.$inferInsert;
export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type NewWorkflowRun = typeof workflowRuns.$inferInsert;
export type WorkflowRunStep = typeof workflowRunSteps.$inferSelect;
export type NewWorkflowRunStep = typeof workflowRunSteps.$inferInsert;
export type UsageEvent = typeof usageEvents.$inferSelect;
export type NewUsageEvent = typeof usageEvents.$inferInsert;
export type CreditsUsage = typeof creditsUsage.$inferSelect;
export type NewCreditsUsage = typeof creditsUsage.$inferInsert;
