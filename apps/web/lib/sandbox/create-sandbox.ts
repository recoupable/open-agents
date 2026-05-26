import type { SandboxInfo } from "@/app/sessions/[sessionId]/chats/[chatId]/session-chat-context";
import { RECOUPABLE_API_BASE_URL } from "@/lib/recoupable/api-base-url";
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

/**
 * Provision a sandbox for the given session.
 *
 * Cut over (recoupable/api Path C) from open-agents' own `/api/sandbox`
 * route to recoup-api's `POST /api/sandbox`. recoup-api owns the
 * sandbox lifecycle (provisioning, lifecycle workflow, snapshot
 * lookup, global-skill install) so the sandbox is born in recoup-api's
 * Vercel project and the chat workflow's `sandbox.exec` calls — which
 * also resolve via recoup-api's OIDC — can reach it without any
 * cross-project credential plumbing.
 *
 * recoup-api always provisions against the repo's default branch and
 * only supports `vercel` sandboxes, so the previous `branch`,
 * `isNewBranch`, and `sandboxType` arguments have no remote semantics
 * and have been dropped from the wire and the signature.
 *
 * @param recoupAccessToken - Short-lived Privy JWT. Forwarded as
 *   `Authorization: Bearer …` so recoup-api's `validateAuthContext`
 *   accepts the cross-origin request. Pass `null` only in contexts
 *   where the caller is sure auth has already been resolved (the
 *   handler will return 401 otherwise).
 */
export async function createSandbox(
  cloneUrl: string,
  sessionId: string,
  recoupAccessToken: string | null,
): Promise<CreateSandboxResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (recoupAccessToken) {
    headers.Authorization = `Bearer ${recoupAccessToken}`;
  }

  const response = await fetch(`${RECOUPABLE_API_BASE_URL}/api/sandbox`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      repoUrl: cloneUrl,
      sessionId,
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
