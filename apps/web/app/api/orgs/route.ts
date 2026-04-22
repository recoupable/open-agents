import { extractBearerToken } from "@/lib/sandbox/extract-bearer-token";
import { fetchAccountOrgs } from "@/lib/recoupable/fetch-account-orgs";

export async function GET(req: Request) {
  const accessToken = extractBearerToken(req);
  if (!accessToken) {
    return Response.json({ error: "Missing access token" }, { status: 401 });
  }

  const organizations = await fetchAccountOrgs(accessToken);
  return Response.json({ organizations });
}
