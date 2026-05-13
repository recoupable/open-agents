import type { ArtistWorkflowStepPayload } from "./api-types";

/** Aligns with the documented create-artist checklist length. */
export const ARTIST_WORKFLOW_MAX_STEPS = 8;

const CHECKBOX_LINE = /^\s*[-*]\s+\[([ xX])\]\s*(.+?)\s*$/;

/**
 * First markdown H1 heading text, if any.
 */
export function extractRecoupTitle(markdown: string): string | null {
  for (const line of markdown.split("\n")) {
    const m = /^\s*#\s+(.+?)\s*$/.exec(line);
    if (m?.[1]) {
      return m[1].trim();
    }
  }
  return null;
}

/**
 * Parse GitHub-style task list items in file order. Only the first
 * `ARTIST_WORKFLOW_MAX_STEPS` items are returned so the UI matches the
 * 8-step artist onboarding flow when checklists are longer.
 */
export function parseRecoupChecklistSteps(
  markdown: string,
): ArtistWorkflowStepPayload[] {
  const steps: ArtistWorkflowStepPayload[] = [];
  let index = 1;

  for (const line of markdown.split("\n")) {
    const m = CHECKBOX_LINE.exec(line);
    if (!m) continue;

    const checked = m[1].trim().toLowerCase() === "x";
    const rawLabel = m[2].trim();
    if (!rawLabel) continue;

    steps.push({
      index,
      label: rawLabel,
      done: checked,
    });
    index += 1;
    if (steps.length >= ARTIST_WORKFLOW_MAX_STEPS) {
      break;
    }
  }

  return steps;
}
