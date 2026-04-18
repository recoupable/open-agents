import "server-only";
import { PrivyClient } from "@privy-io/node";
import {
  getPrivyAppId,
  getPrivyAppSecret,
  getPrivyJwtVerificationKey,
} from "@/lib/privy/config";

let cachedClient: PrivyClient | undefined;

export function getPrivyClient(): PrivyClient | undefined {
  if (cachedClient) return cachedClient;

  const appId = getPrivyAppId();
  const appSecret = getPrivyAppSecret();
  if (!(appId && appSecret)) return undefined;

  cachedClient = new PrivyClient({
    appId,
    appSecret,
    jwtVerificationKey: getPrivyJwtVerificationKey(),
  });
  return cachedClient;
}
