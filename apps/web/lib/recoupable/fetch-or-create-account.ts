import "server-only";
import { z } from "zod";
import { getRecoupApiBaseUrl } from "./get-recoup-api-base-url";

const accountResponseSchema = z.object({
  data: z.object({
    account_id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
  }),
});

export type RecoupableAccount = {
  accountId: string;
  name: string;
  email?: string;
};

/**
 * Calls `POST recoup-api/api/accounts` with the user's email.
 *
 * The route is **idempotent**: if an account already exists for the email it
 * returns that record; otherwise it creates a new one. Used by open-agents'
 * personal-repo path to ensure the recoup-api side has an account row to
 * derive a stable `<name>-<account_id>` repo identifier from.
 *
 * Returns `null` when the API call fails or returns an unexpected shape;
 * callers should treat that as a fatal "can't onboard this user yet" signal.
 */
export async function fetchOrCreateAccount(
  email: string,
): Promise<RecoupableAccount | null> {
  if (!email) {
    return null;
  }

  try {
    const baseUrl = await getRecoupApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      console.error(
        `[fetchOrCreateAccount] ${baseUrl}/api/accounts returned ${response.status}`,
      );
      return null;
    }

    const parsed = accountResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      console.error(
        "[fetchOrCreateAccount] unexpected response shape",
        parsed.error.flatten(),
      );
      return null;
    }

    const fallbackName = email.split("@")[0] ?? "user";
    return {
      accountId: parsed.data.data.account_id,
      name: parsed.data.data.name ?? fallbackName,
      email: parsed.data.data.email ?? email,
    };
  } catch (error) {
    console.error("[fetchOrCreateAccount] failed:", error);
    return null;
  }
}
