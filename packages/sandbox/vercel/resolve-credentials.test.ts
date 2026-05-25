import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { resolveSandboxCredentials } from "./resolve-credentials";

const ENV_KEYS = [
  "VERCEL_TOKEN",
  "VERCEL_TEAM_ID",
  "VERCEL_PROJECT_ID",
] as const;

describe("resolveSandboxCredentials", () => {
  let original: Record<(typeof ENV_KEYS)[number], string | undefined>;

  beforeEach(() => {
    original = {
      VERCEL_TOKEN: process.env.VERCEL_TOKEN,
      VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
      VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
    };
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  test("returns undefined when no env vars are set", () => {
    expect(resolveSandboxCredentials()).toBeUndefined();
  });

  test("returns undefined when only some env vars are set (avoid SDK throw on partial credentials)", () => {
    process.env.VERCEL_TOKEN = "tok_abc";
    process.env.VERCEL_TEAM_ID = "team_xyz";
    expect(resolveSandboxCredentials()).toBeUndefined();
  });

  test("returns credentials when all three env vars are set", () => {
    process.env.VERCEL_TOKEN = "tok_abc";
    process.env.VERCEL_TEAM_ID = "team_xyz";
    process.env.VERCEL_PROJECT_ID = "prj_123";
    expect(resolveSandboxCredentials()).toEqual({
      token: "tok_abc",
      teamId: "team_xyz",
      projectId: "prj_123",
    });
  });

  test("treats empty strings as missing", () => {
    process.env.VERCEL_TOKEN = "";
    process.env.VERCEL_TEAM_ID = "team_xyz";
    process.env.VERCEL_PROJECT_ID = "prj_123";
    expect(resolveSandboxCredentials()).toBeUndefined();
  });
});
