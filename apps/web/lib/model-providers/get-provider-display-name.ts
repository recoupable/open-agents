const providerDisplayNames: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  xai: "xAI",
  groq: "Groq",
  mistral: "Mistral",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
  moonshot: "Moonshot",
  togetherai: "Together AI",
  cohere: "Cohere",
  fireworks: "Fireworks",
  meta: "Meta",
  zai: "ZAI",
};

export function getProviderDisplayName(provider: string): string {
  return (
    providerDisplayNames[provider] ??
    provider.charAt(0).toUpperCase() + provider.slice(1)
  );
}
