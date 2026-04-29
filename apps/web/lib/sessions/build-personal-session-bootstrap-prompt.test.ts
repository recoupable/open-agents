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

  test("one artist → asks the agent to sync it via recoup-api + artist-workspace", () => {
    const prompt = buildPersonalSessionBootstrapPrompt([artist("Beyoncé")]);
    expect(prompt).toContain("1 artist in my Recoup account: Beyoncé");
    expect(prompt).toContain("`recoup-api`");
    expect(prompt).toContain("`artist-workspace`");
  });

  test("multiple artists → pluralizes and lists all", () => {
    const prompt = buildPersonalSessionBootstrapPrompt([
      artist("Beyoncé"),
      artist("Drake"),
      artist("Taylor Swift"),
    ]);
    expect(prompt).toContain("3 artists in my Recoup account");
    expect(prompt).toContain("Beyoncé, Drake, Taylor Swift");
  });

  test("more than 8 artists → caps the inline list and notes overflow", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      artist(`Artist ${i + 1}`),
    );
    const prompt = buildPersonalSessionBootstrapPrompt(many);
    expect(prompt).toContain("12 artists");
    expect(prompt).toContain(
      "Artist 1, Artist 2, Artist 3, Artist 4, Artist 5, Artist 6, Artist 7, Artist 8 (+4 more)",
    );
    expect(prompt).not.toContain("Artist 9");
  });
});
