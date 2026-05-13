export interface ArtistWorkflowStepPayload {
  /** 1-based index within the surfaced checklist (max 8) */
  index: number;
  label: string;
  done: boolean;
}

export interface ArtistWorkflowArtistPayload {
  slug: string;
  /** Path relative to repo root, POSIX */
  recoupRelativePath: string;
  displayTitle: string | null;
  steps: ArtistWorkflowStepPayload[];
  completedCount: number;
  totalSteps: number;
}

export interface ArtistWorkflowSuccessPayload {
  artists: ArtistWorkflowArtistPayload[];
  scannedAt: string;
}

export function isArtistWorkflowSuccessPayload(
  data: unknown,
): data is ArtistWorkflowSuccessPayload {
  if (typeof data !== "object" || data === null) return false;
  const rec = data as Record<string, unknown>;
  return Array.isArray(rec.artists) && typeof rec.scannedAt === "string";
}
