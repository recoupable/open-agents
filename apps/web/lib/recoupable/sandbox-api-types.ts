/**
 * Response shapes returned by recoupable api's sandbox endpoints.
 * Kept in a client-safe module (no imports from `next/server`,
 * `server-only`, or DB code) so `"use client"` components can type
 * the responses they receive from `fetchRecoup` without dragging
 * server modules into the bundle.
 */

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
