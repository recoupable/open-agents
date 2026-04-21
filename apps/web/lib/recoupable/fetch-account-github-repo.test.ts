import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { fetchAccountGithubRepo } from "./fetch-account-github-repo";

// In the non-production test environment, RECOUPABLE_API_BASE_URL resolves to
// the test-recoup-api URL below.
const EXPECTED_BASE_URL = "https://test-recoup-api.vercel.app";

describe("fetchAccountGithubRepo", () => {
  let fetchSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("returns github_repo when API returns one", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          github_repo: "https://github.com/artist/website",
          sandboxes: [],
        }),
        { status: 200 },
      ),
    );

    const result = await fetchAccountGithubRepo("test-access-token");

    expect(result).toBe("https://github.com/artist/website");
    expect(fetchSpy).toHaveBeenCalledWith(
      `${EXPECTED_BASE_URL}/api/sandboxes`,
      {
        method: "GET",
        headers: { Authorization: "Bearer test-access-token" },
      },
    );
  });

  it("returns null when github_repo is null in response", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ status: "success", github_repo: null, sandboxes: [] }),
        { status: 200 },
      ),
    );

    const result = await fetchAccountGithubRepo("test-access-token");

    expect(result).toBeNull();
  });

  it("returns null when response shape is invalid", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: "success", github_repo: 42 }), {
        status: 200,
      }),
    );

    const result = await fetchAccountGithubRepo("test-access-token");

    expect(result).toBeNull();
  });

  it("returns null when API returns error status", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: "error" }), { status: 401 }),
    );

    const result = await fetchAccountGithubRepo("test-access-token");

    expect(result).toBeNull();
  });

  it("returns null when accessToken is empty", async () => {
    const result = await fetchAccountGithubRepo("");

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null when fetch throws", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));

    const result = await fetchAccountGithubRepo("test-access-token");

    expect(result).toBeNull();
  });
});
