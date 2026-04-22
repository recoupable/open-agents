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
 * Fetches the list of organizations from the Recoupable API
 * using the caller's Privy access token for authentication.
 *
 * Returns an empty array when the token is missing, the API call fails,
 * or the response shape is invalid.
 */
export async function fetchAccountOrgs(
  accessToken: string,
): Promise<RecoupableOrg[]> {
  if (!accessToken) {
    console.warn("[fetchAccountOrgs] accessToken is empty");
    return [];
  }

  try {
    const response = await fetch(
      `${RECOUPABLE_API_BASE_URL}/api/organizations`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      console.error(
        `Recoupable API returned ${response.status} when fetching organizations`,
      );
      return [];
    }

    const parsed = orgsResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      console.error(
        "Recoupable API returned an invalid organizations response",
      );
      return [];
    }

    return parsed.data.organizations;
  } catch (error) {
    console.error("Failed to fetch organizations from Recoupable API:", error);
    return [];
  }
}
