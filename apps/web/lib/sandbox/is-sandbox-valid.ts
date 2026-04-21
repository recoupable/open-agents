import type { SandboxInfo } from "@/app/sessions/[sessionId]/chats/[chatId]/session-chat-context";

export function isSandboxValid(sandboxInfo: SandboxInfo | null): boolean {
  if (!sandboxInfo) return false;
  if (sandboxInfo.timeout === null) return true;
  const expiresAt = sandboxInfo.createdAt + sandboxInfo.timeout;
  return expiresAt > Date.now();
}
