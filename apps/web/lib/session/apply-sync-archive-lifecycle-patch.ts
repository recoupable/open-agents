import type { Session } from "@/lib/db/schema";

/**
 * Applies the lifecycle fields Recoup sets synchronously when archiving a session
 * (`api/lib/sessions/patchSessionByIdHandler`). Sandbox stop/clear and snapshot
 * field nulling run afterward via `stopSandboxOnArchive` in the api process.
 */
export function applySyncArchiveLifecyclePatch<T extends Session>(session: T): T {
  return {
    ...session,
    status: "archived",
    lifecycleState: "archived",
    lifecycleError: null,
    lifecycleRunId: null,
    sandboxExpiresAt: null,
    hibernateAfter: null,
  };
}
