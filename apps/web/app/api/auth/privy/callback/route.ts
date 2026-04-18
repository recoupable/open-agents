import { type NextRequest } from "next/server";
import { upsertUser } from "@/lib/db/users";
import { encryptJWE } from "@/lib/jwe/encrypt";
import { fetchPrivyUserProfile } from "@/lib/privy/fetch-user-profile";
import { verifyPrivyAccessToken } from "@/lib/privy/verify-access-token";
import { SESSION_COOKIE_NAME } from "@/lib/session/constants";

type RequestBody = {
  accessToken?: unknown;
};

export async function POST(req: NextRequest): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const accessToken = body.accessToken;
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    return Response.json({ error: "accessToken is required" }, { status: 400 });
  }

  const verified = await verifyPrivyAccessToken(accessToken);
  if (!verified) {
    return Response.json(
      { error: "Invalid or unverifiable Privy access token" },
      { status: 401 },
    );
  }

  const profile = await fetchPrivyUserProfile(verified.userId);
  const username = profile?.email ?? verified.userId;

  const userId = await upsertUser({
    provider: "privy",
    externalId: verified.userId,
    username,
    email: profile?.email,
    name: profile?.name,
    avatarUrl: profile?.avatarUrl,
  });

  const session = {
    created: Date.now(),
    authProvider: "privy" as const,
    user: {
      id: userId,
      username,
      email: profile?.email,
      name: profile?.name ?? username,
      avatar: profile?.avatarUrl ?? "",
    },
  };

  const sessionToken = await encryptJWE(session, "1y");
  const maxAgeSeconds = 365 * 24 * 60 * 60;
  const expires = new Date(Date.now() + maxAgeSeconds * 1000).toUTCString();

  const response = Response.json({ ok: true }, { status: 200 });
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${maxAgeSeconds}; Expires=${expires}; HttpOnly; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}SameSite=Lax`,
  );
  return response;
}
