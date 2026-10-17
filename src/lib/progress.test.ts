import { describe, it, expect } from "vitest";
import { mergeProgress } from "./progress";

describe("guest progress moving into an account", () => {
  it("keeps a warm-up done on either side", () => {
    expect(mergeProgress({ warmupDone: true, completed: 0 }, { warmupDone: false, completed: 0 }).warmupDone).toBe(true);
    expect(mergeProgress({ warmupDone: false, completed: 0 }, { warmupDone: true, completed: 0 }).warmupDone).toBe(true);
  });
  it("keeps the larger finished count", () => {
    expect(mergeProgress({ warmupDone: false, completed: 2 }, { warmupDone: false, completed: 5 }).completed).toBe(5);
    expect(mergeProgress({ warmupDone: false, completed: 3 }, undefined).completed).toBe(3);
  });
});

import { lessonUnlocked, scenarioStage } from "./progress";
import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("scenarioStage", () => {
  i2("Lesson 1 opens in any unit without previous progress", () => {
    e2(lessonUnlocked(1, false, false)).toBe(true);
  });
  i2("Lesson 2 needs completed words, not just an opened lesson", () => {
    e2(lessonUnlocked(2, false, false)).toBe(false);
    e2(lessonUnlocked(2, true, false)).toBe(true);
  });
  i2("Lesson 3 requires both preceding lessons", () => {
    e2(lessonUnlocked(3, false, true)).toBe(false);
    e2(lessonUnlocked(3, true, false)).toBe(false);
    e2(lessonUnlocked(3, true, true)).toBe(true);
  });
  i2("not started is 0%", () => e2(scenarioStage(false, 0).percent).toBe(0));
  i2("words done is 33%", () => e2(scenarioStage(true, 0).percent).toBe(33));
  i2("phrases done is 67%", () => e2(scenarioStage(true, 0, true).percent).toBe(67));
  i2("phrases lesson locked until words done", () => e2(lessonUnlocked(2, false, false)).toBe(false));
  i2("conversation locked until phrases done", () => e2(lessonUnlocked(3, true, false)).toBe(false));
  i2("conversation opens after phrases", () => e2(lessonUnlocked(3, true, true)).toBe(true));
  i2("finished is 100%", () => e2(scenarioStage(true, 2).percent).toBe(100));
});
