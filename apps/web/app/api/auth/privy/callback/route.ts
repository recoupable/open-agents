import { type NextRequest } from "next/server";
import { verifyPrivyAccessToken } from "@/lib/privy/verify-access-token";
import { SESSION_COOKIE_NAME } from "@/lib/session/constants";

type RequestBody = {
  accessToken?: unknown;
};

const MAX_COOKIE_AGE_SECONDS = 30 * 24 * 60 * 60;

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

  const maxAgeSeconds = Math.min(
    MAX_COOKIE_AGE_SECONDS,
    Math.max(0, verified.expiration - Math.floor(Date.now() / 1000)),
  );
  const expires = new Date(Date.now() + maxAgeSeconds * 1000).toUTCString();
  const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";

  const response = Response.json({ ok: true }, { status: 200 });
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${accessToken}; Path=/; Max-Age=${maxAgeSeconds}; Expires=${expires}; HttpOnly; ${secure}SameSite=Lax`,
  );
  return response;
}
