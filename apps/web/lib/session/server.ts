import "server-only";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { fetchPrivyUserProfile } from "@/lib/privy/fetch-user-profile";
import { verifyPrivyAccessToken } from "@/lib/privy/verify-access-token";
import { SESSION_COOKIE_NAME } from "./constants";
import type { Session } from "./types";

async function findOrCreatePrivyUser(privyUserId: string): Promise<{
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}> {
  const existing = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(and(eq(users.provider, "privy"), eq(users.externalId, privyUserId)))
    .limit(1);

  if (existing[0]) return existing[0];

  const profile = await fetchPrivyUserProfile(privyUserId);
  const username = profile?.email ?? privyUserId;
  const id = nanoid();
  const now = new Date();

  await db.insert(users).values({
    id,
    provider: "privy",
    externalId: privyUserId,
    username,
    email: profile?.email,
    name: profile?.name,
    avatarUrl: profile?.avatarUrl,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  });

  return {
    id,
    username,
    email: profile?.email ?? null,
    name: profile?.name ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
  };
}

export async function getSessionFromCookie(
  cookieValue?: string,
): Promise<Session | undefined> {
  if (!cookieValue) return undefined;

  const verified = await verifyPrivyAccessToken(cookieValue);
  if (!verified) return undefined;

  const user = await findOrCreatePrivyUser(verified.userId);

  return {
    created: verified.expiration * 1000,
    authProvider: "privy",
    accessToken: cookieValue,
    user: {
      id: user.id,
      username: user.username,
      email: user.email ?? undefined,
      avatar: user.avatarUrl ?? "",
      name: user.name ?? undefined,
    },
  };
}

export async function getSessionFromReq(
  req: NextRequest,
): Promise<Session | undefined> {
  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return getSessionFromCookie(cookieValue);
}
