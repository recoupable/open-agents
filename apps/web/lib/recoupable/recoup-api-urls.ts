export const RECOUP_API_PRODUCTION_BASE_URL = "https://recoup-api.vercel.app";
export const RECOUP_API_TEST_BASE_URL = "https://test-recoup-api.vercel.app";

export function recoupApiBaseUrlFromVercelEnv(
  vercelEnv: string | undefined,
): string {
  return vercelEnv === "production"
    ? RECOUP_API_PRODUCTION_BASE_URL
    : RECOUP_API_TEST_BASE_URL;
}
