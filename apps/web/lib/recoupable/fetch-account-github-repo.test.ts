import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { fetchAccountGithubRepo } from "./fetch-account-github-repo";

describe("fetchAccountGithubRepo", () => {
  let originalEnv: string | undefined;
  let fetchSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    originalEnv = process.env.RECOUPABLE_API_URL;
    process.env.RECOUPABLE_API_URL = "https://test-api.example.com";
    fetchSpy = spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.RECOUPABLE_API_URL;
    } else {
      process.env.RECOUPABLE_API_URL = originalEnv;
    }
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
      "https://test-api.example.com/api/sandboxes",
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

  it("returns null when RECOUPABLE_API_URL is not set", async () => {
    delete process.env.RECOUPABLE_API_URL;

    const result = await fetchAccountGithubRepo("test-access-token");

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
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
