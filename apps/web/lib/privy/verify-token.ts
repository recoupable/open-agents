import "server-only";
import { getPrivyClient } from "@/lib/privy/client";

export type PrivyVerifiedClaims = {
  userId: string;
  appId: string;
  issuer: string;
  issuedAt: number;
  expiration: number;
};

export async function verifyPrivyAuthToken(
  authToken: string,
): Promise<PrivyVerifiedClaims | undefined> {
  const client = getPrivyClient();
  if (!client) return undefined;

  try {
    const verified = await client.utils().auth().verifyAuthToken(authToken);
    return {
      userId: verified.user_id,
      appId: verified.app_id,
      issuer: verified.issuer,
      issuedAt: verified.issued_at,
      expiration: verified.expiration,
    };
  } catch {
    return undefined;
  }
}
