import { describe, expect, test } from "bun:test";
import {
  ARTIST_WORKFLOW_MAX_STEPS,
  extractRecoupTitle,
  parseRecoupChecklistSteps,
} from "./parse-recoup-checklist";

describe("extractRecoupTitle", () => {
  test("returns first H1 text", () => {
    const md = `# Anatoly Lyadov

## Setup
- [ ] One
`;
    expect(extractRecoupTitle(md)).toBe("Anatoly Lyadov");
  });

  test("returns null when no H1", () => {
    expect(extractRecoupTitle("## No title\n")).toBeNull();
  });
});

describe("parseRecoupChecklistSteps", () => {
  test("parses checked and unchecked items in order", () => {
    const md = `
- [x] Create Artist Profile
* [X] Find Spotify Match  
- [ ] Research Artist Data
`;
    const steps = parseRecoupChecklistSteps(md);
    expect(steps).toEqual([
      { index: 1, label: "Create Artist Profile", done: true },
      { index: 2, label: "Find Spotify Match", done: true },
      { index: 3, label: "Research Artist Data", done: false },
    ]);
  });

  test("caps at ARTIST_WORKFLOW_MAX_STEPS", () => {
    const lines = Array.from(
      { length: ARTIST_WORKFLOW_MAX_STEPS + 4 },
      (_, i) => {
        const n = i + 1;
        return `- [ ] Step ${n}`;
      },
    ).join("\n");
    const steps = parseRecoupChecklistSteps(lines);
    expect(steps).toHaveLength(ARTIST_WORKFLOW_MAX_STEPS);
    expect(steps[ARTIST_WORKFLOW_MAX_STEPS - 1]?.label).toBe(
      `Step ${ARTIST_WORKFLOW_MAX_STEPS}`,
    );
  });

  test("ignores non-checkbox bullets", () => {
    const md = `
- plain bullet
- [ ] Only task
`;
    expect(parseRecoupChecklistSteps(md)).toEqual([
      { index: 1, label: "Only task", done: false },
    ]);
  });
});
