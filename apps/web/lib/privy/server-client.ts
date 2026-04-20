import "server-only";
import { PrivyClient } from "@privy-io/node";

let cachedClient: PrivyClient | undefined;
let warnedMissingConfig = false;

export function getPrivyServerClient(): PrivyClient | undefined {
  if (cachedClient) return cachedClient;

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!(appId && appSecret)) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.error(
        "[privy] server auth disabled — missing env vars:",
        !appId && "NEXT_PUBLIC_PRIVY_APP_ID",
        !appSecret && "PRIVY_APP_SECRET",
      );
    }
    return undefined;
  }

  const encodedVerificationKey = process.env.PRIVY_JWT_VERIFICATION_KEY;
  const jwtVerificationKey = encodedVerificationKey
    ? Buffer.from(encodedVerificationKey, "base64").toString("utf8")
    : undefined;

  cachedClient = new PrivyClient({
    appId,
    appSecret,
    jwtVerificationKey,
  });
  return cachedClient;
}
