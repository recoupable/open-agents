import { describe, expect, test } from "bun:test";
import { buildPersonalSessionBootstrapPrompt } from "./build-personal-session-bootstrap-prompt";

const artist = (name: string) => ({
  account_id: `${name}-id`,
  name,
});

describe("buildPersonalSessionBootstrapPrompt", () => {
  test("zero artists → asks the agent to scaffold the first one", () => {
    const prompt = buildPersonalSessionBootstrapPrompt([]);
    expect(prompt).toContain("don't have any artists yet");
    expect(prompt).toContain("`artist-workspace`");
    expect(prompt).toContain("Ask me for the artist's name");
  });

  test("one artist → asks the agent to fetch via docs then sync", () => {
    const prompt = buildPersonalSessionBootstrapPrompt([artist("Beyoncé")]);
    expect(prompt).toContain("already have artists");
    expect(prompt).toContain("`recoup-api`");
    expect(prompt).toContain("GET /api/artists");
    expect(prompt).toContain("`artist-workspace`");
  });

  test("multiple artists → remains generic and points to paginated fetch", () => {
    const prompt = buildPersonalSessionBootstrapPrompt([
      artist("Beyoncé"),
      artist("Drake"),
      artist("Taylor Swift"),
    ]);
    expect(prompt).toContain("already have artists");
    expect(prompt).toContain("paginate as needed");
  });
});
