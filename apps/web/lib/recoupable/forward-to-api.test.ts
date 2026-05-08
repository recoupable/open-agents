import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const cookieGetMock = mock(() => undefined as { value: string } | undefined);

mock.module("next/headers", () => ({
  cookies: async () => ({ get: cookieGetMock }),
}));

mock.module("@/lib/session/constants", () => ({
  SESSION_COOKIE_NAME: "privy-token",
}));

mock.module("@/lib/recoupable/api-base-url", () => ({
  RECOUPABLE_API_BASE_URL: "https://api.example.com",
}));

const fetchCalls: Array<{ url: string; init: RequestInit }> = [];
let fetchResponse: Response;
let fetchThrows: Error | null;

const originalFetch = globalThis.fetch;
beforeEach(() => {
  fetchCalls.length = 0;
  fetchThrows = null;
  fetchResponse = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (fetchThrows) throw fetchThrows;
    fetchCalls.push({ url: String(input), init: init ?? {} });
    return fetchResponse;
  }) as typeof fetch;
  cookieGetMock.mockReset();
});

async function run(method: string, body?: unknown): Promise<Response> {
  const { forwardToApi } = await import("./forward-to-api");
  const init: RequestInit = { method };
  if (body !== undefined) init.body = JSON.stringify(body);
  const req = new Request(
    "http://localhost/api/sandbox/status?sessionId=s1",
    init,
  );
  return forwardToApi(req, "/api/sandbox/status");
}

afterAll();

function afterAll() {
  globalThis.fetch = originalFetch;
}

describe("forwardToApi", () => {
  test("returns 401 when the privy-token cookie is absent", async () => {
    cookieGetMock.mockReturnValue(undefined);

    const res = await run("GET");

    expect(res.status).toBe(401);
    expect(fetchCalls).toHaveLength(0);
  });

  test("forwards GET to api with Authorization: Bearer + the original query string", async () => {
    cookieGetMock.mockReturnValue({ value: "tok-123" });

    const res = await run("GET");

    expect(res.status).toBe(200);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe(
      "https://api.example.com/api/sandbox/status?sessionId=s1",
    );
    const headers = fetchCalls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok-123");
  });

  test("forwards POST body and Content-Type", async () => {
    cookieGetMock.mockReturnValue({ value: "tok-123" });

    await run("POST", { repoUrl: "https://github.com/o/r" });

    expect(fetchCalls[0].init.method).toBe("POST");
    expect(fetchCalls[0].init.body).toBe(
      '{"repoUrl":"https://github.com/o/r"}',
    );
    const headers = fetchCalls[0].init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  test("returns 502 when the upstream fetch throws", async () => {
    cookieGetMock.mockReturnValue({ value: "tok-123" });
    fetchThrows = new Error("ECONNRESET");

    const res = await run("GET");

    expect(res.status).toBe(502);
  });

  test("propagates the upstream status code unchanged", async () => {
    cookieGetMock.mockReturnValue({ value: "tok-123" });
    fetchResponse = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });

    const res = await run("GET");

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "Forbidden" });
  });
});
