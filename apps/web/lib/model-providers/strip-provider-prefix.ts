/** Prefixes in model display names that match the provider brand (stripped in compact UI). */
const providerLabelPrefixes: Record<string, string[]> = {
  anthropic: ["Claude"],
  google: ["Gemini"],
  xai: ["Grok"],
  mistral: ["Mistral"],
  deepseek: ["DeepSeek"],
  meta: ["Meta"],
};

/**
 * Strip the provider brand prefix from a model label for compact display.
 * e.g. "Claude Opus 4.6" → "Opus 4.6", "GPT-5.4" → "GPT-5.4"
 */
export function stripProviderPrefix(label: string, provider: string): string {
  const prefixes = providerLabelPrefixes[provider];
  if (!prefixes) return label;
  for (const prefix of prefixes) {
    if (label.startsWith(prefix + " ")) {
      return label.slice(prefix.length + 1);
    }
  }
  return label;
}
