import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { createSandbox } from "./create-sandbox";

type FetchCall = { url: string; init?: RequestInit };
type FetchMock = ReturnType<typeof mock> & { calls: FetchCall[] };

function setupFetchMock(response: Partial<Response>): FetchMock {
  const calls: FetchCall[] = [];
  const fetchMock = mock((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({}),
      text: async () => "",
      ...response,
    } as Response);
  });
  (fetchMock as FetchMock).calls = calls;
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock as FetchMock;
}

describe("createSandbox", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
  });

  test("POSTs to recoup-api's /api/sandbox endpoint (preview)", async () => {
    const fetchMock = setupFetchMock({
      json: async () => ({
        createdAt: 1,
        timeout: 1800000,
        currentBranch: "main",
        mode: "vercel",
      }),
    });

    await createSandbox(
      "https://github.com/owner/repo",
      "session-abc",
      "jwt-token-here",
    );

    expect(fetchMock.calls).toHaveLength(1);
    expect(fetchMock.calls[0]?.url).toBe(
      "https://test-recoup-api.vercel.app/api/sandbox",
    );
  });

  test("sends Authorization: Bearer header when token is provided", async () => {
    const fetchMock = setupFetchMock({
      json: async () => ({
        createdAt: 1,
        timeout: 1,
        currentBranch: "main",
        mode: "vercel",
      }),
    });

    await createSandbox(
      "https://github.com/owner/repo",
      "session-abc",
      "the-privy-jwt",
    );

    const headers = new Headers(fetchMock.calls[0]?.init?.headers);
    expect(headers.get("authorization")).toBe("Bearer the-privy-jwt");
  });

  test("omits Authorization header when no token is provided", async () => {
    const fetchMock = setupFetchMock({
      json: async () => ({
        createdAt: 1,
        timeout: 1,
        currentBranch: "main",
        mode: "vercel",
      }),
    });

    await createSandbox("https://github.com/owner/repo", "session-abc", null);

    const headers = new Headers(fetchMock.calls[0]?.init?.headers);
    expect(headers.get("authorization")).toBeNull();
  });

  test("sends repoUrl and sessionId in the request body (matches api's schema)", async () => {
    const fetchMock = setupFetchMock({
      json: async () => ({
        createdAt: 1,
        timeout: 1,
        currentBranch: "main",
        mode: "vercel",
      }),
    });

    await createSandbox("https://github.com/owner/repo", "session-abc", "jwt");

    const body = JSON.parse(fetchMock.calls[0]?.init?.body as string);
    expect(body.repoUrl).toBe("https://github.com/owner/repo");
    expect(body.sessionId).toBe("session-abc");
  });

  test("returns response with type derived from mode", async () => {
    setupFetchMock({
      json: async () => ({
        createdAt: 12345,
        timeout: 1800000,
        currentBranch: "main",
        mode: "vercel",
      }),
    });

    const result = await createSandbox(
      "https://github.com/owner/repo",
      "session-abc",
      "jwt",
    );

    expect(result.type).toBe("vercel");
    expect(result.createdAt).toBe(12345);
    expect(result.timeout).toBe(1800000);
    expect(result.currentBranch).toBe("main");
  });
});
