"use client";

import { useParams, useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { InboxSidebar } from "@/components/inbox-sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useBackgroundChatNotifications } from "@/hooks/use-background-chat-notifications";
import { useSessions, type SessionWithUnread } from "@/hooks/use-sessions";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { DEFAULT_SANDBOX_TYPE } from "@/components/sandbox-selector-compact";
import { toast } from "sonner";
import type { Chat, Session as DbSession } from "@/lib/db/schema";
import type { Session as AuthSession } from "@/lib/session/types";
import { SessionsShellProvider } from "./sessions-shell-context";

type SessionsRouteShellProps = {
  children: ReactNode;
  currentUser: AuthSession["user"];
  initialSessionsData?: {
    sessions: SessionWithUnread[];
    archivedCount: number;
  };
};

const RouteContentShell = memo(function RouteContentShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarInset className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {children}
    </SidebarInset>
  );
});

export function SessionsRouteShell({
  children,
  currentUser,
  initialSessionsData,
}: SessionsRouteShellProps) {
  const router = useRouter();
  const params = useParams<{ sessionId?: string }>();
  const routeSessionId =
    typeof params.sessionId === "string" ? params.sessionId : null;
  const [optimisticActiveSessionId, setOptimisticActiveSessionId] = useState<
    string | null
  >(null);
  const [isNavigating, startNavigationTransition] = useTransition();
  const prefetchedSessionHrefsRef = useRef(new Set<string>());

  const {
    sessions,
    archivedCount,
    loading: sessionsLoading,
    createSession,
    renameSession,
    archiveSession,
    unarchiveSession,
  } = useSessions({
    enabled: true,
    includeArchived: false,
    initialData: initialSessionsData,
  });

  const getSessionHref = useCallback((targetSession: SessionWithUnread) => {
    if (targetSession.latestChatId) {
      return `/sessions/${targetSession.id}/chats/${targetSession.latestChatId}`;
    }

    return `/sessions/${targetSession.id}`;
  }, []);

  const { preferences } = useUserPreferences();

  const [isCreatingBlank, setIsCreatingBlank] = useState(false);
  const createBlankSession = useCallback(
    async (cloneUrl: string) => {
      if (isCreatingBlank) return;
      setIsCreatingBlank(true);
      try {
        const { session: created, chat } = await createSession({
          cloneUrl,
          isNewBranch: false,
          sandboxType: preferences?.defaultSandboxType ?? DEFAULT_SANDBOX_TYPE,
          autoCommitPush: preferences?.autoCommitPush ?? false,
          autoCreatePr: preferences?.autoCreatePr ?? false,
        });
        router.push(`/sessions/${created.id}/chats/${chat.id}`);
      } catch (error) {
        console.error("Failed to create new session:", error);
      } finally {
        setIsCreatingBlank(false);
      }
    },
    [createSession, isCreatingBlank, preferences, router],
  );

  const [isCreatingPersonal, setIsCreatingPersonal] = useState(false);
  const createPersonalSession = useCallback(async () => {
    if (isCreatingPersonal) return;
    setIsCreatingPersonal(true);
    try {
      const res = await fetch("/api/sessions/personal", { method: "POST" });
      const data = (await res.json()) as {
        session?: DbSession;
        chat?: Chat;
        error?: string;
      };
      if (!res.ok || !data.session || !data.chat) {
        const message = data.error ?? "Failed to start your first session";
        toast.error(message);
        return;
      }
      router.push(`/sessions/${data.session.id}/chats/${data.chat.id}`);
    } catch (error) {
      console.error("Failed to create personal session:", error);
      toast.error("Failed to start your first session");
    } finally {
      setIsCreatingPersonal(false);
    }
  }, [isCreatingPersonal, router]);

  const handleSessionClick = useCallback(
    (targetSession: SessionWithUnread) => {
      if (targetSession.id === (optimisticActiveSessionId ?? routeSessionId)) {
        return;
      }

      const href = getSessionHref(targetSession);
      prefetchedSessionHrefsRef.current.add(href);
      setOptimisticActiveSessionId(targetSession.id);
      startNavigationTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [
      getSessionHref,
      optimisticActiveSessionId,
      routeSessionId,
      router,
      startNavigationTransition,
    ],
  );

  const handleSessionPrefetch = useCallback(
    (targetSession: SessionWithUnread) => {
      const href = getSessionHref(targetSession);
      if (prefetchedSessionHrefsRef.current.has(href)) {
        return;
      }

      prefetchedSessionHrefsRef.current.add(href);
      router.prefetch(href);
    },
    [getSessionHref, router],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      for (const session of sessions.slice(0, 6)) {
        const href = getSessionHref(session);
        if (prefetchedSessionHrefsRef.current.has(href)) {
          continue;
        }

        prefetchedSessionHrefsRef.current.add(href);
        router.prefetch(href);
      }
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [getSessionHref, router, sessions]);

  const handleRenameSession = useCallback(
    async (targetSessionId: string, title: string) => {
      await renameSession(targetSessionId, title);
    },
    [renameSession],
  );

  const handleArchiveSession = useCallback(
    async (targetSessionId: string) => {
      await archiveSession(targetSessionId);

      if (targetSessionId === routeSessionId) {
        setOptimisticActiveSessionId(null);
        startNavigationTransition(() => {
          router.push("/sessions", { scroll: false });
        });
      }
    },
    [archiveSession, routeSessionId, router, startNavigationTransition],
  );

  const handleUnarchiveSession = useCallback(
    async (targetSessionId: string) => {
      await unarchiveSession(targetSessionId);

      if (targetSessionId === routeSessionId) {
        window.location.reload();
      }
    },
    [routeSessionId, unarchiveSession],
  );

  useEffect(() => {
    if (
      optimisticActiveSessionId &&
      optimisticActiveSessionId === routeSessionId
    ) {
      setOptimisticActiveSessionId(null);
    }
  }, [optimisticActiveSessionId, routeSessionId]);

  const activeSessionId = optimisticActiveSessionId ?? routeSessionId ?? "";
  const pendingSessionId = isNavigating ? optimisticActiveSessionId : null;

  useBackgroundChatNotifications(sessions, routeSessionId, handleSessionClick, {
    alertsEnabled: preferences?.alertsEnabled ?? true,
    alertSoundEnabled: preferences?.alertSoundEnabled ?? true,
  });

  const shellContextValue = useMemo(
    () => ({
      createBlankSession,
      isCreatingBlank,
      createPersonalSession,
      isCreatingPersonal,
    }),
    [
      createBlankSession,
      createPersonalSession,
      isCreatingBlank,
      isCreatingPersonal,
    ],
  );

  return (
    <SessionsShellProvider value={shellContextValue}>
      <SidebarProvider
        className="h-dvh overflow-hidden"
        style={
          {
            "--sidebar-width": "20rem",
          } as CSSProperties
        }
      >
        <Sidebar collapsible="offcanvas" className="border-r border-border">
          <SidebarContent className="bg-muted/20">
            <InboxSidebar
              sessions={sessions}
              archivedCount={archivedCount}
              sessionsLoading={sessionsLoading}
              activeSessionId={activeSessionId}
              pendingSessionId={pendingSessionId}
              onSessionClick={handleSessionClick}
              onSessionPrefetch={handleSessionPrefetch}
              onRenameSession={handleRenameSession}
              onArchiveSession={handleArchiveSession}
              onUnarchiveSession={handleUnarchiveSession}
              onOpenNewSession={() => router.push("/sessions")}
              initialUser={currentUser}
            />
          </SidebarContent>
        </Sidebar>
        <RouteContentShell>{children}</RouteContentShell>
      </SidebarProvider>
    </SessionsShellProvider>
  );
}
