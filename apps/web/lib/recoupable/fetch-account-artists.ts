import { z } from "zod";
import { getRecoupApiBaseUrl } from "./get-recoup-api-base-url";

const artistSchema = z.object({
  account_id: z.string(),
  name: z.string(),
  image: z.string().nullable().optional(),
  pinned: z.boolean().optional(),
});

const artistsResponseSchema = z.object({
  status: z.literal("success"),
  artists: z.array(artistSchema),
});

export type RecoupableArtist = z.infer<typeof artistSchema>;

/**
 * Fetches the list of artists from the Recoupable API
 * (`GET /api/artists`) using the caller's Privy access token. Mirrors
 * `fetchAccountOrgs`: returns an empty array on missing token, transport
 * failure, non-OK response, or invalid response shape so callers can
 * treat "no artists yet" and "couldn't reach the artists endpoint"
 * uniformly. Used during personal-session bootstrap to decide whether
 * to scaffold a first artist or sync existing ones.
 */
export async function fetchAccountArtists(
  accessToken: string,
): Promise<RecoupableArtist[]> {
  if (!accessToken) {
    console.warn("[fetchAccountArtists] accessToken is empty");
    return [];
  }

  try {
    const baseUrl = await getRecoupApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/artists`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.error(
        `Recoupable API returned ${response.status} when fetching artists`,
      );
      return [];
    }

    const parsed = artistsResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      console.error("Recoupable API returned an invalid artists response");
      return [];
    }

    return parsed.data.artists;
  } catch (error) {
    console.error("Failed to fetch artists from Recoupable API:", error);
    return [];
  }
}
