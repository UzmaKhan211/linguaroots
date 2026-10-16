import { describe, expect, it } from "vitest";
import { speechRatioToScore } from "./speechScore";

describe("speech score", () => {
  it("passes at exactly 50% on the 0.77 cut-off", () => expect(speechRatioToScore(0.77)).toBe(50));
  it("gives 100% for very close takes", () => expect(speechRatioToScore(0.4)).toBe(100));
  it("keeps a typical wrong phrase (0.95) below 50%", () => expect(speechRatioToScore(0.95)).toBeLessThan(50));
});
