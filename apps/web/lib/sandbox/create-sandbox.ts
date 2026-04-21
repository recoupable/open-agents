import type { SandboxInfo } from "@/app/sessions/[sessionId]/chats/[chatId]/session-chat-context";
import { SandboxCreateRequestError } from "./sandbox-create-request-error";

type CreateSandboxResponse = SandboxInfo & {
  type: string;
};

type CreateSandboxErrorResponse = {
  error?: string;
  reason?: string;
  actionUrl?: string;
};

function parseCreateSandboxErrorResponse(
  rawBody: string,
): CreateSandboxErrorResponse | null {
  if (!rawBody) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as CreateSandboxErrorResponse;
  } catch {
    return null;
  }
}

function getOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getFallbackSandboxCreateErrorMessage(status: number): string {
  if (status === 403) {
    return "Sandbox access denied. Please reconnect GitHub and try again.";
  }

  return "Failed to create sandbox. Please try again.";
}

export async function createSandbox(
  cloneUrl: string | undefined,
  branch: string | undefined,
  isNewBranch: boolean,
  sessionId: string,
  sandboxType: string | undefined,
  accessToken: string | null,
): Promise<CreateSandboxResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch("/api/sandbox", {
    method: "POST",
    headers,
    body: JSON.stringify({
      repoUrl: cloneUrl,
      branch: cloneUrl ? (branch ?? "main") : undefined,
      isNewBranch: cloneUrl ? isNewBranch : false,
      sessionId,
      sandboxType: sandboxType ?? "vercel",
    }),
  });

  if (!response.ok) {
    const rawBody = await response.text().catch(() => "");
    const payload = parseCreateSandboxErrorResponse(rawBody);
    const message =
      getOptionalString(payload?.error) ??
      getFallbackSandboxCreateErrorMessage(response.status);

    throw new SandboxCreateRequestError(message, {
      status: response.status,
      reason: getOptionalString(payload?.reason),
      actionUrl: getOptionalString(payload?.actionUrl),
      responseBody: rawBody || undefined,
    });
  }

  const data = (await response.json()) as {
    mode: string;
  } & SandboxInfo;

  return { ...data, type: data.mode };
}
