import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";
import { users } from "./schema";

/**
 * Check if a user exists in the database by ID.
 * Returns true if found, false otherwise. Lightweight query (only fetches the ID).
 */
export async function userExists(userId: string): Promise<boolean> {
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result.length > 0;
}

export async function upsertUser(userData: {
  provider: "privy";
  externalId: string;
  username: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}): Promise<string> {
  const { provider, externalId } = userData;

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.provider, provider), eq(users.externalId, externalId)))
    .limit(1);

  if (existingUser.length > 0 && existingUser[0]) {
    await db
      .update(users)
      .set({
        username: userData.username,
        email: userData.email,
        name: userData.name,
        avatarUrl: userData.avatarUrl,
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, existingUser[0].id));
    return existingUser[0].id;
  }

  const userId = nanoid();
  const now = new Date();
  await db.insert(users).values({
    id: userId,
    ...userData,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  });
  return userId;
}
