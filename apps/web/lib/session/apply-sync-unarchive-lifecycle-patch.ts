import type { Session } from "@/lib/db/schema";

/**
 * Applies the lifecycle fields Recoup sets synchronously when unarchiving a session
 * (`api/lib/sessions/patchSessionByIdHandler` → `UNARCHIVE_LIFECYCLE_PATCH`).
 */
export function applySyncUnarchiveLifecyclePatch<T extends Session>(
  session: T,
): T {
  return {
    ...session,
    status: "running",
    lifecycleState: null,
    lifecycleError: null,
  };
}
