import { describe, expect, test } from "bun:test";
import { extractOrgRepoName } from "./extract-org-repo-name";

describe("extractOrgRepoName", () => {
  test("extracts repo name from an org clone URL", () => {
    expect(
      extractOrgRepoName(
        "https://github.com/recoupable/org-rostrum-pacific-cebcc866-34c3-451c-8cd7-f63309acff0a",
      ),
    ).toBe("org-rostrum-pacific-cebcc866-34c3-451c-8cd7-f63309acff0a");
  });

  test("strips an optional .git suffix", () => {
    expect(
      extractOrgRepoName(
        "https://github.com/recoupable/org-myco-wtf-80263819-9dfd-4bbf-9371-60a6185122d6.git",
      ),
    ).toBe("org-myco-wtf-80263819-9dfd-4bbf-9371-60a6185122d6");
  });

  test("tolerates a trailing slash", () => {
    expect(
      extractOrgRepoName(
        "https://github.com/recoupable/org-myco-wtf-80263819-9dfd-4bbf-9371-60a6185122d6/",
      ),
    ).toBe("org-myco-wtf-80263819-9dfd-4bbf-9371-60a6185122d6");
  });

  test("returns null for URLs under other owners", () => {
    expect(
      extractOrgRepoName("https://github.com/someone-else/my-repo"),
    ).toBeNull();
  });

  test("returns null for non-https URLs", () => {
    expect(
      extractOrgRepoName("git@github.com:recoupable/org-x.git"),
    ).toBeNull();
  });

  test("returns null for malformed inputs", () => {
    expect(extractOrgRepoName("")).toBeNull();
    expect(extractOrgRepoName("not-a-url")).toBeNull();
  });
});
