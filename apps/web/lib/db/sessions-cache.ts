import { cache } from "react";
import { getSessionById } from "./sessions";

export const getSessionByIdCached = cache(async (sessionId: string) =>
  getSessionById(sessionId),
);
