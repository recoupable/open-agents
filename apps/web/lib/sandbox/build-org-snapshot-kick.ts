import "server-only";

import { start } from "workflow/api";
import { buildOrgSnapshotWorkflow } from "@/app/workflows/build-org-snapshot";

interface KickBuildOrgSnapshotInput {
  cloneUrl: string;
  sandboxName: string;
}

/**
 * Fire-and-forget kick of the build-org-snapshot workflow. Failures are logged
 * but never surfaced — the caller always falls back to the full-clone path.
 */
export function kickBuildOrgSnapshotWorkflow(input: KickBuildOrgSnapshotInput) {
  void start(buildOrgSnapshotWorkflow, [input]).then(
    (run) =>
      console.log(
        `[build-org-snapshot] Started workflow run ${run.runId} for '${input.sandboxName}' (${input.cloneUrl})`,
      ),
    (error) =>
      console.error(
        `[build-org-snapshot] Failed to start workflow for '${input.sandboxName}' (${input.cloneUrl}):`,
        error,
      ),
  );
}
