import type { RecoupableArtist } from "@/lib/recoupable/fetch-account-artists";

/**
 * Builds the auto-submitted first user message for a brand-new personal
 * session. The personal repo was just provisioned (so `artists/` is
 * guaranteed empty), and we branch on whether the recoup-api account
 * already has artists:
 *
 *   - 0 artists → ask the agent to scaffold the first one.
 *   - ≥1 artists → ask the agent to fetch artists via recoup-api docs
 *     and sync them into the workspace.
 */

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

  return [
    "I just signed up and already have artists in my Recoup account.",
    "Use the `recoup-api` skill and the API docs to call GET /api/artists (paginate as needed),",
    "then use the `artist-workspace` skill to scaffold local files for each artist.",
  ].join(" ");
}
