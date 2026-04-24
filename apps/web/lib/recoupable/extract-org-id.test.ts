import { describe, expect, test } from "bun:test";
import { extractOrgId } from "./extract-org-id";

describe("extractOrgId", () => {
  test("extracts the UUID tail from a full clone URL", () => {
    expect(
      extractOrgId(
        "https://github.com/recoupable/org-rostrum-pacific-cebcc866-34c3-451c-8cd7-f63309acff0a",
      ),
    ).toBe("cebcc866-34c3-451c-8cd7-f63309acff0a");
  });

  test("strips a .git suffix before extracting", () => {
    expect(
      extractOrgId(
        "https://github.com/recoupable/org-myco-wtf-80263819-9dfd-4bbf-9371-60a6185122d6.git",
      ),
    ).toBe("80263819-9dfd-4bbf-9371-60a6185122d6");
  });

  test("tolerates a trailing slash on the URL", () => {
    expect(
      extractOrgId(
        "https://github.com/recoupable/org-myco-wtf-80263819-9dfd-4bbf-9371-60a6185122d6/",
      ),
    ).toBe("80263819-9dfd-4bbf-9371-60a6185122d6");
  });

  test("accepts an already-extracted repo name", () => {
    expect(
      extractOrgId("org-rostrum-pacific-cebcc866-34c3-451c-8cd7-f63309acff0a"),
    ).toBe("cebcc866-34c3-451c-8cd7-f63309acff0a");
  });

  test("lowercases an uppercase UUID", () => {
    expect(
      extractOrgId("org-myco-wtf-80263819-9DFD-4BBF-9371-60A6185122D6"),
    ).toBe("80263819-9dfd-4bbf-9371-60a6185122d6");
  });

  test("returns null for non-Recoupable clone URLs", () => {
    expect(
      extractOrgId(
        "https://github.com/someone-else/org-myco-wtf-80263819-9dfd-4bbf-9371-60a6185122d6",
      ),
    ).toBeNull();
  });

  test("returns null when the repo name has no UUID tail", () => {
    expect(
      extractOrgId("https://github.com/recoupable/some-other-repo"),
    ).toBeNull();
    expect(extractOrgId("org-slug-only")).toBeNull();
  });

  test("returns null for malformed inputs", () => {
    expect(extractOrgId("")).toBeNull();
    expect(extractOrgId("not-a-url")).toBeNull();
  });
});
