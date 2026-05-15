"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";
import type { Chat, Session } from "@/lib/db/schema";
import { patchOwnedSession } from "@/lib/session/patch-owned-session-client";
import { fetcher } from "@/lib/swr";

export type SessionWithUnread = Pick<
  Session,
  | "id"
  | "title"
  | "status"
  | "repoOwner"
  | "repoName"
  | "branch"
  | "linesAdded"
  | "linesRemoved"
  | "createdAt"
> & {
  hasUnread: boolean;
  hasStreaming: boolean;
  latestChatId: string | null;
  lastActivityAt: Session["createdAt"];
};

interface CreateSessionInput {
  title?: string;
  repoOwner?: string;
  repoName?: string;
  branch?: string;
  cloneUrl?: string;
  isNewBranch: boolean;
  sandboxType: "vercel";
  autoCommitPush: boolean;
  autoCreatePr: boolean;
}

interface SessionsResponse {
  sessions: SessionWithUnread[];
  archivedCount?: number;
}

interface CreateSessionResponse {
  session: Session;
  chat: Chat;
}

function cloneSessionsResponse(
  current: SessionsResponse | undefined,
): SessionsResponse | undefined {
  if (!current) {
    return undefined;
  }

  return {
    sessions: current.sessions.map((session) => ({ ...session })),
    archivedCount: current.archivedCount,
  };
}

function mergeSessionWithSummary(
  session: SessionWithUnread,
  updatedSession: Session,
): SessionWithUnread {
  return {
    id: updatedSession.id,
    title: updatedSession.title,
    status: updatedSession.status,
    repoOwner: updatedSession.repoOwner,
    repoName: updatedSession.repoName,
    branch: updatedSession.branch,
    linesAdded: updatedSession.linesAdded,
    linesRemoved: updatedSession.linesRemoved,
    createdAt: updatedSession.createdAt,
    hasUnread: session.hasUnread,
    hasStreaming: session.hasStreaming,
    latestChatId: session.latestChatId,
    lastActivityAt: session.lastActivityAt,
  };
}

