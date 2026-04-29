import type { RecoupableArtist } from "@/lib/recoupable/fetch-account-artists";

/**
 * Builds the auto-submitted first user message for a brand-new personal
 * session. The personal repo was just provisioned (so `artists/` is
 * guaranteed empty), and we branch on the recoup-api artists list:
 *
 *   - 0 artists → ask the agent to scaffold a first one. Names the
 *     `artist-workspace` skill explicitly so the agent doesn't go
 *     fishing.
 *   - ≥1 artists → ask the agent to sync them locally. Names both
 *     `recoup-api` (to fetch each artist's details) and
 *     `artist-workspace` (to scaffold the local files).
 *
 * Cap the inline list at a small number to keep the prompt short; the
 * agent can fetch the full list itself via `recoup-api` if needed.
 */

const MAX_INLINE_ARTISTS = 8;

export function buildPersonalSessionBootstrapPrompt(
  artists: RecoupableArtist[],
): string {
  if (artists.length === 0) {
    return [
      "I just signed up and don't have any artists yet.",
      "Use the `artist-workspace` skill to scaffold my first artist.",
      "Ask me for the artist's name, then create the workspace files.",
    ].join(" ");
  }

  const named = artists.slice(0, MAX_INLINE_ARTISTS).map((a) => a.name);
  const overflow = artists.length - named.length;
  const list =
    overflow > 0 ? `${named.join(", ")} (+${overflow} more)` : named.join(", ");

  return [
    `I just signed up and have ${artists.length} artist${artists.length === 1 ? "" : "s"} in my Recoup account: ${list}.`,
    "Sync them to my local workspace:",
    "use the `recoup-api` skill to fetch each artist's details,",
    "then use the `artist-workspace` skill to scaffold the local files for each one.",
  ].join(" ");
}
