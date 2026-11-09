import { describe, expect, test } from "bun:test";
import { compareProviders } from "./model-providers/compare-providers";
import { getProviderDisplayName } from "./model-providers/get-provider-display-name";
import { getProviderFromModelId } from "./model-providers/get-provider-from-model-id";
import { stripProviderPrefix } from "./model-providers/strip-provider-prefix";

describe("model provider policy", () => {
  test("keeps pinned providers before alphabetical unpinned providers", () => {
    expect(
      ["zai", "openai", "google", "anthropic", "cohere"].sort(compareProviders),
    ).toEqual(["anthropic", "openai", "cohere", "google", "zai"]);
  });

  test("preserves unknown provider identities and labels", () => {
    expect(getProviderFromModelId("custom/model/version")).toBe("custom");
    expect(getProviderFromModelId("local-model")).toBe("local-model");
    expect(getProviderDisplayName("custom")).toBe("Custom");
    expect(stripProviderPrefix("Custom Model", "custom")).toBe("Custom Model");
  });

  test("shortens only a complete known brand prefix", () => {
    expect(stripProviderPrefix("Claude Opus 4.6", "anthropic")).toBe(
      "Opus 4.6",
    );
    expect(stripProviderPrefix("Claudeish", "anthropic")).toBe("Claudeish");
    expect(getProviderDisplayName("openai")).toBe("OpenAI");
  });
});
