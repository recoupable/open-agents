const PRIORITY_PROVIDERS = ["anthropic", "openai"];

export function compareProviders(a: string, b: string): number {
  const aIdx = PRIORITY_PROVIDERS.indexOf(a);
  const bIdx = PRIORITY_PROVIDERS.indexOf(b);
  if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
  if (aIdx !== -1) return -1;
  if (bIdx !== -1) return 1;
  return a.localeCompare(b);
}
