export function extractBearerToken(req: Request): string | undefined {
  return req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
}
