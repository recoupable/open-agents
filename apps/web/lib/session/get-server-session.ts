import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./constants";
import { getSessionFromCookie, getSessionResolutionFromCookie } from "./server";
import { cache } from "react";

export const getServerSession = cache(async () => {
  const store = await cookies();
  const cookieValue = store.get(SESSION_COOKIE_NAME)?.value;
  return getSessionFromCookie(cookieValue);
});

export const getServerSessionResolution = cache(async () => {
  const store = await cookies();
  const cookieValue = store.get(SESSION_COOKIE_NAME)?.value;
  return getSessionResolutionFromCookie(cookieValue);
});
