import { createPersonalSessionHandler } from "@/lib/sessions/create-personal-session-handler";

/**
 * `POST /api/sessions/personal` — onboarding fallback for users with no orgs.
 * See `createPersonalSessionHandler` for the full behavior contract.
 */
export async function POST(req: Request) {
  return createPersonalSessionHandler(req);
}
