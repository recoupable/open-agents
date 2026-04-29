import { describe, expect, test } from "bun:test";
import { buildPersonalRepoIdentifier } from "./build-personal-repo-identifier";

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

  test("kebab-cases the slug portion of the repo name", () => {
    expect(
      buildPersonalRepoIdentifier({
        accountName: "Sidney Swift",
        accountId: "848cd58d-700f-4b38-ab4c-d9f526402e3c",
      }),
    ).toEqual({
      owner: "recoupable",
      repo: "sidney-swift-848cd58d-700f-4b38-ab4c-d9f526402e3c",
    });
  });
});
