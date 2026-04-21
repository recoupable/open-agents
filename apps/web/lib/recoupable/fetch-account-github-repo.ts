import { z } from "zod";
import { RECOUPABLE_API_BASE_URL } from "./api-base-url";

const sandboxesResponseSchema = z
  .object({
    github_repo: z.string().min(1).nullable().optional(),
  })
  .passthrough();

/**
 * Fetches the account's github_repo from the Recoupable API sandboxes endpoint
 * using the caller's Privy access token for authentication.
 *
 * The target API is chosen by NEXT_PUBLIC_VERCEL_ENV — production hits
 * recoup-api, everything else hits test-recoup-api.
 *
 * Returns null when the token is missing, the API call fails, the response
 * shape is invalid, or no github_repo is associated with the account.
 */
export async function fetchAccountGithubRepo(
  accessToken: string,
): Promise<string | null> {
  if (!accessToken) {
    console.warn("[fetchAccountGithubRepo] accessToken is empty");
    return null;
  }

  try {
    const response = await fetch(`${RECOUPABLE_API_BASE_URL}/api/sandboxes`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error(
        `Recoupable API returned ${response.status} when fetching sandboxes`,
      );
      return null;
    }

    const parsed = sandboxesResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      console.error("Recoupable API returned an invalid sandboxes response");
      return null;
    }

    return parsed.data.github_repo ?? null;
  } catch (error) {
    console.error(
      "Failed to fetch account github_repo from Recoupable API:",
      error,
    );
    return null;
  }
}
