import { forwardToApi } from "@/lib/recoupable/forward-to-api";

export type ReconnectStatus =
  | "connected"
  | "expired"
  | "not_found"
  | "no_sandbox";

export type ReconnectResponse = {
  status: ReconnectStatus;
  hasSnapshot: boolean;
  /** Timestamp (ms) when sandbox expires. Only present when status is "connected". */
  expiresAt?: number;
  lifecycle: {
    serverTime: number;
    state: string | null;
    lastActivityAt: number | null;
    hibernateAfter: number | null;
    sandboxExpiresAt: number | null;
  };
};

/**
 * `GET /api/sandbox/reconnect` — live-probe the runtime sandbox and
 * report connected/expired/no_sandbox. Cut over to recoupable api:
 * this proxies to the api endpoint of the same path. The api owns
 * the probe, transient-vs-unavailable error classification,
 * sandbox_expires_at refresh from live SDK state, and the
 * lifecycle_state failed→active recovery on success.
 */
export function GET(req: Request): Promise<Response> {
  return forwardToApi(req, "/api/sandbox/reconnect");
}
