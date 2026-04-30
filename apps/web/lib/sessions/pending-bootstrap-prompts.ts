"use client";

/**
 * In-memory stash of bootstrap prompts keyed by chatId. Survives the
 * `router.push` soft navigation from `useCreatePersonalSession` to the
 * chat page (same JS context). The chat page consumes the entry once
 * the sandbox becomes active, then clears it.
 *
 * On full page reload the Map resets — bootstrap is best-effort on the
 * first navigation immediately after session creation.
 */
const pendingBootstrapPrompts = new Map<string, string>();

export function setPendingBootstrapPrompt(chatId: string, prompt: string) {
  pendingBootstrapPrompts.set(chatId, prompt);
}

export function takePendingBootstrapPrompt(chatId: string): string | undefined {
  const prompt = pendingBootstrapPrompts.get(chatId);
  if (prompt !== undefined) {
    pendingBootstrapPrompts.delete(chatId);
  }
  return prompt;
}
