import { connectSandbox } from "@open-harness/sandbox";
import { gateway, generateText } from "ai";
import { getSessionById } from "@/lib/db/sessions";
import {
  enforceRateLimit,
  RATE_LIMITS,
  withRateLimitHeaders,
} from "@/lib/rate-limit";
import { isSandboxActive } from "@/lib/sandbox/utils";
import { getServerSession } from "@/lib/session/get-server-session";

export const maxDuration = 30;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getServerSession();
  if (!session?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limit = await enforceRateLimit(
    req,
    RATE_LIMITS.generateCommitMessage,
    session.user.id,
  );
  if (!limit.ok) return limit.response;

  const { sessionId } = await params;
  const dbSession = await getSessionById(sessionId);
  if (!dbSession || dbSession.userId !== session.user.id) {
    return withRateLimitHeaders(
      Response.json({ error: "Session not found" }, { status: 404 }),
      limit.headers,
    );
  }

  if (!isSandboxActive(dbSession.sandboxState)) {
    return withRateLimitHeaders(
      Response.json({ error: "No active sandbox" }, { status: 400 }),
      limit.headers,
    );
  }

  const sandbox = await connectSandbox(dbSession.sandboxState);
  const cwd = sandbox.workingDirectory;

  // Get the diff for commit message generation
  const diffResult = await sandbox.exec(
    "git diff HEAD --stat && echo '---DIFF---' && git diff HEAD",
    cwd,
    30000,
  );

  const diff = diffResult.stdout;
  if (!diff.trim() || !diff.includes("---DIFF---")) {
    return withRateLimitHeaders(
      Response.json({ message: "chore: update repository changes" }),
      limit.headers,
    );
  }

  const result = await generateText({
    model: gateway("anthropic/claude-haiku-4.5"),
    prompt: `Generate a concise git commit message for these changes. Use conventional commit format (e.g., "feat:", "fix:", "refactor:"). One line only, max 72 characters.

Session context: ${dbSession.title}

Diff:
${diff.slice(0, 8000)}

Respond with ONLY the commit message, nothing else.`,
  });

  const generated = result.text.trim().split("\n")[0]?.trim();
  const message =
    generated && generated.length > 0
      ? generated.slice(0, 72)
      : "chore: update repository changes";

  return withRateLimitHeaders(Response.json({ message }), limit.headers);
}