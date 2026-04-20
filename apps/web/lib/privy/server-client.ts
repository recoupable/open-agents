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

  // PRIVY_JWT_VERIFICATION_KEY accepts either the raw PEM public key or
  // the same PEM base64-encoded (single line). Base64 avoids newline
  // handling quirks when pasted into env var UIs; raw PEM works too.
  const rawVerificationKey = process.env.PRIVY_JWT_VERIFICATION_KEY;
  const jwtVerificationKey = rawVerificationKey
    ? rawVerificationKey.includes("BEGIN PUBLIC KEY")
      ? rawVerificationKey
      : Buffer.from(rawVerificationKey, "base64").toString("utf8")
    : undefined;

  cachedClient = new PrivyClient({
    appId,
    appSecret,
    jwtVerificationKey,
  });
  return cachedClient;
}
