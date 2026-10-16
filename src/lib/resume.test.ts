import { describe, expect, it } from "vitest";
import { scenarios, turns } from "./content";
import { afterChoice, afterLine, resumeFrom, stepAt } from "./conversation";
import { pickResume } from "./progress";

describe("resume a conversation", () => {
  const s = scenarios[0]!;
  // Walk the first few lines, always taking the first reply.
  const ids: string[] = [];
  let step = stepAt(s.startTurnId, turns);
  while (ids.length < 3 && step.type !== "end") {
    const t = step.type === "line" ? step.turn : step.options[0]!;
    ids.push(t.id);
    step = t.speaker === "character" ? afterLine(t, turns) : afterChoice(t, turns);
  }

  it("continues from the same place", () => {
    const r = resumeFrom(ids, s.startTurnId, turns);
    expect(r?.history.map((t) => t.id)).toEqual(ids);
    expect(r?.step).toEqual(step);
  });

  it("starts fresh when the saved lines no longer fit the lesson", () => {
    expect(resumeFrom(["not-a-line"], s.startTurnId, turns)).toBeNull();
  });

  it("keeps whichever device got further", () => {
    const a = { history: ["x"], spoken: 0, skipped: 0 };
    const b = { history: ["x", "y"], spoken: 1, skipped: 0 };
    expect(pickResume(a, b)).toBe(b);
    expect(pickResume(null, a)).toBe(a);
  });
});
