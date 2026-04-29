import "server-only";
import { errorResponse } from "@/lib/networking/error-response";
import { readBearerToken } from "@/lib/networking/read-bearer-token";
import {
  ensurePersonalRepo,
  type EnsurePersonalRepoResult,
} from "@/lib/recoupable/ensure-personal-repo";
import { fetchAccountOrgs } from "@/lib/recoupable/fetch-account-orgs";
import { fetchOrCreateAccount } from "@/lib/recoupable/fetch-or-create-account";
import { getServerSession } from "@/lib/session/get-server-session";
import type { Session } from "@/lib/session/types";

export type ValidatedCreatePersonalSession = {
  session: Session;
  repo: EnsurePersonalRepoResult;
};

/**
 * Performs every early-bail check and side-effect required before the
 * personal-session handler can persist a row:
 *
 *   1. Verifies the caller is authenticated (open-agents session) and
 *      has an email on the JWT.
 *   2. Reads the Privy access token from the request's `Authorization`
 *      header — supplied by the client via Privy SDK's
 *      `getAccessToken()` — and uses it to call recoup-api on the
 *      user's behalf. Avoids reaching into the privy-token cookie.
 *   3. Server-side guard: refuses callers who already belong to one or
 *      more Recoupable organizations (those should use the standard
 *      `/api/sessions` flow).
 *   4. Idempotently provisions the recoup-api account + GitHub repo.
 *
 * Returns a `Response` for any failure path so callers can short-circuit,
 * or the validated `{ session, repo }` ready for `createSessionWithInitialChat`.
 */
export async function validateCreatePersonalSession(
  req: Request,
): Promise<Response | ValidatedCreatePersonalSession> {
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

  const accessToken = readBearerToken(req);
  if (!accessToken) {
    return errorResponse(401, "Missing Authorization: Bearer <token> header");
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
