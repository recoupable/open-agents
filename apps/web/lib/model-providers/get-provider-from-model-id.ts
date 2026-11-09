export function getProviderFromModelId(modelId: string): string {
  const slashIndex = modelId.indexOf("/");
  if (slashIndex === -1) return modelId;
  return modelId.slice(0, slashIndex);
}
