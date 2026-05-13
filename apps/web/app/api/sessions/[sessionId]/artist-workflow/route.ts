import path from "node:path";
import { connectSandbox } from "@open-harness/sandbox";
import {
  requireAuthenticatedUser,
  requireOwnedSessionWithSandboxGuard,
} from "@/app/api/sessions/_lib/session-context";
import type { ArtistWorkflowArtistPayload } from "@/lib/artist-workflow/api-types";
import {
  ARTIST_WORKFLOW_MAX_STEPS,
  extractRecoupTitle,
  parseRecoupChecklistSteps,
} from "@/lib/artist-workflow/parse-recoup-checklist";
import { updateSession } from "@/lib/db/sessions";
import { buildHibernatedLifecycleUpdate } from "@/lib/sandbox/lifecycle";
import {
  clearUnavailableSandboxState,
  hasRuntimeSandboxState,
  isSandboxUnavailableError,
} from "@/lib/sandbox/utils";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

const MAX_ARTISTS_SCAN = 12;

export async function GET(_req: Request, context: RouteContext) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { sessionId } = await context.params;

  const sessionContext = await requireOwnedSessionWithSandboxGuard({
    userId: authResult.userId,
    sessionId,
    sandboxGuard: hasRuntimeSandboxState,
    sandboxErrorMessage: "Sandbox not initialized",
  });
  if (!sessionContext.ok) {
    return sessionContext.response;
  }

  const { sessionRecord } = sessionContext;
  const sandboxState = sessionRecord.sandboxState;
  if (!sandboxState) {
    return Response.json({ error: "Sandbox not initialized" }, { status: 400 });
  }

  try {
    const sandbox = await connectSandbox(sandboxState);
    const cwd = sandbox.workingDirectory;
    const artistsDir = path.posix.join(cwd, "artists");

    let stat;
    try {
      stat = await sandbox.stat(artistsDir);
    } catch {
      return Response.json({
        artists: [] as ArtistWorkflowArtistPayload[],
        scannedAt: new Date().toISOString(),
      });
    }

    if (!stat.isDirectory()) {
      return Response.json({
        artists: [] as ArtistWorkflowArtistPayload[],
        scannedAt: new Date().toISOString(),
      });
    }

    const entries = await sandbox.readdir(artistsDir, { withFileTypes: true });
    const slugs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => !name.startsWith("."))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, MAX_ARTISTS_SCAN);

    const artists: ArtistWorkflowArtistPayload[] = [];

    for (const slug of slugs) {
      const recoupPath = path.posix.join("artists", slug, "RECOUP.md");
      const absolutePath = path.posix.join(artistsDir, slug, "RECOUP.md");
      let raw: string;
      try {
        raw = await sandbox.readFile(absolutePath, "utf-8");
      } catch {
        continue;
      }

      const steps = parseRecoupChecklistSteps(raw);
      if (steps.length === 0) {
        continue;
      }

      const completedCount = steps.filter((s) => s.done).length;
      const titleFromFile = extractRecoupTitle(raw);

      artists.push({
        slug,
        recoupRelativePath: recoupPath,
        displayTitle: titleFromFile ?? slug,
        steps,
        completedCount,
        totalSteps: Math.min(steps.length, ARTIST_WORKFLOW_MAX_STEPS),
      });
    }

    return Response.json({
      artists,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isSandboxUnavailableError(message)) {
      await updateSession(sessionId, {
        sandboxState: clearUnavailableSandboxState(
          sessionRecord.sandboxState,
          message,
        ),
        ...buildHibernatedLifecycleUpdate(),
      });
      return Response.json(
        { error: "Sandbox is unavailable. Please resume sandbox." },
        { status: 409 },
      );
    }
    console.error("artist-workflow scan failed:", error);
    return Response.json(
      { error: "Failed to read artist workflow from sandbox" },
      { status: 500 },
    );
  }
}
