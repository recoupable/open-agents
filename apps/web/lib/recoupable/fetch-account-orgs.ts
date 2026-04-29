import { z } from "zod";
import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

const orgSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  organization_name: z.string(),
  organization_image: z.string().nullable().optional(),
});

const orgsResponseSchema = z.object({
  status: z.literal("success"),
  organizations: z.array(orgSchema),
});

export type RecoupableOrg = z.infer<typeof orgSchema>;

/**
 * Thrown when the orgs lookup couldn't complete: missing token, transport
 * failure, non-OK response, or invalid response shape. Distinct from a
 * successful response that returns zero orgs — callers must treat these
 * differently (e.g. don't auto-provision a personal workspace just
 * because we failed to reach the orgs endpoint).
 */
export class FetchAccountOrgsError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "FetchAccountOrgsError";
  }
}

/**
 * Fetches the list of organizations from the Recoupable API using the
 * caller's Privy access token. Throws `FetchAccountOrgsError` for any
 * failure path so callers can react explicitly — silently treating a
 * lookup error as "user has no orgs" can incorrectly trigger
 * personal-repo provisioning for users who already belong to orgs.
 *
 * 401 responses are treated as success-with-no-orgs: the user is
 * authenticated against open-agents but recoup-api hasn't seen them
 * yet, which is the legitimate empty state for new signups.
 */
export async function fetchAccountOrgs(
  accessToken: string,
): Promise<RecoupableOrg[]> {
  if (!accessToken) {
    throw new FetchAccountOrgsError("accessToken is empty");
  }

  let response: Response;
  try {
    response = await fetch(`${RECOUPABLE_API_BASE_URL}/api/organizations`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    throw new FetchAccountOrgsError(
      "transport failure when fetching organizations",
      error,
    );
  }

  if (response.status === 401) {
    // No recoup-api account yet → no orgs. The personal-repo flow exists
    // precisely to onboard this case; return an empty list rather than
    // bailing the entire prepare/SWR pipeline.
    return [];
  }

  if (!response.ok) {
    throw new FetchAccountOrgsError(
      `Recoupable API returned ${response.status} when fetching organizations`,
    );
  }

  const parsed = orgsResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new FetchAccountOrgsError(
      "Recoupable API returned an invalid organizations response",
      parsed.error,
    );
  }

  return parsed.data.organizations;
}
