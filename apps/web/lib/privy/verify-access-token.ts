import "server-only";
import { getPrivyServerClient } from "@/lib/privy/server-client";

export type PrivyVerifiedAccessToken = {
  userId: string;
  appId: string;
  expiration: number;
};

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
    console.error(
      "[privy] verifyAuthToken failed:",
      error instanceof Error ? error.message : error,
    );
    return undefined;
  }
}
