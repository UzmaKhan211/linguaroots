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