export function useSessions(options?: {
  enabled?: boolean;
  includeArchived?: boolean;
  initialData?: SessionsResponse;
}) {
  const enabled = options?.enabled ?? true;
  const includeArchived = options?.includeArchived ?? true;
  const sessionsEndpoint = includeArchived
    ? "/api/sessions"
    : "/api/sessions?status=active";

  const initialData = options?.initialData;
  const { getAccessToken } = usePrivy();

  const { data, error, isLoading, mutate } = useSWR<SessionsResponse>(
    enabled ? "/api/sessions" : null,
    () => fetcher<SessionsResponse>(sessionsEndpoint),
    {
      fallbackData: initialData,
      revalidateOnMount: initialData ? false : undefined,
      refreshInterval: (latestData) => {
        const hasStreamingSession = latestData?.sessions.some(
          (s) => s.hasStreaming,
        );
        // Poll quickly while any session is streaming so we detect
        // completion promptly for background-chat notifications.
        // Otherwise poll every 30s to pick up external changes like
        // PR merges delivered via GitHub webhooks.
        return hasStreamingSession ? 3_000 : 30_000;
      },
    },
  );
  const { mutate: globalMutate } = useSWRConfig();

  useEffect(() => {
    if (!enabled || !initialData) {
      return;
    }

    void mutate((current) => current ?? initialData, { revalidate: false });
  }, [enabled, initialData, mutate]);

  const sessions = data?.sessions ?? [];
  const archivedCount = data?.archivedCount ?? 0;

  const createSession = useCallback(
    async (input: CreateSessionInput) => {
      const previousData = cloneSessionsResponse(data);

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const responseData = (await res.json()) as {
        session?: Session;
        chat?: Chat;
        error?: string;
        message?: string;
      };

      if (!res.ok || !responseData.session || !responseData.chat) {
        const message =
          responseData.error ??
          responseData.message ??
          "Failed to create session";
        toast.error(message);
        throw new Error(message);
      }

      const createdSession = responseData.session;
      const createdChat = responseData.chat;

      void globalMutate(
        `/api/sessions/${createdSession.id}/chats`,
        {
          chats: [
            {
              ...createdChat,
              hasUnread: false,
              isStreaming: false,
            },
          ],
          defaultModelId: createdChat.modelId,
        },
        { revalidate: false },
      );

      await mutate(
        (current) => {
          const source = current ?? previousData;

          return {
            sessions: [
              {
                ...createdSession,
                hasUnread: false,
                hasStreaming: false,
                latestChatId: createdChat.id,
                lastActivityAt: createdChat.updatedAt,
              },
              ...(source?.sessions ?? []),
            ],
            archivedCount: source?.archivedCount,
          };
        },
        { revalidate: false },
      );

      return {
        session: createdSession,
        chat: createdChat,
      } satisfies CreateSessionResponse;
    },
    [data, globalMutate, mutate],
  );

  const renameSession = useCallback(
    async (sessionId: string, title: string) => {
      const previousData = cloneSessionsResponse(data);

      await mutate(
        (current) => {
          const source = current ?? previousData;
          if (!source) {
            return source;
          }

          return {
            ...source,
            sessions: source.sessions.map((session) =>
              session.id === sessionId ? { ...session, title } : session,
            ),
          };
        },
        { revalidate: false },
      );

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("Not authenticated");
        }

        const updatedSession = await patchOwnedSession(
          sessionId,
          { title },
          accessToken,
        );

        await mutate(
          (current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              sessions: current.sessions.map((session) =>
                session.id === sessionId
                  ? mergeSessionWithSummary(session, updatedSession)
                  : session,
              ),
            };
          },
          { revalidate: false },
        );

        return updatedSession;
      } catch (error) {
        if (previousData) {
          await mutate(previousData, { revalidate: false });
        } else {
          void mutate();
        }

        throw error;
      }
    },
    [data, getAccessToken, mutate],
  );

  const archiveSession = useCallback(
    async (sessionId: string) => {
      const previousData = cloneSessionsResponse(data);
      const sessionToArchive = previousData?.sessions.find(
        (session) => session.id === sessionId,
      );
      const hadSession = Boolean(sessionToArchive);
      const wasArchived = sessionToArchive?.status === "archived";

      await mutate(
        (current) => {
          const source = current ?? previousData;
          if (!source) {
            return source;
          }

          const nextArchivedCount =
            hadSession && !wasArchived
              ? (source.archivedCount ?? 0) + 1
              : source.archivedCount;

          if (!includeArchived) {
            return {
              ...source,
              sessions: source.sessions.filter(
                (session) => session.id !== sessionId,
              ),
              archivedCount: nextArchivedCount,
            };
          }

          return {
            ...source,
            archivedCount: nextArchivedCount,
            sessions: source.sessions.map((session) =>
              session.id === sessionId
                ? { ...session, status: "archived" }
                : session,
            ),
          };
        },
        { revalidate: false },
      );

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("Not authenticated");
        }

        const updatedSession = await patchOwnedSession(
          sessionId,
          { status: "archived" },
          accessToken,
        );

        if (includeArchived) {
          await mutate(
            (current) => {
              if (!current) {
                return current;
              }

              return {
                ...current,
                sessions: current.sessions.map((session) =>
                  session.id === sessionId
                    ? mergeSessionWithSummary(session, updatedSession)
                    : session,
                ),
              };
            },
            { revalidate: false },
          );
        }

        return updatedSession;
      } catch (error) {
        if (previousData) {
          await mutate(previousData, { revalidate: false });
        } else {
          void mutate();
        }

        throw error;
      }
    },
    [data, getAccessToken, includeArchived, mutate],
  );

  const unarchiveSession = useCallback(
    async (sessionId: string) => {
      const previousData = cloneSessionsResponse(data);
      const nextArchivedCount = Math.max(
        (previousData?.archivedCount ?? 0) - 1,
        0,
      );

      await mutate(
        (current) => {
          const source = current ?? previousData;
          if (!source) {
            return source;
          }

          return {
            ...source,
            archivedCount: nextArchivedCount,
            sessions: includeArchived
              ? source.sessions.map((session) =>
                  session.id === sessionId
                    ? { ...session, status: "running" }
                    : session,
                )
              : source.sessions,
          };
        },
        { revalidate: false },
      );

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("Not authenticated");
        }

        const updatedSession = await patchOwnedSession(
          sessionId,
          { status: "running" },
          accessToken,
        );

        if (includeArchived) {
          await mutate(
            (current) => {
              if (!current) {
                return current;
              }

              return {
                ...current,
                sessions: current.sessions.map((session) =>
                  session.id === sessionId
                    ? mergeSessionWithSummary(session, updatedSession)
                    : session,
                ),
              };
            },
            { revalidate: false },
          );
        } else {
          await mutate();
        }

        return updatedSession;
      } catch (error) {
        if (previousData) {
          await mutate(previousData, { revalidate: false });
        } else {
          void mutate();
        }

        throw error;
      }
    },
    [data, getAccessToken, includeArchived, mutate],
  );

  return {
    sessions,
    archivedCount,
    loading: isLoading,
    error,
    createSession,
    renameSession,
    archiveSession,
    unarchiveSession,
    refreshSessions: mutate,
  };
}
