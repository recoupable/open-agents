import { recoupApiBaseUrlFromVercelEnv } from "./recoup-api-urls";

let clientCachedBaseUrl: string | null = null;
let clientInflight: Promise<string> | null = null;

/**
 * Resolves the Recoup API origin for this deployment.
 *
 * On the server, uses `VERCEL_ENV` (same signal as `app/layout.tsx`).
 * In the browser, `VERCEL_ENV` is not available — fetches
 * `GET /api/recoupable/config` once and caches the result.
 */
export async function getRecoupApiBaseUrl(): Promise<string> {
  if (typeof window === "undefined") {
    return recoupApiBaseUrlFromVercelEnv(process.env.VERCEL_ENV);
  }

  if (clientCachedBaseUrl) {
    return clientCachedBaseUrl;
  }

  if (!clientInflight) {
    clientInflight = fetch("/api/recoupable/config", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to resolve Recoup API base URL (${response.status})`,
          );
        }
        const data = (await response.json()) as { recoupApiBaseUrl: string };
        if (!data.recoupApiBaseUrl) {
          throw new Error("Recoup API config response missing recoupApiBaseUrl");
        }
        clientCachedBaseUrl = data.recoupApiBaseUrl;
        return data.recoupApiBaseUrl;
      })
      .finally(() => {
        clientInflight = null;
      });
  }

  return clientInflight;
}
