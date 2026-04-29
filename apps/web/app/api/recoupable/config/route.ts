import { recoupApiBaseUrlFromVercelEnv } from "@/lib/recoupable/recoup-api-urls";

export async function GET() {
  return Response.json({
    recoupApiBaseUrl: recoupApiBaseUrlFromVercelEnv(process.env.VERCEL_ENV),
  });
}
