import { afterEach, describe, expect, mock, test } from "bun:test";
import type { Session } from "@/lib/db/schema";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "sess-1",
    userId: "user-1",
    title: "Test",
    status: "running",
    repoOwner: null,
    repoName: null,
    branch: null,
    cloneUrl: null,
    isNewBranch: false,
    globalSkillRefs: [],
    sandboxState: null,
    lifecycleState: "active",
    lifecycleVersion: 0,
    lastActivityAt: null,
    sandboxExpiresAt: null,
    hibernateAfter: null,
    lifecycleRunId: null,
    lifecycleError: null,
    linesAdded: 0,
    linesRemoved: 0,
    snapshotUrl: null,
    snapshotCreatedAt: null,
    snapshotSizeBytes: null,
    cachedDiff: null,
    cachedDiffUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("patchOwnSession", () => {
  test("retries unarchive on 409 until success", async () => {
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls += 1;
      if (calls < 3) {
        return new Response(
          JSON.stringify({
            status: "error",
            error: "Sandbox is still being paused, try again in a few seconds.",
          }),
          { status: 409 },
        );
      }
      return new Response(
        JSON.stringify({ session: mockSession({ status: "running" }) }),
        { status: 200 },
      );
    }) as typeof fetch;

    const { patchOwnSession } = await import("./patch-own-session");
    const session = await patchOwnSession(
      "sess-1",
      { status: "running" },
      "token",
    );

    expect(calls).toBe(3);
    expect(session.status).toBe("running");
  });

  test("does not retry archive on 409", async () => {
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls += 1;
      return new Response(
        JSON.stringify({ status: "error", error: "conflict" }),
        { status: 409 },
      );
    }) as typeof fetch;

    const { patchOwnSession } = await import("./patch-own-session");

    await expect(
      patchOwnSession("sess-1", { status: "archived" }, "token"),
    ).rejects.toThrow("conflict");
    expect(calls).toBe(1);
  });
});
