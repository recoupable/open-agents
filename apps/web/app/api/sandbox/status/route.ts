import { forwardToApi } from "@/lib/recoupable/forward-to-api";

export type SandboxStatusResponse = {
  status: "active" | "no_sandbox";
  hasSnapshot: boolean;
  lifecycleVersion: number;
  lifecycle: {
    serverTime: number;
    state: string | null;
    lastActivityAt: number | null;
    hibernateAfter: number | null;
    sandboxExpiresAt: number | null;
  };
};

/**
 * `GET /api/sandbox/status` — read sandbox + lifecycle state for a
 * session. Cut over to recoupable api: this proxies to the api
 * endpoint of the same path. The api owns isSandboxActive,
 * failed-state self-heal, hasSnapshot derivation (snapshot_url OR
 * hibernated-with-resumable-name), and the status-check-overdue
 * lifecycle kick.
 */
export function GET(req: Request): Promise<Response> {
  return forwardToApi(req, "/api/sandbox/status");
}
