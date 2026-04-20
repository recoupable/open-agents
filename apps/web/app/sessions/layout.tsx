import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  getArchivedSessionCountByUserId,
  getSessionsWithUnreadByUserId,
} from "@/lib/db/sessions";
import { getServerSession } from "@/lib/session/get-server-session";
import { SessionsRouteShell } from "./sessions-route-shell";

type SessionsLayoutProps = {
  children: ReactNode;
};

export default async function SessionsLayout({
  children,
}: SessionsLayoutProps) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/");
  }

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
