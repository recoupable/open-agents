/**
 * Browser storage for the auto-submitted first message on a brand-new
 * personal session. The server emits the prompt at session-create time;
 * the chat page reads it on mount and submits it once. Keyed by chatId
 * so navigating away and back (with the prompt already submitted)
 * doesn't refire it.
 *
 * Uses `sessionStorage` so the prompt is dropped on tab close — better
 * than a stale prompt resurfacing weeks later if a user happened to
 * load the chat in another tab.
 */

const STORAGE_PREFIX = "personal-session-bootstrap:";

function key(chatId: string): string {
  return `${STORAGE_PREFIX}${chatId}`;
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function setBootstrapPrompt(chatId: string, prompt: string): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(key(chatId), prompt);
  } catch {
    // Storage full or disabled — bootstrap silently degrades to
    // "no auto-submit"; the user can still type their first message.
  }
}

export function takeBootstrapPrompt(chatId: string): string | null {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const value = storage.getItem(key(chatId));
    if (value) {
      storage.removeItem(key(chatId));
    }
    return value;
  } catch {
    return null;
  }
}
