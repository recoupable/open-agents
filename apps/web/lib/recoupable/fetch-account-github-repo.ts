/**
 * Fetches the account's github_repo from the Recoupable API sandboxes/list endpoint.
 *
 * Requires RECOUPABLE_API_URL and RECOUPABLE_API_KEY environment variables.
 * Returns null if the env vars are not set, the API call fails, or no github_repo is found.
 */
export async function fetchAccountGithubRepo(
  apiKey: string,
): Promise<string | null> {
  const apiUrl = process.env.RECOUPABLE_API_URL;
  if (!apiUrl || !apiKey) {
    return null;
  }

  try {
    const response = await fetch(`${apiUrl}/api/sandboxes`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      console.error(
        `Recoupable API returned ${response.status} when fetching sandboxes`,
      );
      return null;
    }

    const data = (await response.json()) as {
      github_repo?: string | null;
    };

    return data.github_repo ?? null;
  } catch (error) {
    console.error(
      "Failed to fetch account github_repo from Recoupable API:",
      error,
    );
    return null;
  }
}
