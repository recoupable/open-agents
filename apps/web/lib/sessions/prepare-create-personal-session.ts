import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session/constants";
import { getServerSession } from "@/lib/session/get-server-session";
import type { Session } from "@/lib/session/types";
import { fetchAccountOrgs } from "@/lib/recoupable/fetch-account-orgs";
import { fetchOrCreateAccount } from "@/lib/recoupable/fetch-or-create-account";
import {
  ensurePersonalRepo,
  type EnsurePersonalRepoResult,
} from "@/lib/recoupable/ensure-personal-repo";

export type PreparedCreatePersonalSession = {
  session: Session;
  repo: EnsurePersonalRepoResult;
};

function errorResponse(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Performs every early-bail check and side-effect required before the
 * personal-session handler can persist a row:
 *
 *   1. Verifies the caller is authenticated and has an email on the JWT.
 *   2. Server-side guard: refuses callers who already belong to one or
 *      more Recoupable organizations (those should use the standard
 *      `/api/sessions` flow). Closes the door against direct curl calls
 *      that bypass the client-side empty-orgs detection.
 *   3. Idempotently provisions the recoup-api account + GitHub repo.
 *
 * Returns a `Response` for any failure path so callers can short-circuit,
 * or the validated `{ session, repo }` ready for `createSessionWithInitialChat`.
 */
export async function prepareCreatePersonalSession(): Promise<
  Response | PreparedCreatePersonalSession
> {
  const session = await getServerSession();
  if (!session?.user) {
    return errorResponse(401, "Not authenticated");
  }

  const email = session.user.email;
  if (!email) {
    return errorResponse(
      400,
      "Authenticated session is missing an email address",
    );
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!accessToken) {
    return errorResponse(401, "Not authenticated");
  }

  const orgs = await fetchAccountOrgs(accessToken);
  if (orgs.length > 0) {
    return errorResponse(
      409,
      "Account belongs to one or more organizations; use POST /api/sessions",
    );
  }

  const account = await fetchOrCreateAccount(email);
  if (!account) {
    return errorResponse(502, "Failed to provision Recoupable account");
  }

  const repo = await ensurePersonalRepo({
    accountName: account.name,
    accountId: account.accountId,
  });
  if (!repo) {
    return errorResponse(502, "Failed to provision personal repository");
  }

  return { session, repo };
}
