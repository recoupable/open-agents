export function getPrivyAppId(): string | undefined {
  return process.env.NEXT_PUBLIC_PRIVY_APP_ID || undefined;
}

export function getPrivyAppSecret(): string | undefined {
  return process.env.PRIVY_APP_SECRET || undefined;
}

export function getPrivyJwtVerificationKey(): string | undefined {
  const encoded = process.env.PRIVY_JWT_VERIFICATION_KEY;
  if (!encoded) return undefined;
  return Buffer.from(encoded, "base64").toString("utf8");
}

export function isPrivyConfigured(): boolean {
  return Boolean(getPrivyAppId());
}
