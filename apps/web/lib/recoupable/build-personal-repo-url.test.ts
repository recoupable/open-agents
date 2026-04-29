import { describe, expect, test } from "bun:test";
import {
  buildPersonalRepoIdentifier,
  buildPersonalRepoUrl,
} from "./build-personal-repo-url";

describe("buildPersonalRepoUrl", () => {
  test("matches the documented format", () => {
    expect(
      buildPersonalRepoUrl({
        accountName: "Sweetman",
        accountId: "fb678396-a68f-4294-ae50-b8cacf9ce77b",
      }),
    ).toBe(
      "https://github.com/recoupable/sweetman-fb678396-a68f-4294-ae50-b8cacf9ce77b",
    );
  });

  test("kebab-cases multi-word names", () => {
    expect(
      buildPersonalRepoUrl({
        accountName: "Sidney Swift",
        accountId: "848cd58d-700f-4b38-ab4c-d9f526402e3c",
      }),
    ).toBe(
      "https://github.com/recoupable/sidney-swift-848cd58d-700f-4b38-ab4c-d9f526402e3c",
    );
  });

  test("normalizes special characters in names", () => {
    expect(
      buildPersonalRepoUrl({
        accountName: "User_With.Special+Chars",
        accountId: "00000000-0000-0000-0000-000000000001",
      }),
    ).toBe(
      "https://github.com/recoupable/user-with-special-chars-00000000-0000-0000-0000-000000000001",
    );
  });
});

describe("buildPersonalRepoIdentifier", () => {
  test("returns owner + repo separately", () => {
    expect(
      buildPersonalRepoIdentifier({
        accountName: "Sweetman",
        accountId: "fb678396-a68f-4294-ae50-b8cacf9ce77b",
      }),
    ).toEqual({
      owner: "recoupable",
      repo: "sweetman-fb678396-a68f-4294-ae50-b8cacf9ce77b",
    });
  });
});
