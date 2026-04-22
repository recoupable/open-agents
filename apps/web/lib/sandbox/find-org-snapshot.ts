import "server-only";

import { Snapshot } from "@vercel/sandbox";

/**
 * Finds the most recent `created` snapshot whose source sandbox name matches
 * `sandboxName`. Used to look up per-org base snapshots built by the
 * build-org-snapshot workflow.
 *
 * Returns the snapshot id, or `null` if no ready snapshot exists yet.
 */
export async function findOrgSnapshot(
  sandboxName: string,
): Promise<string | null> {
  try {
    const result = await Snapshot.list({
      name: sandboxName,
      sortOrder: "desc",
      limit: 5,
    });
    const ready = result.snapshots.find((s) => s.status === "created");
    return ready?.id ?? null;
  } catch (error) {
    console.error(
      `[find-org-snapshot] Failed to list snapshots for '${sandboxName}':`,
      error,
    );
    return null;
  }
}
