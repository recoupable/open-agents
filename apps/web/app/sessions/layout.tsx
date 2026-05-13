import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  getArchivedSessionCountByUserId,
  getSessionsWithUnreadByUserId,
} from "@/lib/db/sessions";
import { getServerSessionResolution } from "@/lib/session/get-server-session";
import { AccountResolutionError } from "./account-resolution-error";
import { SessionsRouteShell } from "./sessions-route-shell";

type SessionsLayoutProps = {
  children: ReactNode;
};

export default async function SessionsLayout({
  children,
}: SessionsLayoutProps) {
  const sessionResolution = await getServerSessionResolution();
  if (sessionResolution.status === "missing-cookie") {
    redirect("/");
  }

  if (sessionResolution.status === "invalid-token") {
    redirect("/");
  }

  if (sessionResolution.status === "account-resolution-failed") {
    console.warn("[sessions] rendering account resolution error", {
      privyUserId: sessionResolution.privyUserId,
    });
    return <AccountResolutionError />;
  }

  const { session } = sessionResolution;

  const [sessions, archivedCount] = await Promise.all([
    getSessionsWithUnreadByUserId(session.user.id, { status: "active" }),
    getArchivedSessionCountByUserId(session.user.id),
  ]);

  return (
    <SessionsRouteShell
      currentUser={session.user}
      initialSessionsData={{ sessions, archivedCount }}
    >
      {children}
    </SessionsRouteShell>
  );
}
