import { describe, it, expect } from "vitest";
import { turns, getTurn, getWarmup, scenarios } from "./content";
import { stepAt, afterLine, afterChoice, buildQuiz } from "./conversation";

describe("conversation engine", () => {
  it("grandma call starts with her line", () => {
    const s = stepAt("gpc-01", turns);
    expect(s.type === "line" && s.turn.id).toBe("gpc-01");
  });

  it("grandpa visit starts with the learner's greeting as the only reply", () => {
    const s = stepAt("gft-01", turns);
    expect(s.type === "choose" && s.options.map((o) => o.id)).toEqual(["gft-01"]);
  });

  it("offers both replies after grandma asks who it is", () => {
    const s = afterLine(getTurn("gpc-03")!, turns);
    expect(s.type === "choose" && s.options.map((o) => o.id)).toEqual(["gpc-04a", "gpc-04b"]);
  });

  it("follows a character line straight to the next character line", () => {
    const s = afterLine(getTurn("gft-08")!, turns);
    expect(s.type === "line" && s.turn.id).toBe("gft-09");
  });

  it("both branches rejoin the same next line", () => {
    const a = afterChoice(getTurn("gpc-04a")!, turns);
    const b = afterChoice(getTurn("gpc-04b")!, turns);
    expect(a.type === "line" && a.turn.id).toBe("gpc-05");
    expect(b.type === "line" && b.turn.id).toBe("gpc-05");
  });

  it("ends after the final reply", () => {
    expect(afterChoice(getTurn("gpc-18")!, turns).type).toBe("end");
  });

  it("every scenario can be walked to the end", () => {
    for (const sc of scenarios) {
      let step = stepAt(sc.startTurnId, turns);
      let guard = 0;
      while (step.type !== "end" && guard++ < 100) {
        step = step.type === "line" ? afterLine(step.turn, turns) : afterChoice(step.options[0]!, turns);
      }
      expect(step.type).toBe("end");
    }
  });
});

describe("warm-up quiz", () => {
  it("uses only real items as other options, and never repeats the answer", () => {
    const items = getWarmup("grandma-phone-call");
    const real = new Set(items.map((i) => i.roman.trim()));
    for (const q of buildQuiz(items)) {
      expect(q.options).toHaveLength(3);
      expect(new Set(q.options).size).toBe(3);
      expect(q.options).toContain(q.item.roman.trim());
      for (const o of q.options) expect(real.has(o)).toBe(true);
    }
  });
});
