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

import { scenarioStage } from "./progress";
import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("scenarioStage", () => {
  i2("not started is 0%", () => e2(scenarioStage(false, 0).percent).toBe(0));
  i2("warm-up done is 50%", () => e2(scenarioStage(true, 0).percent).toBe(50));
  i2("finished is 100%", () => e2(scenarioStage(true, 2).percent).toBe(100));
});
