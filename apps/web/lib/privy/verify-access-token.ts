import "server-only";
import { getPrivyServerClient } from "@/lib/privy/server-client";

export type PrivyVerifiedAccessToken = {
  userId: string;
  appId: string;
  expiration: number;
};

type UnverifiedClaims = {
  aud?: string;
  iss?: string;
  exp?: number;
  sub?: string;
};

function decodeJwtPayloadUnsafe(token: string): UnverifiedClaims | undefined {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return undefined;
  try {
    const padded = parts[1].padEnd(
      parts[1].length + ((4 - (parts[1].length % 4)) % 4),
      "=",
    );
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as UnverifiedClaims;
  } catch {
    return undefined;
  }
}

export async function verifyPrivyAccessToken(
  accessToken: string,
): Promise<PrivyVerifiedAccessToken | undefined> {
  const client = getPrivyServerClient();
  if (!client) return undefined;

  try {
    const verified = await client.utils().auth().verifyAuthToken(accessToken);
    return {
      userId: verified.user_id,
      appId: verified.app_id,
      expiration: verified.expiration,
    };
  } catch (error) {
    const claims = decodeJwtPayloadUnsafe(accessToken);
    const now = Math.floor(Date.now() / 1000);
    console.error("[privy] verifyAuthToken failed", {
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
      tokenLength: accessToken.length,
      tokenAud: claims?.aud,
      tokenIss: claims?.iss,
      tokenExp: claims?.exp,
      tokenExpired: claims?.exp ? claims.exp < now : undefined,
      secondsUntilExpiry: claims?.exp ? claims.exp - now : undefined,
      configuredAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
      jwtVerificationKeyConfigured: Boolean(
        process.env.PRIVY_JWT_VERIFICATION_KEY,
      ),
    });
    return undefined;
  }
}
